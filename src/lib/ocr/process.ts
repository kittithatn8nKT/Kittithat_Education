import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET_DOCUMENTS } from "@/lib/files/constants";
import { selectProvider } from "./index";
import { OcrError } from "./types";

const SKIPPABLE_MIME = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

interface VersionRow {
  id: string;
  institution_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  ocr_attempt: number;
  ocr_max_attempts: number;
  ocr_status: string;
}

interface ProcessResult {
  status: "completed" | "failed" | "skipped" | "abandoned";
  message?: string;
  characters?: number;
  pages?: number;
}

/**
 * Process OCR for a single document_version.
 *
 * Designed to be safe to call from anywhere on the server (Server Action,
 * route handler, cron). Uses the service-role client so it can write to
 * the DB regardless of who triggered it.
 *
 * Locking: claims the row by transitioning ocr_status from "pending" →
 * "processing" with an optimistic check. If another worker already
 * claimed it, this call returns "abandoned" without throwing.
 */
export async function processOcrForVersion(versionId: string): Promise<ProcessResult> {
  const supabase = createSupabaseServiceClient();
  const startTime = Date.now();

  // 1. Fetch the version
  const { data: version, error: fetchErr } = await supabase
    .from("document_versions")
    .select(
      "id, institution_id, file_path, file_name, mime_type, ocr_attempt, ocr_max_attempts, ocr_status"
    )
    .eq("id", versionId)
    .maybeSingle();

  if (fetchErr || !version) {
    return { status: "failed", message: "Version not found" };
  }
  const v = version as VersionRow;

  // 2. Skip non-OCR-able formats (DOCX, XLSX, etc.) — Phase 4 will add
  //    proper text extractors for these. Mark skipped so they don't get
  //    picked up by the queue forever.
  if (v.mime_type && SKIPPABLE_MIME.has(v.mime_type)) {
    await supabase
      .from("document_versions")
      .update({ ocr_status: "skipped", ocr_completed_at: new Date().toISOString() })
      .eq("id", v.id);
    await logAttempt(supabase, v, v.ocr_attempt, "skipped", Date.now() - startTime);
    return { status: "skipped", message: `MIME ${v.mime_type} is not OCR-able` };
  }

  // 3. Stop if we've already exhausted retries
  if (v.ocr_attempt >= v.ocr_max_attempts) {
    return {
      status: "abandoned",
      message: `Max attempts (${v.ocr_max_attempts}) reached`,
    };
  }

  // 4. Atomically claim — only succeeds if status is still pending or failed
  const { data: claimed, error: claimErr } = await supabase
    .from("document_versions")
    .update({ ocr_status: "processing", ocr_attempt: v.ocr_attempt + 1 })
    .eq("id", v.id)
    .in("ocr_status", ["pending", "failed"])
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return {
      status: "abandoned",
      message: "Job already claimed by another worker",
    };
  }

  const attemptNo = v.ocr_attempt + 1;

  // 5. Download the file
  const provider = selectProvider();
  let blob: Blob;
  try {
    const { data: file, error: dlErr } = await supabase.storage
      .from(STORAGE_BUCKET_DOCUMENTS)
      .download(v.file_path);
    if (dlErr || !file) {
      throw new OcrError(
        "file_download_failed",
        dlErr?.message ?? "Storage returned no blob",
        false
      );
    }
    blob = file;
  } catch (err) {
    return failJob(supabase, v, attemptNo, startTime, toErrorInfo(err));
  }

  // 6. Run OCR
  try {
    const result = await provider.extract(blob, v.mime_type ?? "");

    await supabase
      .from("document_versions")
      .update({
        ocr_status: "completed",
        ocr_text: result.text,
        ocr_error: null,
        ocr_completed_at: new Date().toISOString(),
      })
      .eq("id", v.id);

    await logAttempt(supabase, v, attemptNo, "completed", Date.now() - startTime, {
      pages_processed: result.pages,
      characters_extracted: result.text.length,
      confidence: result.confidence,
      languages: result.languages,
    });

    return {
      status: "completed",
      characters: result.text.length,
      pages: result.pages,
    };
  } catch (err) {
    return failJob(supabase, v, attemptNo, startTime, toErrorInfo(err));
  }
}

// ---------------------------------------------------------------------------

type ServiceClient = ReturnType<typeof createSupabaseServiceClient>;

interface ErrorInfo {
  code: string;
  message: string;
  retryable: boolean;
}

function toErrorInfo(err: unknown): ErrorInfo {
  if (err instanceof OcrError) {
    return { code: err.code, message: err.message, retryable: err.retryable };
  }
  if (err instanceof Error) {
    return { code: "unknown", message: err.message, retryable: true };
  }
  return { code: "unknown", message: String(err), retryable: false };
}

async function failJob(
  supabase: ServiceClient,
  v: VersionRow,
  attempt: number,
  startTime: number,
  info: ErrorInfo
): Promise<ProcessResult> {
  // If we've used all our attempts, mark as failed permanently.
  // Otherwise leave status='failed' so the retry cron picks it up next tick.
  const status = "failed";
  await supabase
    .from("document_versions")
    .update({
      ocr_status: status,
      ocr_error: `[${info.code}] ${info.message}`.slice(0, 1000),
    })
    .eq("id", v.id);

  await logAttempt(supabase, v, attempt, "failed", Date.now() - startTime, {
    error_code: info.code,
    error_message: info.message,
  });

  return { status: "failed", message: info.message };
}

async function logAttempt(
  supabase: ServiceClient,
  v: VersionRow,
  attempt: number,
  status: "completed" | "failed" | "skipped" | "processing",
  durationMs: number,
  extra?: {
    pages_processed?: number;
    characters_extracted?: number;
    confidence?: number | null;
    languages?: string[];
    error_code?: string;
    error_message?: string;
  }
) {
  await supabase.from("document_ocr_jobs").insert({
    institution_id: v.institution_id,
    document_version_id: v.id,
    attempt,
    status,
    provider: "google-vision",
    language_hints: extra?.languages ?? ["th", "en"],
    pages_processed: extra?.pages_processed ?? null,
    characters_extracted: extra?.characters_extracted ?? null,
    confidence: extra?.confidence ?? null,
    duration_ms: durationMs,
    error_code: extra?.error_code ?? null,
    error_message: extra?.error_message ?? null,
  });
}

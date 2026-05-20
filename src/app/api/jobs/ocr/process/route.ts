import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { processOcrForVersion } from "@/lib/ocr/process";

/**
 * Background worker endpoint. Picks up the next batch of OCR jobs and
 * processes them sequentially.
 *
 * Triggered by:
 *   1. Vercel Cron (per vercel.json) — once a day on Hobby, hourly on Pro
 *   2. Manual admin trigger (via the UI retry button)
 *
 * Auth: either Vercel's cron header OR a shared secret in `Authorization`.
 * Bypasses RLS via the service-role client — but operates only on rows
 * the DB knows about and never crosses tenants (each row carries its own
 * institution_id).
 */

const BATCH_SIZE = 5;

export async function GET(request: NextRequest) {
  // Vercel-Cron header is present when invoked by the cron scheduler.
  // Otherwise require the shared secret.
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return runBatch();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return runBatch();
}

async function runBatch() {
  const supabase = createSupabaseServiceClient();
  const startedAt = Date.now();

  // Pick a batch of rows that need OCR. Includes "pending" (never tried),
  // "failed" (queued for retry by the worker), and skips "skipped" / "completed".
  // ocr_attempt < ocr_max_attempts keeps us from retrying forever.
  const { data: jobs, error } = await supabase
    .from("document_versions")
    .select("id, ocr_status, ocr_attempt, ocr_max_attempts")
    .in("ocr_status", ["pending", "failed"])
    .lt("ocr_attempt", 3) // hard ceiling; mirrors the column default
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message, processed: 0 }, { status: 500 });
  }

  const results: Array<{
    version_id: string;
    status: string;
    message?: string;
  }> = [];

  for (const job of jobs ?? []) {
    const res = await processOcrForVersion(job.id);
    results.push({ version_id: job.id, ...res });
  }

  return NextResponse.json({
    processed: results.length,
    duration_ms: Date.now() - startedAt,
    results,
  });
}

function isAuthorized(request: NextRequest): boolean {
  // Vercel injects this header when invoking a cron route — auto-signed
  // from the deployment's CRON_SECRET if configured.
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (isVercelCron) return true;

  const expected = process.env.OCR_WORKER_SECRET;
  if (!expected) return false; // fail closed
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

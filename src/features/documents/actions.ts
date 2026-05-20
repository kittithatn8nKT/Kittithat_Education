"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildStoragePath, pathBelongsToTenant } from "@/lib/files/path";
import { classifyDocumentType, STORAGE_BUCKET_DOCUMENTS } from "@/lib/files/constants";
import { validateFile } from "@/lib/files/validation";
import type { UploadConfirmation, UploadTicket } from "@/lib/files/types";
import {
  confirmUploadSchema,
  getUploadUrlSchema,
  softDeleteDocumentSchema,
  type ConfirmUploadInput,
  type GetUploadUrlInput,
} from "./schemas";

/**
 * Mint a signed-upload URL the client can PUT a file to. Validates client
 * input and pre-allocates the storage path. We do NOT pre-insert a row in
 * `document_versions` — that happens on confirmUpload. Failed uploads
 * therefore never leave dangling DB rows; they just leave a log entry.
 */
export async function getUploadUrl(input: GetUploadUrlInput): Promise<UploadTicket> {
  const session = await requireSession("/documents");
  const parsed = getUploadUrlSchema.parse(input);

  const v = validateFile({
    name: parsed.filename,
    size: parsed.size,
    type: parsed.mime_type,
  });
  if (!v.ok) {
    await writeUploadLog(session, parsed, "failed", null, v.message);
    throw new Error(v.message);
  }

  const path = buildStoragePath(session.active.institution_id, parsed.filename);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_DOCUMENTS)
    .createSignedUploadUrl(path);

  if (error || !data) {
    const msg = error?.message ?? "Failed to create signed URL";
    await writeUploadLog(session, parsed, "failed", null, msg, path);
    throw new Error(msg);
  }

  await writeUploadLog(session, parsed, "started", null, undefined, data.path);

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
  };
}

/**
 * Record a completed upload. Inserts both the logical `documents` row and
 * its first `document_versions` row, then points the document at the
 * version. The DB does its own tenant + RLS checks; we additionally verify
 * the claimed storage path lives in the caller's tenant folder before
 * inserting (defence in depth).
 */
export async function confirmUpload(input: ConfirmUploadInput): Promise<UploadConfirmation> {
  const session = await requireSession("/documents");
  const parsed = confirmUploadSchema.parse(input);

  if (!pathBelongsToTenant(parsed.path, session.active.institution_id)) {
    await writeUploadLog(
      session,
      parsed,
      "failed",
      null,
      "Path does not belong to tenant",
      parsed.path
    );
    throw new Error("Invalid storage path");
  }

  const supabase = await createSupabaseServerClient();

  // 1. Insert the document (RLS enforces created_by = auth.uid()).
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      institution_id: session.active.institution_id,
      department_id: parsed.department_id ?? null,
      title: parsed.title || parsed.filename,
      document_type: classifyDocumentType(parsed.mime_type),
      created_by: session.user.id,
      status: "active",
    })
    .select("id")
    .single();

  if (docErr || !doc) {
    const msg = docErr?.message ?? "Failed to create document";
    await writeUploadLog(session, parsed, "failed", null, msg, parsed.path);
    throw new Error(msg);
  }

  // 2. Insert the first version. Trigger assign_document_version_number()
  //    sets version_number = 1 automatically.
  const { data: ver, error: verErr } = await supabase
    .from("document_versions")
    .insert({
      document_id: doc.id,
      institution_id: session.active.institution_id,
      file_path: parsed.path,
      file_name: parsed.filename,
      file_size_bytes: parsed.size,
      mime_type: parsed.mime_type,
      uploaded_by: session.user.id,
    })
    .select("id")
    .single();

  if (verErr || !ver) {
    const msg = verErr?.message ?? "Failed to create version";
    // Roll back the document insert to avoid an orphaned record.
    await supabase.from("documents").delete().eq("id", doc.id);
    await writeUploadLog(session, parsed, "failed", null, msg, parsed.path);
    throw new Error(msg);
  }

  // 3. Point the document at this first version.
  await supabase.from("documents").update({ current_version_id: ver.id }).eq("id", doc.id);

  await writeUploadLog(session, parsed, "completed", ver.id, undefined, parsed.path);

  revalidatePath("/documents");
  return { document_id: doc.id, version_id: ver.id };
}

/** Soft delete a document. Only creator or admin/dept-head can (RLS enforced). */
export async function softDeleteDocument(input: { document_id: string }) {
  // requireSession ensures auth + redirect; RLS does the actual permission check.
  await requireSession("/documents");
  const parsed = softDeleteDocumentSchema.parse(input);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", parsed.document_id);

  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

interface LogShape {
  filename: string;
  size: number;
  mime_type: string;
}

type SessionLike = Awaited<ReturnType<typeof requireSession>>;

async function writeUploadLog(
  session: SessionLike,
  input: LogShape,
  status: "started" | "completed" | "failed",
  documentVersionId: string | null,
  errorMessage?: string,
  storagePath?: string
) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("document_upload_logs").insert({
    institution_id: session.active.institution_id,
    user_id: session.user.id,
    document_version_id: documentVersionId,
    file_name: input.filename,
    file_size_bytes: input.size,
    mime_type: input.mime_type,
    storage_path: storagePath ?? null,
    status,
    error: errorMessage ?? null,
  });
}

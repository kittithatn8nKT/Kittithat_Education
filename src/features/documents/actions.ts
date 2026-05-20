"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildStoragePath, pathBelongsToTenant } from "@/lib/files/path";
import { classifyDocumentType, STORAGE_BUCKET_DOCUMENTS } from "@/lib/files/constants";
import { validateFile } from "@/lib/files/validation";
import type { UploadConfirmation, UploadTicket } from "@/lib/files/types";
import {
  confirmUploadSchema,
  createCategorySchema,
  deleteCategorySchema,
  documentIdsSchema,
  getUploadUrlSchema,
  setCategoryForDocumentsSchema,
  softDeleteDocumentSchema,
  updateCategorySchema,
  type ConfirmUploadInput,
  type CreateCategoryInput,
  type GetUploadUrlInput,
  type UpdateCategoryInput,
} from "./schemas";

// ===========================================================================
// Uploads
// ===========================================================================

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
  return { signedUrl: data.signedUrl, path: data.path, token: data.token };
}

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
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      institution_id: session.active.institution_id,
      department_id: parsed.department_id ?? null,
      category_id: parsed.category_id ?? null,
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
    await supabase.from("documents").delete().eq("id", doc.id);
    await writeUploadLog(session, parsed, "failed", null, msg, parsed.path);
    throw new Error(msg);
  }

  await supabase.from("documents").update({ current_version_id: ver.id }).eq("id", doc.id);

  await writeUploadLog(session, parsed, "completed", ver.id, undefined, parsed.path);
  revalidatePath("/documents");
  return { document_id: doc.id, version_id: ver.id };
}

// ===========================================================================
// Single-document op (kept; UI now uses bulk delete instead)
// ===========================================================================

export async function softDeleteDocument(input: { document_id: string }) {
  await requireSession("/documents");
  const parsed = softDeleteDocumentSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.document_id);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

// ===========================================================================
// Bulk operations
// ===========================================================================

/** Mark rows as archived — reversible via restoreDocuments. */
export async function archiveDocuments(input: { document_ids: string[] }) {
  await requireSession("/documents");
  const parsed = documentIdsSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ status: "archived" })
    .in("id", parsed.document_ids);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
  return { affected: parsed.document_ids.length };
}

/** Move rows back to active from archive. */
export async function restoreDocuments(input: { document_ids: string[] }) {
  await requireSession("/documents");
  const parsed = documentIdsSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ status: "active" })
    .in("id", parsed.document_ids);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
  return { affected: parsed.document_ids.length };
}

/** Soft-delete (sets deleted_at). RLS keeps cross-tenant writes impossible. */
export async function deleteDocuments(input: { document_ids: string[] }) {
  await requireSession("/documents");
  const parsed = documentIdsSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", parsed.document_ids);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
  return { affected: parsed.document_ids.length };
}

export async function setCategoryForDocuments(input: {
  document_ids: string[];
  category_id: string | null;
}) {
  await requireSession("/documents");
  const parsed = setCategoryForDocumentsSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ category_id: parsed.category_id })
    .in("id", parsed.document_ids);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

// ===========================================================================
// Category CRUD (admin / department_head)
// ===========================================================================

export async function createCategory(input: CreateCategoryInput) {
  const session = await requireRole(["institution_admin", "department_head"]);
  const parsed = createCategorySchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_categories")
    .insert({
      institution_id: session.active.institution_id,
      name: parsed.name,
      name_en: parsed.name_en ?? null,
      description: parsed.description ?? null,
      color: parsed.color ?? "slate",
      icon: parsed.icon ?? null,
      sort_order: parsed.sort_order ?? 0,
      created_by: session.user.id,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Create failed");
  revalidatePath("/documents");
  return { id: data.id };
}

export async function updateCategory(input: UpdateCategoryInput) {
  await requireRole(["institution_admin", "department_head"]);
  const parsed = updateCategorySchema.parse(input);
  const { id, ...patch } = parsed;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("document_categories").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

export async function deleteCategory(input: { id: string }) {
  await requireRole(["institution_admin"]);
  const parsed = deleteCategorySchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("document_categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.id);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

// ===========================================================================
// internals
// ===========================================================================

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

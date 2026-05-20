import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface DocumentListItem {
  id: string;
  title: string;
  document_type: string | null;
  status: string;
  created_at: string;
  created_by: string;
  current_version_id: string | null;
  version: {
    id: string;
    file_name: string;
    file_size_bytes: number | null;
    mime_type: string | null;
    file_path: string;
  } | null;
}

/**
 * Returns recent documents in the caller's tenant. RLS does the scoping —
 * we don't filter by institution_id explicitly here; the policies handle it.
 */
export async function listRecentDocuments(limit = 50): Promise<DocumentListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      `id, title, document_type, status, created_at, created_by, current_version_id,
       version:current_version_id (id, file_name, file_size_bytes, mime_type, file_path)`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listRecentDocuments failed:", error);
    return [];
  }
  // Supabase's PostgREST joins return arrays even for foreign-key singletons in
  // some configurations; coerce shape.
  return (data ?? []).map((row) => ({
    ...row,
    version: Array.isArray(row.version) ? (row.version[0] ?? null) : row.version,
  })) as DocumentListItem[];
}

/**
 * One-shot signed URL for downloading / previewing a file. The Storage RLS
 * policies still apply at sign-time — callers who aren't members of the
 * tenant will get null.
 */
export async function createDownloadUrl(
  filePath: string,
  expiresInSeconds = 60
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

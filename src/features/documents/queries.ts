import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentCategory, DocumentFilters, DocumentListResult, DocumentRow } from "./types";

const SORT_FIELD: Record<DocumentFilters["sort"], { column: string; ascending: boolean }> = {
  created_at_desc: { column: "created_at", ascending: false },
  created_at_asc: { column: "created_at", ascending: true },
  title_asc: { column: "title", ascending: true },
  title_desc: { column: "title", ascending: false },
  // Size sorts route through the versions side; we approximate by sorting
  // on the join below. Phase 3 will denormalise size onto documents.
  size_desc: { column: "created_at", ascending: false },
  size_asc: { column: "created_at", ascending: true },
};

/**
 * The main listing query. RLS scopes everything to the caller's tenant —
 * we deliberately don't add an institution_id filter; the policies do it.
 *
 * Returns the rows for the requested page AND the total row count, so the
 * UI can render pagination without a second round-trip.
 */
export async function listDocuments(filters: DocumentFilters): Promise<DocumentListResult> {
  const supabase = await createSupabaseServerClient();

  let q = supabase
    .from("documents")
    .select(
      `id, title, document_type, status, created_at, created_by,
       category_id, department_id, current_version_id,
       version:current_version_id (id, file_name, file_size_bytes, mime_type, file_path, ocr_status, ocr_attempt, ocr_max_attempts, ocr_error, ocr_completed_at),
       category:category_id (id, name, name_en, description, color, icon, sort_order)`,
      { count: "exact" }
    )
    .is("deleted_at", null);

  // Status tab
  if (filters.status === "active") {
    q = q.eq("status", "active");
  } else if (filters.status === "archived") {
    q = q.eq("status", "archived");
  }

  // Search by title (pg_trgm index helps; ILIKE handles Thai utf-8 fine)
  if (filters.q.trim()) {
    q = q.ilike("title", `%${filters.q.trim()}%`);
  }

  if (filters.category_id) q = q.eq("category_id", filters.category_id);
  if (filters.department_id) q = q.eq("department_id", filters.department_id);
  if (filters.type) q = q.eq("document_type", filters.type);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59`);

  const sort = SORT_FIELD[filters.sort] ?? SORT_FIELD.created_at_desc;
  q = q.order(sort.column, { ascending: sort.ascending });

  const offset = (filters.page - 1) * filters.pageSize;
  q = q.range(offset, offset + filters.pageSize - 1);

  const { data, count, error } = await q;
  if (error) {
    console.error("listDocuments failed:", error);
    return { rows: [], total: 0, pageCount: 0 };
  }

  const rows = (data ?? []).map(
    (row): DocumentRow => ({
      ...row,
      version: Array.isArray(row.version) ? (row.version[0] ?? null) : (row.version ?? null),
      category: Array.isArray(row.category) ? (row.category[0] ?? null) : (row.category ?? null),
    })
  ) as DocumentRow[];

  const total = count ?? 0;
  return {
    rows,
    total,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function listCategories(): Promise<DocumentCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_categories")
    .select("id, name, name_en, description, color, icon, sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.error("listCategories failed:", error);
    return [];
  }
  return (data ?? []) as DocumentCategory[];
}

export async function listDepartmentsForFilter(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("departments")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as { id: string; name: string }[];
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

// Legacy helper, kept for backwards compatibility with the simple
// listing on the dashboard home.
export interface DocumentListItem {
  id: string;
  title: string;
  document_type: string | null;
  status: string;
  created_at: string;
  created_by: string;
  current_version_id: string | null;
  version: DocumentVersion | null;
}
interface DocumentVersion {
  id: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  file_path: string;
}

export async function listRecentDocuments(limit = 50): Promise<DocumentListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      `id, title, document_type, status, created_at, created_by, current_version_id,
       version:current_version_id (id, file_name, file_size_bytes, mime_type, file_path)`
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listRecentDocuments failed:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...row,
    version: Array.isArray(row.version) ? (row.version[0] ?? null) : row.version,
  })) as DocumentListItem[];
}

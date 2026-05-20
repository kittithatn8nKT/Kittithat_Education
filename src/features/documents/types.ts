// Feature-shared types. The DB types live in src/types/database.ts; these are
// composite shapes specific to the document module.

export interface DocumentCategory {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  color: string;
  icon: string | null;
  sort_order: number;
}

export interface DocumentVersion {
  id: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  file_path: string;
}

export interface DocumentRow {
  id: string;
  title: string;
  document_type: string | null;
  status: "draft" | "active" | "archived";
  created_at: string;
  created_by: string;
  category_id: string | null;
  department_id: string | null;
  current_version_id: string | null;
  version: DocumentVersion | null;
  category: DocumentCategory | null;
}

export type DocumentSort =
  | "created_at_desc"
  | "created_at_asc"
  | "title_asc"
  | "title_desc"
  | "size_desc"
  | "size_asc";

export type DocumentView = "table" | "grid";

export type DocumentStatusTab = "active" | "archived";

/** All filter dimensions that can be encoded in the URL. */
export interface DocumentFilters {
  q: string;
  status: DocumentStatusTab;
  category_id: string | null;
  department_id: string | null;
  /** MIME family — pdf, word, spreadsheet, presentation, image, text, csv */
  type: string | null;
  from: string | null;
  to: string | null;
  sort: DocumentSort;
  view: DocumentView;
  page: number;
  pageSize: number;
}

export interface DocumentListResult {
  rows: DocumentRow[];
  total: number;
  /** Total pages, derived. */
  pageCount: number;
}

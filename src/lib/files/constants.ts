// Universal — safe to import from client or server.

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB — mirrors storage.buckets.file_size_limit
export const MAX_FILES_PER_UPLOAD = 10;

export const STORAGE_BUCKET_DOCUMENTS = "documents";

/**
 * MIME types we accept on the documents bucket. Mirrors the array on
 * storage.buckets.allowed_mime_types so the policy and the UI agree.
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "text/plain",
  "text/csv",
] as const;

export type AllowedDocumentMime = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

/** Pretty labels + the `accept` attribute for <input type="file">. */
export const MIME_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/tiff": "TIFF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/plain": "TXT",
  "text/csv": "CSV",
};

/** For <input type="file" accept="..."> */
export const ACCEPT_ATTRIBUTE = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tiff",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".pptx",
  ".txt",
  ".csv",
  ...ALLOWED_DOCUMENT_MIME_TYPES,
].join(",");

/** Coarse document-type classification for the `documents.document_type` column. */
export function classifyDocumentType(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("wordprocessingml") || mime === "application/msword") return "word";
  if (mime.includes("spreadsheetml") || mime === "application/vnd.ms-excel") return "spreadsheet";
  if (mime.includes("presentationml")) return "presentation";
  if (mime === "text/plain") return "text";
  if (mime === "text/csv") return "csv";
  return "other";
}

/** Human-friendly file size, e.g. 1.2 MB. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

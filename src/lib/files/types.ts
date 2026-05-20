// Shared types for the upload + document flow.

export interface UploadTicket {
  /** Pre-signed URL the client PUTs the file to (Supabase Storage). */
  signedUrl: string;
  /** Final storage path the server will record once the upload completes. */
  path: string;
  /** Token Supabase issued; we don't actually use it directly because the URL
   *  already embeds it, but it's surfaced for debugging. */
  token: string;
}

export interface UploadConfirmation {
  document_id: string;
  version_id: string;
}

export type UploadItemStatus = "queued" | "uploading" | "success" | "error" | "cancelled";

export interface UploadItem {
  /** Stable client id used as the React key. */
  id: string;
  file: File;
  /** 0–100 */
  progress: number;
  status: UploadItemStatus;
  error?: string;
  /** Filled in after the server confirms the row. */
  documentId?: string;
  /** Object URL for image previews; revoke on cleanup. */
  previewUrl?: string;
}

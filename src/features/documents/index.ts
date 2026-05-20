// Public surface for the documents feature.
//
// Client → server actions:
//     import { getUploadUrl, confirmUpload, softDeleteDocument } from "@/features/documents/actions";
// Server pages → queries:
//     import { listRecentDocuments, createDownloadUrl } from "@/features/documents/queries";

export {
  confirmUploadSchema,
  getUploadUrlSchema,
  softDeleteDocumentSchema,
  type ConfirmUploadInput,
  type GetUploadUrlInput,
} from "./schemas";

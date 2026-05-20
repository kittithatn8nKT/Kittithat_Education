// Public surface for the documents feature.
//
// Server (RSC, Server Actions):
//   import { listDocuments, listCategories, createDownloadUrl } from "@/features/documents/queries";
//   import { getUploadUrl, confirmUpload, archiveDocuments, ... } from "@/features/documents/actions";
//
// Client:
//   import { useFileUpload } from "@/features/documents/hooks/use-file-upload";
//   import { useDocumentFilters } from "@/features/documents/hooks/use-document-filters";
//   import { useDocumentSelection } from "@/features/documents/hooks/use-document-selection";

export {
  confirmUploadSchema,
  getUploadUrlSchema,
  softDeleteDocumentSchema,
  documentIdsSchema,
  setCategoryForDocumentsSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  type ConfirmUploadInput,
  type GetUploadUrlInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "./schemas";

export type {
  DocumentRow,
  DocumentVersion,
  DocumentCategory,
  DocumentFilters,
  DocumentSort,
  DocumentView,
  DocumentStatusTab,
  DocumentListResult,
} from "./types";

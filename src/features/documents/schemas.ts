import { z } from "zod";
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/files/constants";

// ---------- upload ----------

export const getUploadUrlSchema = z.object({
  filename: z.string().min(1).max(240),
  size: z.number().int().min(1).max(MAX_FILE_SIZE_BYTES),
  mime_type: z
    .string()
    .refine(
      (v) => (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(v),
      "MIME type not allowed"
    ),
});
export type GetUploadUrlInput = z.infer<typeof getUploadUrlSchema>;

export const confirmUploadSchema = z.object({
  path: z.string().min(1).max(1024),
  filename: z.string().min(1).max(240),
  size: z.number().int().min(1).max(MAX_FILE_SIZE_BYTES),
  mime_type: z.string(),
  title: z.string().max(240).optional(),
  category_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

// ---------- bulk ops ----------

export const documentIdsSchema = z.object({
  document_ids: z.array(z.string().uuid()).min(1).max(200),
});

export const softDeleteDocumentSchema = z.object({
  document_id: z.string().uuid(),
});

export const setCategoryForDocumentsSchema = z.object({
  document_ids: z.array(z.string().uuid()).min(1).max(200),
  category_id: z.string().uuid().nullable(),
});

// ---------- categories ----------

export const createCategorySchema = z.object({
  name: z.string().min(1).max(80),
  name_en: z.string().max(80).optional(),
  description: z.string().max(255).optional(),
  color: z.string().max(32).optional(),
  icon: z.string().max(40).optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().uuid(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const deleteCategorySchema = z.object({
  id: z.string().uuid(),
});

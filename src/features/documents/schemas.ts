import { z } from "zod";
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/files/constants";

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
  department_id: z.string().uuid().optional(),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export const softDeleteDocumentSchema = z.object({
  document_id: z.string().uuid(),
});

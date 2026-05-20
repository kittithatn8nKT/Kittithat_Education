import { z } from "zod";

export const createInstitutionSchema = z.object({
  name: z.string().min(1, "ต้องกรอกชื่อสถานศึกษา").max(255),
  name_en: z.string().max(255).optional().or(z.literal("")),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug ใช้ได้แค่ a-z, 0-9 และเครื่องหมายขีด"),
  type: z.enum(["primary", "secondary", "vocational", "university"]),
  thai_id: z
    .string()
    .regex(/^\d{10}$/, "รหัสสถานศึกษาต้องเป็นตัวเลข 10 หลัก")
    .optional()
    .or(z.literal("")),
  province: z.string().max(64).optional().or(z.literal("")),
});

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;

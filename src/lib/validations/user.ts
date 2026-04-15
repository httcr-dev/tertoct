import { z } from "zod";
import { stripHtml } from "./sanitize";

export const UserRoleSchema = z.enum(["admin", "coach", "student"]);

export const UserProfileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100).transform(stripHtml),
  email: z.string().email("E-mail inválido").transform(stripHtml),
  photoURL: z.string().url("URL inválida").optional().nullable(),
  role: UserRoleSchema,
  planId: z.string().optional().nullable().transform(val => val ? stripHtml(val) : val),
  active: z.boolean(),
  paymentDueDay: z.number().int().min(1).max(31).optional().nullable(),
  monthlyPaymentPaid: z.boolean().optional(),
  phone: z.string().min(10, "Telefone muito curto").max(20, "Telefone muito longo").optional().nullable().transform(val => val ? stripHtml(val) : val),
});

export const UserCreateSchema = UserProfileSchema.extend({});
export const UserUpdateSchema = UserProfileSchema.partial();

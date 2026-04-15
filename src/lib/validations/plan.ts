import { z } from "zod";
import { stripHtml, sanitizeHtml } from "./sanitize";

export const PlanSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100).transform(stripHtml),
  price: z.number().nonnegative("Preço deve ser positivo"),
  classesPerWeek: z.number().int().nonnegative("Número de aulas deve ser positivo"),
  description: z.string().max(500).optional().transform(val => val ? sanitizeHtml(val) : val),
  active: z.boolean(),
});

export const PlanCreateSchema = PlanSchema;
export const PlanUpdateSchema = PlanSchema.partial();

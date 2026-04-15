import { z } from "zod";

export const CheckInSchema = z.object({
  userId: z.string().min(1, "O ID do usuário é obrigatório"),
  planId: z.string().min(1, "O ID do plano é obrigatório"),
});

export const CheckInCreateSchema = CheckInSchema;

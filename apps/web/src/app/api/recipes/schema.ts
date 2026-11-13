// Cuerpo de una receta completa (spec 004, plan, sección 4): las reglas las aplica el dominio.
import { z } from "zod";

export const recipeBody = z.object({
  name: z.string(),
  preparation: z.string().nullable().optional(),
  halfPercent: z.number().optional(),
  ingredients: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.string(),
        presentationId: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
      }),
    )
    .max(200),
});

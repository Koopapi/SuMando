// Esquema de entrada de la lista de documentos (spec 008, RF-17).
import { z } from "zod";

export const docTypeBody = z.object({ name: z.string().optional(), required: z.boolean().optional(), validityMonths: z.number().int().nullable().optional() });

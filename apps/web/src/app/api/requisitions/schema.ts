// Esquemas de entrada de requisiciones (spec 007, plan sección 4). Los servicios validan el contenido.
import { z } from "zod";

export const REQUISITION_BODY_BYTES = 64 * 1024;
export const reqLine = z.object({ productId: z.string(), presentationId: z.string().nullish(), quantity: z.string(), supplierId: z.string().nullish() });

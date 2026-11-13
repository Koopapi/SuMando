// Esquemas de entrada del inventario (spec 005, plan sección 4). Los servicios validan el contenido.
import { z } from "zod";

/** Movimientos, traspasos y conteos aceptan hasta 64 KB (un conteo de 200 productos con lo visto). */
export const INVENTORY_BODY_BYTES = 64 * 1024;

export const lineBody = z.object({ productId: z.string(), presentationId: z.string().nullish(), quantity: z.string() });

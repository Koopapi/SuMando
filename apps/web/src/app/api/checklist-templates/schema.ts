// Cuerpo de una plantilla completa (spec 010): el servicio valida el contenido; aquí solo la forma.
import { z } from "zod";

const item = z.object({ id: z.string().nullish(), text: z.string(), kind: z.string(), isKey: z.boolean().optional() });
const section = z.object({ id: z.string().nullish(), name: z.string(), positionId: z.string().nullish(), items: z.array(item).max(200) });

export const templateBody = z.object({ name: z.string(), days: z.array(z.number()), branchIds: z.array(z.string()), sections: z.array(section).max(60) });

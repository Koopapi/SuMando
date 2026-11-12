// Paleta cerrada de colores de negocio (spec 002, RF-8 y RF-10). Se guarda la clave, no el tono: los tonos viven en
// `src/ui/tokens.css` y pueden ajustarse por contraste sin migrar datos.
export const BUSINESS_COLORS = ["violeta", "rojo", "naranja", "ambar", "verde", "turquesa", "azul", "rosa"] as const;

export type BusinessColor = (typeof BUSINESS_COLORS)[number];

export function isBusinessColor(value: unknown): value is BusinessColor {
  return typeof value === "string" && (BUSINESS_COLORS as readonly string[]).includes(value);
}

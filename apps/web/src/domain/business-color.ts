// Paleta cerrada de colores de negocio (spec 002, RF-8 y RF-10). Se guarda la clave, no el tono: los tonos viven en
// `src/ui/tokens.css` y pueden ajustarse por contraste sin migrar datos.
export const BUSINESS_COLORS = ["violeta", "rojo", "naranja", "ambar", "verde", "turquesa", "azul", "rosa"] as const;

export type BusinessColor = (typeof BUSINESS_COLORS)[number];

export function isBusinessColor(value: unknown): value is BusinessColor {
  return typeof value === "string" && (BUSINESS_COLORS as readonly string[]).includes(value);
}

/**
 * Color sugerido para un negocio nuevo (RF-8, RF-10): el primero de la paleta que no use otro negocio (activo o
 * archivado), o el primero de la paleta si todos están en uso.
 */
export function suggestColor(used: readonly string[]): BusinessColor {
  return BUSINESS_COLORS.find((c) => !used.includes(c)) ?? BUSINESS_COLORS[0];
}

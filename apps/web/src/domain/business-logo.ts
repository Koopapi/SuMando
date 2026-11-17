// Logo de cada negocio (spec 014, RF-25, RF-26 y RF-28). Reglas puras: qué se acepta y cómo cabe completo.

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
/** Lado mayor con el que la pantalla guarda el logo (lo convierte a PNG antes de subirlo). */
export const LOGO_MAX_SIDE = 512;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

/** RF-25: PNG, JPG o WEBP, como los elige quien sube el logo. */
export const acceptedLogoType = (mime: string) => ACCEPTED.includes(mime);

/** RF-26: el servidor guarda solo un PNG válido; devuelve sus medidas o nulo. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || sig.some((b, i) => bytes[i] !== b)) return null;
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

/** RF-28: el tamaño en que el logo cabe completo, sin deformarse, en un cuadro de `maxHeight` × `maxWidth`. */
export function logoBox(size: { width: number; height: number }, maxHeight: number, maxWidth: number): { width: number; height: number } {
  const scale = Math.min(maxHeight / size.height, maxWidth / size.width);
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}

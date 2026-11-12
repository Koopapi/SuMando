// Perilla de SuMando (identidad B «Al mando», recursos/sumando.pen). Una sola fuente para el logo en pantalla y los
// iconos que genera `scripts/make-icons.mjs`. Sin dependencias para que Node la importe directo.

export const BRAND_NAVY = "#22306B";
export const BRAND_AMBER = "#FFC54D";

export interface DialOptions {
  /** Fondo cuadrado de lado completo (icono maskable o de Apple) en vez del cuadrado redondeado. */
  square?: boolean;
  /** Escala de la perilla dentro del cuadro: 1 normal, menor para la zona segura del icono maskable. */
  scale?: number;
  /** Trazo grueso para tamaños de 44 px o menos. */
  small?: boolean;
}

const point = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 - r * Math.sin(a)).toFixed(2)}`;
};

/** Arco en sentido horario desde `from` grados (contrarreloj desde la derecha) durante `sweep` grados. */
const arc = (r: number, from: number, sweep: number) => `M ${point(r, from)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${point(r, from - sweep)}`;

export function dialSvg({ square = false, scale = 1, small = false }: DialOptions = {}): string {
  // Anillo como en Pencil: diámetro 64 con hueco del 72 %; en chico, diámetro 72 con hueco del 60 %.
  const radius = small ? 36 : 32;
  const ringInner = small ? 21.6 : 23;
  const r = (radius + ringInner) / 2;
  const width = radius - ringInner;
  const dot = small ? 12 : 10;
  const bg = square ? `<rect width="100" height="100" fill="${BRAND_NAVY}"/>` : `<rect width="100" height="100" rx="24" fill="${BRAND_NAVY}"/>`;
  const t = `translate(${50 - 50 * scale} ${50 - 50 * scale}) scale(${scale})`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
    bg,
    `<g transform="${t}" fill="none" stroke-width="${width}">`,
    `<path d="${arc(r, 225, 270)}" stroke="#FFFFFF" stroke-opacity="0.2"/>`,
    `<path d="${arc(r, 225, 215)}" stroke="${BRAND_AMBER}"/>`,
    `<circle cx="50" cy="50" r="${dot}" fill="#FFFFFF" stroke="none"/>`,
    `</g></svg>`,
  ].join("");
}

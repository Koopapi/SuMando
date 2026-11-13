// La perilla de SuMando como indicador: avance de una captura o de un asistente, o carga indeterminada.
const R = 15;
const START = 225;
const SWEEP = 270;

function point(deg: number) {
  const a = (deg * Math.PI) / 180;
  return `${(20 + R * Math.cos(a)).toFixed(2)} ${(20 - R * Math.sin(a)).toFixed(2)}`;
}

function arc(sweep: number) {
  if (sweep <= 0) return "";
  return `M ${point(START)} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${point(START - sweep)}`;
}

/** `value` de 0 a 1. `label` describe el avance para lectores de pantalla («2 de 4»). */
export function Dial({ value, label, size = 40, tone = "surface", spinning = false }: { value: number; label?: string; size?: number; tone?: "surface" | "band"; spinning?: boolean }) {
  const v = Math.min(1, Math.max(0, value));
  const track = tone === "band" ? "stroke-band-line" : "stroke-line";
  const level = tone === "band" ? "stroke-band-accent" : "stroke-primary";
  const dot = tone === "band" ? "fill-on-band" : "fill-ink";
  return (
    <svg
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={`shrink-0 ${spinning ? "animate-spin" : ""}`}
    >
      <path d={arc(SWEEP)} fill="none" strokeWidth={6} className={track} />
      <path d={arc(SWEEP * v)} fill="none" strokeWidth={6} className={level} />
      <circle cx="20" cy="20" r="5" className={dot} />
    </svg>
  );
}

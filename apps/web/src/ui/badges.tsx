import type { BusinessColor } from "@/domain/business-color";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-primary-soft text-primary",
};

/** Estado de un renglón («Activa», «Bajo», «Contraseña temporal»). El color acompaña al texto, nunca lo sustituye. */
export function StatusBadge({ tone, children }: { tone: Tone; children: string }) {
  return <span className={`inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-sm font-semibold whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

/**
 * Negocio activo (RF-12 a RF-14): punto del color del negocio junto a su nombre, nunca solo el color. En la banda
 * azul usa el tono claro del color; sobre superficie, el fondo suave con borde.
 */
export function BusinessBadge({ color, children, tone = "surface", className = "", testId }: { color: BusinessColor; children: string; tone?: "surface" | "band"; className?: string; testId?: string }) {
  const look =
    tone === "band"
      ? "bg-band-pill text-on-band text-xs tracking-wider uppercase rounded-md"
      : "bg-biz-soft text-ink border border-biz text-sm rounded-full";
  return (
    <span data-business-color={color} title={children} className={`biz-${color} inline-flex h-8 max-w-full min-w-0 items-center gap-2 px-3 font-semibold ${look} ${className}`}>
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${tone === "band" ? "bg-biz-band" : "bg-biz"}`} />
      <span className="truncate" data-testid={testId}>
        {children}
      </span>
    </span>
  );
}

/** Rótulo de sección en versalitas, como en un tablero de instrumentos. */
export function SectionLabel({ children, as: Tag = "h2", className = "" }: { children: string; as?: "h2" | "h3" | "p"; className?: string }) {
  return <Tag className={`text-xs font-semibold tracking-widest text-ink-muted uppercase ${className}`}>{children}</Tag>;
}

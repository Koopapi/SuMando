// Marca de un negocio (spec 014, RF-28 a RF-30): su logo completo dentro de un cuadro claro o, sin logo, su inicial
// sobre su color. Acompaña siempre al nombre del negocio, que va aparte.
import type { BusinessColor } from "@/domain/business-color";

const SIZE = {
  sm: { tile: "h-7 max-w-16", initial: "size-7 text-sm" },
  md: { tile: "h-9 max-w-24", initial: "size-9 text-base" },
  lg: { tile: "h-14 max-w-40", initial: "size-14 text-2xl" },
} as const;

export function BusinessMark({ name, color, logoUrl, size = "md" }: { name: string; color: BusinessColor; logoUrl?: string | null; size?: keyof typeof SIZE }) {
  if (logoUrl)
    return (
      <span className={`inline-flex shrink-0 items-center justify-center rounded-md bg-logo-tile p-1 ${SIZE[size].tile}`} data-business-logo>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API, sin optimizar */}
        <img src={logoUrl} alt="" className="h-full w-auto max-w-full object-contain" />
      </span>
    );
  return (
    <span aria-hidden className={`biz-${color} inline-flex shrink-0 items-center justify-center rounded-md bg-biz font-brand font-bold text-on-biz ${SIZE[size].initial}`} data-business-initial>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** Dirección del logo con su versión, para que el navegador no muestre uno anterior. */
export const logoUrl = (businessId: string, version: string | null | undefined) => (version ? `/api/businesses/${businessId}/logo?v=${version}` : null);

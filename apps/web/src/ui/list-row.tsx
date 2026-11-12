import Link from "next/link";
import { Icon, type IconName } from "./icons";

/** Fila de lista que lleva a otra pantalla (dirección Tablero: líneas finas en vez de tarjetas). */
export function ListRow({ href, icon, title, detail }: { href: string; icon: IconName; title: string; detail?: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3.5 border-b border-line py-2 hover:bg-primary-soft lg:px-2">
      <Icon name={icon} size={22} className="text-primary" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg font-semibold">{title}</span>
        {detail ? <span className="text-sm text-ink-muted">{detail}</span> : null}
      </span>
      <Icon name="chevronRight" className="text-ink-muted" />
    </Link>
  );
}

/** Bloque del negocio con la franja de su color a la izquierda del nombre (RF-13, RF-14). */
export function BusinessBlock({ color, name, detail, as: Tag = "p", testId }: { color: string; name: string; detail?: string; as?: "p" | "h2"; testId?: string }) {
  return (
    <div className={`biz-${color} flex min-w-0 items-center gap-3.5`} data-business-color={color}>
      <span aria-hidden className="h-12 w-1 shrink-0 rounded-full bg-biz" />
      <span className="flex min-w-0 flex-col">
        <Tag className="truncate font-brand text-2xl font-bold tracking-tight" data-testid={testId}>
          {name}
        </Tag>
        {detail ? <span className="truncate text-ink-muted">{detail}</span> : null}
      </span>
    </div>
  );
}

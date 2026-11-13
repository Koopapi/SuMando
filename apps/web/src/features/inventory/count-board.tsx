// Spec 005 RF-42, RF-54: áreas de la sucursal con su almacén, su lista y su último conteo, y lo que no tiene área.
import Link from "next/link";
import { es } from "@/i18n";
import type { CountBoardView } from "@/server/services/inventory/counts";
import { LinkButton, ListRow, PageHeader, SectionLabel, formatDateTime } from "@/ui";

const t = es.inventory;

export function CountBoard({ board }: { board: CountBoardView }) {
  const missing = board.withoutArea.filter((w) => w.products.length > 0);
  return (
    <>
      <PageHeader
        title={t.countTitle}
        subtitle={t.countIntro}
        action={
          <LinkButton href="/inventario/importar" variant="secondary" icon="upload">
            {t.importer.link}
          </LinkButton>
        }
      />
      <section aria-label={t.areas} className="flex flex-col gap-1">
        <SectionLabel>{t.areas}</SectionLabel>
        {board.areas.length === 0 ? <p className="text-sm text-ink-muted">{t.noAreas}</p> : null}
        <ul className="flex flex-col">
          {board.areas.map((a) => (
            <li key={a.id} className="flex flex-col border-b border-line lg:flex-row lg:items-center lg:gap-4">
              <div className="min-w-0 flex-1 [&>a]:border-b-0">
                <ListRow
                  href={a.warehouse ? `/inventario/conteo/${a.id}` : `/almacenes/areas/${a.id}`}
                  icon="clipboard"
                  title={a.name}
                  detail={a.warehouse ? t.areaDetail(a.warehouse.name, a.products, a.lastCount ? t.lastCount(formatDateTime(new Date(a.lastCount.at)), a.lastCount.author) : t.neverCounted) : t.areaNoList}
                />
              </div>
              <Link href={`/almacenes/areas/${a.id}`} className="mb-2 inline-flex min-h-11 items-center pl-12 text-sm font-semibold text-primary lg:mb-0 lg:pl-0">
                {t.editList(a.name)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label={t.withoutArea} className="flex flex-col gap-2">
        <SectionLabel>{t.withoutArea}</SectionLabel>
        <p className="text-sm text-ink-muted">{missing.length ? t.withoutAreaHint : t.allInAreas}</p>
        {missing.map((w) => (
          <details key={w.warehouseId} className="border-b border-line py-2" data-testid="without-area">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t.withoutAreaIn(w.warehouseName, w.products.length)}</summary>
            <p className="pb-2 text-sm text-ink-muted">{w.products.join(", ")}</p>
          </details>
        ))}
      </section>
    </>
  );
}

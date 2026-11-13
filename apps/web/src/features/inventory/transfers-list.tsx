// Spec 005 RF-28: traspasos por recibir, enviados en camino y recientes de los almacenes visibles.
import { es } from "@/i18n";
import type { TransferView } from "@/server/services/inventory/views";
import { LinkButton, ListRow, PageHeader, SectionLabel, formatDateTime } from "@/ui";

const t = es.inventory;

function Section({ title, empty, items }: { title: string; empty: string; items: TransferView[] }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      <SectionLabel>{title}</SectionLabel>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <div className="flex flex-col">
          {items.map((x) => (
            <ListRow
              key={x.id}
              href={`/inventario/traspasos/${x.id}`}
              icon="swap"
              title={t.transferLine(x.crossBusiness ? `${x.from.business} · ${x.from.warehouse}` : x.from.warehouse, x.crossBusiness ? `${x.to.business} · ${x.to.warehouse}` : x.to.warehouse)}
              detail={t.transferDetailLine(x.hasDifference ? `${t.statuses[x.status]} · ${t.withDifference}` : t.statuses[x.status], formatDateTime(new Date(x.sentAt)), x.lines.length)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function TransfersList({ incoming, outgoing, recent }: { incoming: TransferView[]; outgoing: TransferView[]; recent: TransferView[] }) {
  return (
    <>
      <PageHeader
        title={t.transfersTitle}
        subtitle={t.transfersIntro}
        figure={String(incoming.length)}
        figureLabel={t.incoming.toLowerCase()}
        action={
          <LinkButton href="/inventario/traspaso" icon="swap">
            {t.transfer}
          </LinkButton>
        }
      />
      <Section title={t.incoming} empty={t.noIncoming} items={incoming} />
      <Section title={t.outgoing} empty={t.noOutgoing} items={outgoing} />
      <Section title={t.recent} empty={t.noRecent} items={recent} />
    </>
  );
}

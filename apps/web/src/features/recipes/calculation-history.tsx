"use client";

// Spec 004 RF-29, RF-30: cálculos guardados en la sucursal, del más reciente al más antiguo.
import Link from "next/link";
import { es } from "@/i18n";
import type { CalculationSummaryView } from "@/server/services/recipes/views";
import { DataTable, EmptyState, LinkButton, PageHeader, formatDateTime, type Column } from "@/ui";

const t = es.recipes.history;

export function CalculationHistory({ calculations }: { calculations: CalculationSummaryView[] }) {
  const when = (c: CalculationSummaryView) => formatDateTime(new Date(c.createdAt));
  const columns: Column<CalculationSummaryView>[] = [
    {
      key: "date",
      header: t.date,
      phone: "title",
      cell: (c) => (
        <Link href={`/insumos/historial/${c.id}`} aria-label={t.openFor(when(c))} className="font-semibold text-primary hover:underline">
          {when(c)}
        </Link>
      ),
    },
    { key: "author", header: t.author, phone: "primary", cell: (c) => c.authorName },
    { key: "dishes", header: t.dishes, phone: "primary", cell: (c) => String(c.dishes), align: "end" },
    { key: "pieces", header: t.pieces, phone: "primary", cell: (c) => c.pieces.toLocaleString("es-MX"), align: "end" },
    { key: "halves", header: t.halves, phone: "primary", cell: (c) => c.halves.toLocaleString("es-MX"), align: "end" },
  ];
  return (
    <>
      <PageHeader title={t.title} subtitle={t.intro} figure={String(calculations.length)} figureLabel={t.figureLabel} />
      <span className="self-start">
        <LinkButton href="/insumos" variant="ghost" icon="arrowLeft">
          {es.recipes.supplies.title}
        </LinkButton>
      </span>
      {calculations.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        <DataTable caption={t.caption} rows={calculations} columns={columns} rowKey={(c) => c.id} rowName={when} searchFields={(c) => [c.authorName]} searchLabel={t.search} />
      )}
    </>
  );
}

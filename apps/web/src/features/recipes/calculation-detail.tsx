// Spec 004 RF-31 a RF-33: un cálculo tal como se guardó (no se edita) y «Usar como base» para empezar otro.
import { es } from "@/i18n";
import type { CalculationView } from "@/server/services/recipes/views";
import { LinkButton, PageHeader, SectionLabel, formatDateTime } from "@/ui";
import { SupplyLines } from "./supply-lines";

const t = es.recipes.history;

export function CalculationDetail({ calculation }: { calculation: CalculationView }) {
  const when = formatDateTime(new Date(calculation.createdAt));
  return (
    <>
      <PageHeader
        title={t.detailTitle(when)}
        subtitle={t.by(calculation.authorName)}
        action={
          <LinkButton href={`/insumos?base=${calculation.id}`} icon="calculator">
            {t.useAsBase}
          </LinkButton>
        }
      />
      <span className="self-start">
        <LinkButton href="/insumos/historial" variant="ghost" icon="arrowLeft">
          {t.back}
        </LinkButton>
      </span>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section aria-label={t.items} className="flex flex-col gap-2">
          <SectionLabel as="h2">{t.items}</SectionLabel>
          <ul className="flex flex-col" data-testid="calculation-items">
            {calculation.items.map((i) => (
              <li key={i.recipeId} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 border-b border-line py-2">
                <span className="font-semibold">{i.recipeName}</span>
                <span className="text-ink-muted">
                  {`${t.pieces}: ${i.full.toLocaleString("es-MX")} · ${t.halves}: ${i.half.toLocaleString("es-MX")} · ${t.halfPercent}: ${i.halfPercent}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label={t.lines} className="flex flex-col gap-2">
          <SectionLabel as="h2">{t.lines}</SectionLabel>
          <SupplyLines lines={calculation.lines} label={t.linesCaption} />
        </section>
      </div>
    </>
  );
}

"use client";

// Spec 004 RF-14, RF-54: recetas del negocio con búsqueda, filtros de activas y archivadas, alta e importación.
import Link from "next/link";
import { es } from "@/i18n";
import type { RecipeSummary } from "@/server/services/recipes/views";
import { DataTable, EmptyState, LinkButton, PageHeader, StatusBadge, type Column, type Filter } from "@/ui";

const t = es.recipes;

export function RecipesManager({ recipes }: { recipes: RecipeSummary[] }) {
  const active = recipes.filter((r) => !r.archived);
  const columns: Column<RecipeSummary>[] = [
    {
      key: "name",
      header: t.name,
      phone: "title",
      cell: (r) => (
        <Link href={`/recetas/${r.id}`} className="font-semibold text-primary hover:underline">
          {r.name}
        </Link>
      ),
    },
    {
      key: "status",
      header: t.status,
      phone: "badge",
      cell: (r) =>
        r.archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : r.hasArchivedIngredient ? <StatusBadge tone="danger">{t.archivedIngredientBadge}</StatusBadge> : null,
    },
    { key: "ingredients", header: t.ingredientsCount, phone: "primary", cell: (r) => t.ingredientsValue(r.ingredientCount) },
    { key: "half", header: t.half, phone: "primary", cell: (r) => t.halfCell(r.halfPercent) },
  ];
  const filters: Filter<RecipeSummary>[] = [
    { id: "active", label: t.filterActive, test: (r) => !r.archived },
    { id: "archived", label: t.filterArchived, test: (r) => r.archived },
  ];
  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.intro}
        figure={String(active.length)}
        figureLabel={t.figureLabel}
        action={
          <span className="flex flex-wrap gap-2">
            <LinkButton href="/recetas/nueva" icon="plus">
              {t.create}
            </LinkButton>
            <LinkButton href="/recetas/importar" variant="secondary" icon="upload">
              {t.import}
            </LinkButton>
          </span>
        }
      />
      {recipes.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        <DataTable caption={t.caption} rows={recipes} columns={columns} rowKey={(r) => r.id} rowName={(r) => r.name} searchFields={(r) => [r.name]} searchLabel={t.search} filters={filters} initialFilters={["active"]} />
      )}
    </>
  );
}

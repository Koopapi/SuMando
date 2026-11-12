"use client";

// Spec 004 RF-14, RF-15, RF-51, RF-52: una receta con sus cantidades en unidad base y en la presentación de conteo;
// se edita en la misma pantalla y se archiva o reactiva.
import { useState } from "react";
import { es } from "@/i18n";
import type { EditorProduct } from "@/server/services/recipes/recipes";
import type { RecipeDetail } from "@/server/services/recipes/views";
import { Alert, Button, LinkButton, PageHeader, SectionLabel, StatusBadge } from "@/ui";
import { unitShort } from "../catalog/labels";
import { useAction } from "../catalog/use-action";
import { RecipeEditor } from "./recipe-editor";

const t = es.recipes;

export function RecipeView({ recipe, products }: { recipe: RecipeDetail; products: EditorProduct[] }) {
  const { run, error } = useAction();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <PageHeader
        title={recipe.name}
        subtitle={`${t.half}: ${t.halfValue(recipe.halfPercent)}`}
        action={
          editing ? undefined : recipe.archived ? (
            <Button onAction={() => run(`/api/recipes/${recipe.id}/reactivate`)}>{t.reactivate}</Button>
          ) : (
            <span className="flex flex-wrap gap-2">
              <Button onClick={() => setEditing(true)} aria-label={t.actionFor(t.edit, recipe.name)}>
                {t.edit}
              </Button>
              <Button variant="secondary" onAction={() => run(`/api/recipes/${recipe.id}/archive`)} aria-label={t.actionFor(t.archive, recipe.name)}>
                {t.archive}
              </Button>
            </span>
          )
        }
      />
      <span className="self-start">
        <LinkButton href="/recetas" variant="ghost" icon="arrowLeft">
          {t.back}
        </LinkButton>
      </span>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {recipe.archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : null}
      {editing ? (
        <RecipeEditor recipe={recipe} products={products} onCancel={() => setEditing(false)} />
      ) : (
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <section aria-label={t.ingredients} className="flex flex-col gap-2">
            <SectionLabel as="h2">{t.ingredients}</SectionLabel>
            <ul className="flex flex-col" data-testid="ingredients">
              {recipe.ingredients.map((i) => (
                <li key={i.productId} className="flex min-h-13 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line py-2">
                  <span className="flex flex-col">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {i.productName}
                      {i.archived ? <StatusBadge tone="danger">{es.catalog.archivedBadge}</StatusBadge> : null}
                    </span>
                    {i.note ? <span className="text-sm text-ink-muted">{i.note}</span> : null}
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-brand font-bold">{t.baseQuantity(i.quantity, unitShort(i.baseUnit))}</span>
                    {i.count ? <span className="text-sm text-ink-muted">{t.countQuantity(i.count.quantity, i.count.name)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label={t.preparation} className="flex flex-col gap-2">
            <SectionLabel as="h2">{t.preparation}</SectionLabel>
            {recipe.preparation ? <p className="whitespace-pre-line">{recipe.preparation}</p> : <p className="text-ink-muted">{t.noPreparation}</p>}
          </section>
        </div>
      )}
    </>
  );
}

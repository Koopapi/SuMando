"use client";

// Spec 004 RF-40 a RF-48: subir un recetario de Excel, revisar cada platillo y confirmar. El archivo se manda dos
// veces (revisión y confirmación) porque el servidor no guarda nada entre pasos (plan, sección 5).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { ImportProblem } from "@/domain/recipes/import";
import type { ImportDishView } from "@/server/services/recipes/import";
import { Alert, Button, FileField, LinkButton, SectionLabel, StatusBadge } from "@/ui";
import { unitShort } from "../catalog/labels";

const t = es.recipes.importer;
const TONE = { ready: "success", problems: "danger", exists: "warning", duplicate: "warning" } as const;

function problemText(p: ImportProblem): string {
  switch (p.code) {
    case "missing_product":
    case "repeated_ingredient":
    case "note_too_long":
      return t.problem[p.code]({ ingredient: p.ingredient });
    case "unknown_unit":
      return t.problem.unknown_unit(p);
    case "invalid_quantity":
      return t.problem.invalid_quantity(p);
    case "unit_mismatch":
      return t.problem.unit_mismatch({ ingredient: p.ingredient, sheetUnit: unitShort(p.sheetUnit), productUnit: unitShort(p.productUnit) });
    default:
      return t.problem[p.code];
  }
}

async function send(file: File, confirm: boolean) {
  const form = new FormData();
  form.set("file", file);
  if (confirm) form.set("confirm", "1");
  try {
    const res = await fetch("/api/recipes/import", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    return res.ok ? { ok: true as const, data } : { ok: false as const, message: (data?.error?.message as string) ?? es.common.unknownError };
  } catch {
    return { ok: false as const, message: es.common.unknownError };
  }
}

export function RecipeImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dishes, setDishes] = useState<ImportDishView[] | null>(null);
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const ready = dishes?.filter((d) => d.status === "ready").length ?? 0;

  async function review() {
    if (!file) return;
    setError(null);
    setDone(null);
    const r = await send(file, false);
    if (r.ok) setDishes(r.data.dishes);
    else {
      setDishes(null);
      setError(r.message);
    }
  }

  async function confirm() {
    if (!file) return;
    setError(null);
    const r = await send(file, true);
    if (!r.ok) return setError(r.message);
    setDone(r.data);
    setDishes(null);
    setFile(null);
    setInputKey((k) => k + 1);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink-muted">{t.intro}</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? (
        <Alert tone="success">{t.done(done.imported, done.skipped)}</Alert>
      ) : null}
      <div className="flex flex-col gap-3 lg:max-w-xl">
        <FileField
          key={inputKey}
          label={t.file}
          hint={t.fileHint}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setDishes(null);
            setDone(null);
          }}
        />
        <span className="self-start">
          <Button variant="secondary" disabled={!file} onAction={review}>
            {t.review}
          </Button>
        </span>
      </div>
      {dishes ? (
        <section aria-label={t.caption} className="flex flex-col gap-3">
          <SectionLabel as="h2">{t.caption}</SectionLabel>
          <p className="font-semibold" data-testid="import-summary">
            {t.summary(ready, dishes.length - ready)}
          </p>
          <ul className="flex flex-col">
            {dishes.map((d, i) => (
              <li key={`${d.sheet}-${i}`} data-dish={d.name} className="flex flex-col gap-1 border-b border-line py-3">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{d.name || t.unnamed}</span>
                  <StatusBadge tone={TONE[d.status]}>{t[d.status]}</StatusBadge>
                  <span className="text-sm text-ink-muted">{t.sheet(d.sheet)}</span>
                </span>
                {d.status === "exists" ? <p className="text-sm text-ink-muted">{t.existsDetail}</p> : null}
                {d.status === "duplicate" ? <p className="text-sm text-ink-muted">{t.duplicateDetail}</p> : null}
                {d.problems.length ? (
                  <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-danger">
                    {d.problems.map((p, j) => (
                      <li key={j}>{problemText(p)}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          {ready ? (
            <span className="self-start">
              <Button onAction={confirm}>{t.confirm(ready)}</Button>
            </span>
          ) : (
            <Alert tone="warning">{t.nothingReady}</Alert>
          )}
        </section>
      ) : null}
      {done ? (
        <span className="self-start">
          <LinkButton href="/recetas" variant="secondary">
            {es.recipes.back}
          </LinkButton>
        </span>
      ) : null}
    </div>
  );
}

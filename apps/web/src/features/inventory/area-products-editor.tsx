"use client";

// Spec 005 RF-39 a RF-41: almacén donde se cuenta el área y su lista de productos en orden de recorrido.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { AreaSetupView } from "@/server/services/inventory/counts";
import { Alert, Button, Icon, PageHeader, SectionLabel, SelectField, useToast } from "@/ui";
import { api } from "../api";

const t = es.inventory;

export function AreaProductsEditor({ setup }: { setup: AreaSetupView }) {
  const router = useRouter();
  const toast = useToast();
  const [warehouseId, setWarehouseId] = useState(setup.area.warehouseId ?? "");
  const [ids, setIds] = useState<string[]>(setup.productIds);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const byId = new Map(setup.products.map((p) => [p.id, p]));
  const taken = setup.taken[warehouseId] ?? {};
  const available = setup.products.filter((p) => !ids.includes(p.id));
  const move = (i: number, d: -1 | 1) =>
    setIds((list) => {
      const next = [...list];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  async function save() {
    setBusy(true);
    setError(null);
    const result = await api(`/api/areas/${setup.area.id}/products`, { method: "PUT", body: { warehouseId, productIds: ids } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast.success(t.listSaved);
    router.refresh();
  }

  return (
    <>
      <Link href="/inventario/conteo" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.backCount}
      </Link>
      <PageHeader title={t.areaListTitle(setup.area.name)} subtitle={t.areaListIntro} figure={String(ids.length)} figureLabel={t.areaProducts.toLowerCase()} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <SelectField label={t.areaWarehouse} className="lg:max-w-md" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={[{ value: "", label: t.chooseWarehouse }, ...setup.warehouses.map((w) => ({ value: w.id, label: w.name }))]} />
      <section aria-label={t.areaProducts} className="flex flex-col gap-2">
        <SectionLabel as="h2">{t.areaProducts}</SectionLabel>
        {ids.length === 0 ? <p className="text-sm text-ink-muted">{t.noAreaProducts}</p> : null}
        <ol className="flex flex-col">
          {ids.map((id, i) => {
            const name = byId.get(id)?.name ?? "";
            return (
              <li key={id} className="flex min-h-12 items-center gap-2 border-b border-line" data-testid="area-product">
                <span className="w-8 text-sm text-ink-muted tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 font-semibold">{taken[id] ? t.takenBy(name, taken[id]) : name}</span>
                <Button variant="ghost" aria-label={t.moveUp(name)} disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon name="chevronUp" size={18} />
                </Button>
                <Button variant="ghost" aria-label={t.moveDown(name)} disabled={i === ids.length - 1} onClick={() => move(i, 1)}>
                  <Icon name="chevronDown" size={18} />
                </Button>
                <Button variant="ghost" aria-label={t.removeLine(name)} onClick={() => setIds((list) => list.filter((x) => x !== id))}>
                  <Icon name="trash" size={18} />
                </Button>
              </li>
            );
          })}
        </ol>
        <SelectField
          label={t.addToArea}
          className="lg:max-w-md"
          value=""
          onChange={(e) => e.target.value && setIds((list) => [...list, e.target.value])}
          options={[{ value: "", label: t.chooseProduct }, ...available.map((p) => ({ value: p.id, label: taken[p.id] ? t.takenBy(p.name, taken[p.id]) : p.name }))]}
        />
      </section>
      <div className="flex justify-end">
        <Button loading={busy} onClick={() => void save()}>
          {t.save}
        </Button>
      </div>
    </>
  );
}

"use client";

// Spec 003 RF-3, RF-5, RF-18 a RF-21, RF-33, RF-34: almacenes de la sucursal y del negocio, y áreas con responsable.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { es } from "@/i18n";
import type { AreaView, WarehouseView } from "@/server/services/catalog/views";
import { Alert, Button, Dialog, PageHeader, SectionLabel, SelectField, StatusBadge, TextField } from "@/ui";
import { formValues } from "../api";
import { useAction } from "./use-action";

const t = es.catalog;
const tl = es.catalog.places;

type Mode = { kind: "createWarehouse" } | { kind: "renameWarehouse"; warehouse: WarehouseView } | { kind: "createArea" } | { kind: "editArea"; area: AreaView } | null;

function Row({ name, archived, badges, detail, children }: { name: string; archived: boolean; badges?: ReactNode; detail?: ReactNode; children: ReactNode }) {
  return (
    <li data-item={name} className="flex min-h-13 flex-wrap items-center gap-x-2 border-b border-line py-1">
      <span className="flex flex-1 flex-col py-1">
        <span className={`flex flex-wrap items-center gap-2 font-semibold ${archived ? "text-ink-muted" : ""}`}>
          {name}
          {badges}
          {archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : null}
        </span>
        {detail}
      </span>
      <span className="flex">{children}</span>
    </li>
  );
}

export function PlacesManager({
  warehouses,
  areas,
  candidates,
  branch,
  business,
}: {
  warehouses: WarehouseView[];
  areas: AreaView[];
  candidates: { id: string; name: string }[];
  branch: string;
  business: string;
}) {
  const { run, error, setError, busy } = useAction();
  const [mode, setMode] = useState<Mode>(null);
  const order = <T extends { archived: boolean }>(list: T[]) => [...list.filter((x) => !x.archived), ...list.filter((x) => x.archived)];

  const close = () => {
    setMode(null);
    setError(null);
  };

  async function submit(form: HTMLFormElement) {
    if (!mode) return;
    const v = formValues(form);
    const done =
      mode.kind === "createWarehouse"
        ? await run("/api/warehouses", { body: { name: v.name, scope: v.scope } })
        : mode.kind === "renameWarehouse"
          ? await run(`/api/warehouses/${mode.warehouse.id}`, { method: "PATCH", body: { name: v.name } })
          : mode.kind === "createArea"
            ? await run("/api/areas", { body: { name: v.name, responsibleId: v.responsibleId } })
            : await run(`/api/areas/${mode.area.id}`, { method: "PATCH", body: { name: v.name, responsibleId: v.responsibleId } });
    if (done) setMode(null);
  }

  const toggle = (kind: "warehouses" | "areas", item: { id: string; name: string; archived: boolean }) => (
    <Button variant="ghost" aria-label={t.actionFor(item.archived ? t.reactivate : t.archive, item.name)} onAction={() => run(`/api/catalog/${kind}/${item.id}/${item.archived ? "reactivate" : "archive"}`)}>
      {item.archived ? t.reactivate : t.archive}
    </Button>
  );

  const title =
    mode?.kind === "createWarehouse"
      ? tl.createWarehouseTitle
      : mode?.kind === "renameWarehouse"
        ? tl.renameWarehouseTitle(mode.warehouse.name)
        : mode?.kind === "createArea"
          ? tl.createAreaTitle
          : mode?.kind === "editArea"
            ? tl.editAreaTitle(mode.area.name)
            : "";
  const currentArea = mode?.kind === "editArea" ? mode.area : null;
  const responsibleOptions = [
    ...candidates.map((c) => ({ value: c.id, label: c.name })),
    ...(currentArea && !currentArea.responsible.hasAccess ? [{ value: currentArea.responsible.id, label: tl.withoutAccess(currentArea.responsible.name) }] : []),
  ];

  return (
    <>
      <PageHeader title={tl.title} subtitle={tl.intro} figure={String(warehouses.filter((w) => !w.archived).length)} figureLabel={tl.figureLabel} />
      {error && !mode ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section aria-label={tl.warehouses} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>{tl.warehouses}</SectionLabel>
            <Button variant="secondary" onClick={() => setMode({ kind: "createWarehouse" })}>
              {tl.createWarehouse}
            </Button>
          </div>
          {warehouses.length === 0 ? <p className="text-sm text-ink-muted">{tl.noWarehouses}</p> : null}
          <ul className="flex flex-col">
            {order(warehouses).map((w) => (
              <Row key={w.id} name={w.name} archived={w.archived} badges={<StatusBadge tone="neutral">{w.scope === "branch" ? tl.branchBadge : tl.businessBadge}</StatusBadge>}>
                {!w.archived ? (
                  <Button variant="ghost" aria-label={t.actionFor(t.rename, w.name)} onClick={() => setMode({ kind: "renameWarehouse", warehouse: w })}>
                    {t.rename}
                  </Button>
                ) : null}
                {toggle("warehouses", w)}
              </Row>
            ))}
          </ul>
        </section>
        <section aria-label={tl.areas} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>{tl.areas}</SectionLabel>
            <Button variant="secondary" onClick={() => setMode({ kind: "createArea" })}>
              {tl.createArea}
            </Button>
          </div>
          {areas.length === 0 ? <p className="text-sm text-ink-muted">{tl.noAreas}</p> : null}
          <ul className="flex flex-col">
            {order(areas).map((a) => (
              <Row
                key={a.id}
                name={a.name}
                archived={a.archived}
                badges={!a.responsible.hasAccess ? <StatusBadge tone="danger">{tl.noAccess}</StatusBadge> : null}
                detail={<span className="text-sm text-ink-muted">{tl.responsibleOf(a.responsible.name)}</span>}
              >
                {!a.archived ? (
                  <>
                    <Link href={`/almacenes/areas/${a.id}`} className="inline-flex min-h-11 items-center px-3 font-semibold text-primary" aria-label={es.inventory.countListOf(a.name)}>
                      {es.inventory.countList}
                    </Link>
                    <Button variant="ghost" aria-label={t.actionFor(t.edit, a.name)} onClick={() => setMode({ kind: "editArea", area: a })}>
                      {t.edit}
                    </Button>
                  </>
                ) : null}
                {toggle("areas", a)}
              </Row>
            ))}
          </ul>
        </section>
      </div>
      <Dialog open={mode !== null} onClose={close} title={title}>
        {mode ? (
          <form
            key={title}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            {error ? <Alert tone="error">{error}</Alert> : null}
            <TextField
              label={t.name}
              name="name"
              required
              maxLength={80}
              autoFocus
              defaultValue={mode.kind === "renameWarehouse" ? mode.warehouse.name : mode.kind === "editArea" ? mode.area.name : ""}
            />
            {mode.kind === "createWarehouse" ? (
              <SelectField
                label={tl.scope}
                name="scope"
                defaultValue="branch"
                options={[
                  { value: "branch", label: tl.scopeBranch(branch) },
                  { value: "business", label: tl.scopeBusiness(business) },
                ]}
              />
            ) : null}
            {mode.kind === "createArea" || mode.kind === "editArea" ? (
              <>
                <SelectField label={tl.responsible} name="responsibleId" defaultValue={currentArea?.responsible.id ?? candidates[0]?.id} options={responsibleOptions} />
                <p className="-mt-2 text-sm text-ink-muted">{currentArea && !currentArea.responsible.hasAccess ? tl.noAccessHint : tl.responsibleHint}</p>
              </>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {es.common.cancel}
              </Button>
              <Button type="submit" loading={busy}>
                {es.common.save}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}

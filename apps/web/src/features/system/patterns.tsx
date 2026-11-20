"use client";

// Las tres pantallas tipo del catálogo (spec 002, RF-41). Los totales de aquí son solo de demostración: en los
// módulos reales los calcula el servidor (constitución, principio 3).
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { parseQuantity } from "@/domain/quantity";
import { unusual } from "@/domain/wizards/unusual";
import { es } from "@/i18n";
import { Button, DataTable, Dial, MoneyField, PageHeader, RowEntry, StatusBadge, Wizard, ResumePrompt, UnusualMark, UnusualNotice, formatMoney, useToast, type Column, type Filter } from "@/ui";
import { DENOMINATIONS, SAMPLE_DISHES, SAMPLE_DISH_VALUES, SAMPLE_PRODUCTS, type SampleProduct } from "./samples";

const tone = { ok: "success", low: "warning", out: "danger" } as const;

export function TablePattern() {
  const t = es.system.table;
  const columns: Column<SampleProduct>[] = [
    { key: "product", header: t.columns.product, cell: (r) => r.product, phone: "title" },
    { key: "status", header: t.columns.status, cell: (r) => <StatusBadge tone={tone[r.status]}>{t.status[r.status]}</StatusBadge>, phone: "badge" },
    { key: "area", header: t.columns.area, cell: (r) => r.area, phone: "primary" },
    { key: "stock", header: t.columns.stock, cell: (r) => r.stock, phone: "primary", align: "end" },
    { key: "store", header: t.columns.store, cell: (r) => r.store },
    { key: "unit", header: t.columns.unit, cell: (r) => r.unit },
    { key: "min", header: t.columns.min, cell: (r) => r.min, align: "end" },
    { key: "supplier", header: t.columns.supplier, cell: (r) => r.supplier },
  ];
  const filters: Filter<SampleProduct>[] = [
    { id: "dairy", group: "area", groupLabel: es.common.filterGroups.area, label: t.filters.dairy, test: (r) => r.area === "Lácteos" },
    { id: "vegetables", group: "area", groupLabel: es.common.filterGroups.area, label: t.filters.vegetables, test: (r) => r.area === "Verduras" },
    { id: "low", group: "status", groupLabel: es.common.filterGroups.status, label: t.filters.low, test: (r) => r.status !== "ok" },
  ];
  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} figure={String(SAMPLE_PRODUCTS.length)} figureLabel={t.figureLabel} />
      <DataTable
        caption={t.caption}
        rows={SAMPLE_PRODUCTS}
        columns={columns}
        rowKey={(r) => r.id}
        rowName={(r) => `${r.product} (${r.store})`}
        searchFields={(r) => [r.product, r.area, r.supplier]}
        searchLabel={t.search}
        filters={filters}
      />
    </>
  );
}

export function CapturePattern() {
  const t = es.system.capture;
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>(SAMPLE_DISH_VALUES);
  const parsed = SAMPLE_DISHES.map(([id]) => parseQuantity(values[id] ?? ""));
  const errors = parsed.filter((p) => !p.ok).length;
  const total = parsed.reduce((sum, p) => sum + (p.ok ? p.value : 0), 0);
  const done = parsed.filter((p) => p.ok && p.value > 0).length;
  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} figure={String(total)} figureLabel={t.figureLabel} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <RowEntry rows={SAMPLE_DISHES.map(([id, label]) => ({ id, label, unit: t.unit }))} values={values} onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))} headers={t.headers} />
        </div>
        <aside className="sticky bottom-(--nav-space) -mx-4 flex flex-col gap-3 border-t border-line-strong bg-surface px-4 py-4 lg:static lg:mx-0 lg:w-80 lg:rounded-lg lg:border lg:border-line lg:p-5">
          <div className="flex items-center gap-3">
            <Dial value={done / SAMPLE_DISHES.length} label={t.progress(done, SAMPLE_DISHES.length)} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{t.progress(done, SAMPLE_DISHES.length)}</span>
              <span className={`text-sm ${errors ? "text-danger" : "text-ink-muted"}`} data-testid="capture-errors">
                {errors ? t.errors(errors) : t.noErrors}
              </span>
            </div>
          </div>
          <Button full disabled={errors > 0} onClick={() => toast.success(t.calculated)}>
            {t.calculate}
          </Button>
          {errors ? <p className="text-sm text-ink-muted">{t.fixFirst}</p> : null}
        </aside>
      </div>
    </>
  );
}

export function WizardPattern() {
  const t = es.system.wizard;
  const router = useRouter();
  const toast = useToast();
  const empty = () => ({ fund: "", cards: "", transfers: "", cardsOk: false, cash: Object.fromEntries(DENOMINATIONS.map((d) => [d.id, "0"])) as Record<string, string> });
  const [data, setData] = useState(empty);
  const [index, setIndex] = useState(0);
  const [resume, setResume] = useState(true);
  const dirty = data.fund !== "" || data.cards !== "" || data.transfers !== "" || Object.values(data.cash).some((v) => v !== "0");
  const num = (raw: string) => {
    const p = parseQuantity(raw.replace(/,(?=\d{3})/g, ""));
    return p.ok ? p.value : 0;
  };
  const counted = useMemo(() => DENOMINATIONS.reduce((s, d) => s + d.value * num(data.cash[d.id] ?? "0"), 0), [data.cash]);
  const rows = DENOMINATIONS.map((d) => ({ id: d.id, label: formatMoney(d.value).replace(".00", ""), unit: d.kind === "bill" ? t.bill : t.coin }));
  // Ejemplo de dato raro: vouchers por más de $50,000 en un turno (en los módulos reales la regla es de la spec 015).
  const cardsOdd = unusual("pay", data.cards || "0", "50000");
  const money = (v: number) => <span className="font-brand font-bold">{formatMoney(v)}</span>;
  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} figure={formatMoney(counted).replace(".00", "")} figureLabel={t.figureLabel} />
      <div className="flex flex-col gap-4 lg:max-w-2xl">
        {resume ? <ResumePrompt updatedAt={new Date("2026-11-18T18:30:00-06:00")} stepTitle={t.steps.cash} onContinue={() => (setResume(false), setIndex(1))} onRestart={() => (setResume(false), setData(empty()), setIndex(0))} /> : null}
        <Wizard
          dirty={dirty}
          index={index}
          onIndexChange={setIndex}
          onExit={() => router.push("/sistema")}
          onFullView={() => toast.success(t.fullViewDemo)}
          onFinish={() => {
            setData(empty());
            setIndex(0);
            toast.success(t.finished);
          }}
          review={{ extra: <p className="flex justify-between border-t border-line-strong pt-3"><span>{t.total}</span>{money(counted + num(data.cards) + num(data.transfers))}</p> }}
          steps={[
            {
              id: "fund",
              title: t.steps.fund,
              hint: t.hints.fund,
              example: t.examples.fund,
              content: <MoneyField label={t.fund} value={data.fund} onChange={(e) => setData((d) => ({ ...d, fund: e.target.value }))} />,
              summary: money(num(data.fund)),
            },
            {
              id: "cash",
              title: t.steps.cash,
              hint: t.cashIntro,
              example: t.examples.cash,
              content: <RowEntry rows={rows} values={data.cash} onChange={(id, v) => setData((d) => ({ ...d, cash: { ...d.cash, [id]: v } }))} />,
              summary: money(counted),
            },
            {
              id: "cards",
              title: t.steps.cards,
              hint: t.hints.cards,
              validate: () => !cardsOdd.unusual || data.cardsOk,
              content: (
                <div className="flex flex-col gap-4">
                  <MoneyField label={t.cards} value={data.cards} onChange={(e) => setData((d) => ({ ...d, cards: e.target.value, cardsOk: false }))} />
                  {cardsOdd.unusual ? <UnusualNotice what={t.cards} expected={formatMoney(Number(cardsOdd.expected))} confirmed={data.cardsOk} onConfirm={() => setData((d) => ({ ...d, cardsOk: true }))} /> : null}
                  <MoneyField label={t.transfers} value={data.transfers} onChange={(e) => setData((d) => ({ ...d, transfers: e.target.value }))} />
                </div>
              ),
              summary: (
                <div className="flex flex-col gap-1">
                  <span>
                    {t.cards}: {money(num(data.cards))}
                  </span>
                  {cardsOdd.unusual ? <UnusualMark /> : null}
                  <span>
                    {t.transfers}: {money(num(data.transfers))}
                  </span>
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}

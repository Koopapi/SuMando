"use client";

// Tabla de datos (spec 002, RF-19, RF-20, RF-29 a RF-31; spec 014, RF-8 a RF-19). Un solo árbol de tabla: desde
// 1024 px se ve con todas sus columnas; por debajo, cada renglón es una tarjeta con sus datos principales y un botón
// para abrir el resto. Los filtros van en un selector por tipo; las listas largas, en grupos plegables o en páginas.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyTable, groupRows, openByDefault, pageOf, type TableFilter } from "@/domain/table-view";
import { es } from "@/i18n";
import { Button } from "./button";
import { Icon } from "./icons";
import { SelectField } from "./select-field";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { TextField } from "./text-field";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Cómo se ve en tarjeta: título del renglón, insignia junto al título, dato principal o solo al abrir. */
  phone?: "title" | "badge" | "primary" | "detail";
  align?: "start" | "end";
}

export interface Filter<T> extends TableFilter<T> {
  /** Nombre del tipo de filtro para su selector («Área», «Proveedor», «Estado»). */
  groupLabel: string;
}

export interface DataTableProps<T> {
  caption: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowName: (row: T) => string;
  searchFields: (row: T) => string[];
  searchLabel: string;
  filters?: Filter<T>[];
  state?: "ready" | "loading" | "error";
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Filtros elegidos al abrir (por ejemplo, solo los activos). */
  initialFilters?: string[];
  /** RF-13: agrupa los renglones por este nombre; nulo = el grupo «Sin…». */
  groupBy?: (row: T) => string | null;
  groupNone?: string;
  /** RF-19: clave para recordar grupos abiertos y página durante la sesión del navegador. */
  storageKey?: string;
}

const PHONE_CELL = {
  title: "order-1 flex-1 min-w-0 font-semibold text-base",
  badge: "order-2",
  primary: "order-5 text-sm text-ink-muted lg:text-ink lg:text-base",
  detail: "order-6 basis-full",
} as const;

interface Memory {
  groups: Record<string, boolean>;
  page: number;
}

function readMemory(key: string | undefined): Memory | null {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(`tabla:${key}`);
    return raw ? (JSON.parse(raw) as Memory) : null;
  } catch {
    return null;
  }
}

export function DataTable<T>({ caption, rows, columns, rowKey, rowName, searchFields, searchLabel, filters = [], state = "ready", onRetry, emptyTitle, emptyDescription, initialFilters = [], groupBy, groupNone = "", storageKey }: DataTableProps<T>) {
  const t = es.common;
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Record<string, string>>(() => Object.fromEntries(filters.filter((f) => initialFilters.includes(f.id)).map((f) => [f.group, f.id])));
  const [open, setOpen] = useState<string[]>([]);
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [restored, setRestored] = useState(false);

  // RF-19: al volver a la lista se recuperan los grupos abiertos y la página (después de montar, sin desajuste).
  useEffect(() => {
    const m = readMemory(storageKey);
    // sessionStorage no existe en el servidor: leerlo al montar evita que la página renderizada no coincida.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (m) {
      setGroupsOpen(m.groups ?? {});
      setPage(m.page ?? 1);
    }
    setRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || !restored) return;
    try {
      sessionStorage.setItem(`tabla:${storageKey}`, JSON.stringify({ groups: groupsOpen, page } satisfies Memory));
    } catch {
      /* sin almacenamiento, solo no se recuerda */
    }
  }, [storageKey, restored, groupsOpen, page]);

  const visible = useMemo(() => applyTable(rows, filters, chosen, query, searchFields), [rows, filters, chosen, query, searchFields]);
  const searching = query.trim() !== "" || Object.values(chosen).some(Boolean);
  const types = useMemo(() => {
    const map = new Map<string, { label: string; options: Filter<T>[] }>();
    for (const f of filters) {
      if (!map.has(f.group)) map.set(f.group, { label: f.groupLabel, options: [] });
      map.get(f.group)!.options.push(f);
    }
    return [...map.entries()];
  }, [filters]);
  const active = filters.filter((f) => chosen[f.group] === f.id);

  const clear = () => {
    setQuery("");
    setChosen({});
    setPage(1);
  };
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const hasDetail = columns.some((c) => (c.phone ?? "detail") === "detail");
  const colCount = columns.length + (hasDetail ? 1 : 0);

  const allGroups = groupBy ? groupRows(visible, groupBy, groupNone) : null;
  // Con un solo grupo no hay títulos: la lista se pagina como cualquier otra (RF-18).
  const groups = allGroups && allGroups.length > 1 ? allGroups : null;
  const defaultOpen = openByDefault(rows.length);
  const isGroupOpen = (key: string) => searching || (groupsOpen[key] ?? defaultOpen);
  const paged = !groups && visible.length > 25 ? pageOf(visible, page) : null;
  const shown = paged ? paged.rows : visible;

  function renderRow(row: T) {
    const key = rowKey(row);
    const isOpen = open.includes(key);
    return (
      <tr key={key} data-row={key} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-3 lg:table-row lg:py-0">
        {columns.map((c) => {
          const kind = c.phone ?? "detail";
          const hidden = kind === "detail" && !isOpen ? "hidden lg:table-cell" : "";
          const Tag = kind === "title" ? "th" : "td";
          return (
            <Fragment key={c.key}>
              {kind === "primary" && c === columns.find((x) => x.phone === "primary") ? <td aria-hidden className="order-4 h-0 basis-full lg:hidden" /> : null}
              <Tag scope={kind === "title" ? "row" : undefined} className={`${PHONE_CELL[kind]} ${hidden} text-left font-normal lg:table-cell lg:px-4 lg:py-2.5 ${kind === "title" ? "lg:font-semibold" : ""} ${c.align === "end" ? "lg:text-right" : ""}`}>
                {kind === "detail" ? (
                  <span className="flex items-center justify-between gap-3 text-sm lg:block lg:text-base">
                    <span className="text-ink-muted lg:hidden">{c.header}</span>
                    <span className="font-semibold lg:font-normal">{c.cell(row)}</span>
                  </span>
                ) : (
                  c.cell(row)
                )}
              </Tag>
            </Fragment>
          );
        })}
        {hasDetail ? (
          <td className="order-3 lg:hidden">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-label={`${isOpen ? t.showLess : t.showMore}: ${rowName(row)}`}
              onClick={() => setOpen((o) => toggle(o, key))}
              className="inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-primary-soft"
            >
              <Icon name={isOpen ? "chevronUp" : "chevronDown"} />
            </button>
          </td>
        ) : null}
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <TextField
          label={searchLabel}
          hideLabel
          type="search"
          placeholder={searchLabel}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          leading={<Icon name="search" className="text-ink-muted" />}
          className="lg:w-80"
        />
        {types.length > 0 ? (
          <div role="group" aria-label={t.filters} className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
            {types.map(([group, { label, options }]) => (
              <SelectField
                key={group}
                label={label}
                hideLabel
                className="min-w-0 lg:w-52"
                value={chosen[group] ?? ""}
                onChange={(e) => {
                  setChosen((c) => ({ ...c, [group]: e.target.value }));
                  setPage(1);
                }}
                options={[{ value: "", label: t.filterAll(label) }, ...options.map((o) => ({ value: o.id, label: o.label }))]}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {active.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-label={t.removeFilter(f.label)}
            onClick={() => setChosen((c) => ({ ...c, [f.group]: "" }))}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary bg-primary-soft px-3 font-semibold text-primary"
          >
            {f.label}
            <Icon name="close" size={14} />
          </button>
        ))}
        {searching ? (
          <button type="button" onClick={clear} className="inline-flex min-h-9 items-center px-2 font-semibold text-primary underline-offset-2 hover:underline">
            {t.clear}
          </button>
        ) : null}
        {state === "ready" ? (
          <span className="ml-auto text-ink-muted" data-testid="table-count">
            {t.showing(visible.length, rows.length)}
          </span>
        ) : null}
        {groups && !searching ? (
          <span className="flex gap-1">
            <button type="button" onClick={() => setGroupsOpen(Object.fromEntries(groups.map((g) => [g.key, true])))} className="inline-flex min-h-9 items-center px-2 font-semibold text-primary">
              {t.openAll}
            </button>
            <button type="button" onClick={() => setGroupsOpen(Object.fromEntries(groups.map((g) => [g.key, false])))} className="inline-flex min-h-9 items-center px-2 font-semibold text-primary">
              {t.closeAll}
            </button>
          </span>
        ) : null}
      </div>

      {state === "loading" ? <LoadingState /> : null}
      {state === "error" ? <ErrorState action={onRetry ? <Button onClick={onRetry}>{t.retry}</Button> : undefined} /> : null}
      {state === "ready" && visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 && emptyTitle ? emptyTitle : t.noMatches}
          description={rows.length === 0 && emptyDescription ? emptyDescription : t.noMatchesBody}
          action={rows.length > 0 ? <Button variant="secondary" onClick={clear}>{t.clearFilters}</Button> : undefined}
        />
      ) : null}

      {state === "ready" && visible.length > 0 ? (
        <table className="block w-full border-collapse lg:table lg:overflow-hidden lg:rounded-lg lg:border lg:border-line lg:bg-surface">
          <caption className="sr-only">{caption}</caption>
          <thead className="sr-only lg:not-sr-only lg:table-header-group">
            <tr className="lg:border-b lg:border-line lg:bg-page">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-2.5 text-xs font-semibold tracking-widest text-ink-muted uppercase ${c.align === "end" ? "text-right" : "text-left"}`}>
                  {c.header}
                </th>
              ))}
              {hasDetail ? <td className="hidden" /> : null}
            </tr>
          </thead>
          {groups ? (
            groups.map((g) => {
              const on = isGroupOpen(g.key);
              return (
                <tbody key={g.key} className="block lg:table-row-group" data-group={g.label}>
                  <tr className="block lg:table-row">
                    <th colSpan={colCount} scope="colgroup" className="block p-0 text-left lg:table-cell">
                      <button
                        type="button"
                        aria-expanded={on}
                        aria-label={t.groupToggle(g.label, g.rows.length)}
                        disabled={searching}
                        onClick={() => setGroupsOpen((o) => ({ ...o, [g.key]: !on }))}
                        className="flex min-h-11 w-full items-center gap-2 border-b border-line bg-page px-1 text-left font-brand font-bold disabled:cursor-default lg:px-4"
                      >
                        <Icon name={on ? "chevronDown" : "chevronRight"} size={18} className="text-ink-muted" />
                        <span className="flex-1">{g.label}</span>
                        <span className="text-sm font-semibold text-ink-muted tabular-nums">{g.rows.length}</span>
                      </button>
                    </th>
                  </tr>
                  {on ? g.rows.map(renderRow) : null}
                </tbody>
              );
            })
          ) : (
            <tbody className="block lg:table-row-group">{shown.map(renderRow)}</tbody>
          )}
        </table>
      ) : null}

      {paged && paged.pages > 1 ? (
        <nav aria-label={t.pagination} className="flex items-center justify-between gap-2">
          <Button variant="secondary" disabled={paged.page <= 1} onClick={() => setPage(paged.page - 1)}>
            {t.previousPage}
          </Button>
          <span className="flex flex-col items-center text-sm" aria-live="polite">
            <span className="font-semibold">{t.pageOf(paged.page, paged.pages)}</span>
            <span className="text-ink-muted">{t.showingRange(paged.from, paged.to, visible.length)}</span>
          </span>
          <Button variant="secondary" disabled={paged.page >= paged.pages} onClick={() => setPage(paged.page + 1)}>
            {t.nextPage}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

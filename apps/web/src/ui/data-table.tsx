"use client";

// Tabla de datos (spec 002, RF-19, RF-20, RF-29 a RF-31). Un solo árbol de tabla: desde 1024 px se ve con todas sus
// columnas; por debajo, cada renglón es una tarjeta con sus datos principales y un botón para abrir el resto.
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { matchesSearch } from "@/domain/search";
import { es } from "@/i18n";
import { Button } from "./button";
import { Icon } from "./icons";
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

export interface Filter<T> {
  id: string;
  label: string;
  test: (row: T) => boolean;
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
}

const PHONE_CELL = {
  title: "order-1 flex-1 min-w-0 font-semibold text-base",
  badge: "order-2",
  primary: "order-5 text-sm text-ink-muted lg:text-ink lg:text-base",
  detail: "order-6 basis-full",
} as const;

export function DataTable<T>({ caption, rows, columns, rowKey, rowName, searchFields, searchLabel, filters = [], state = "ready", onRetry, emptyTitle, emptyDescription }: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string[]>([]);
  const [open, setOpen] = useState<string[]>([]);
  const t = es.common;

  const visible = useMemo(() => {
    const chosen = filters.filter((f) => active.includes(f.id));
    return rows.filter((r) => matchesSearch(searchFields(r), query) && chosen.every((f) => f.test(r)));
  }, [rows, query, active, filters, searchFields]);

  const clear = () => {
    setQuery("");
    setActive([]);
  };
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const hasDetail = columns.some((c) => (c.phone ?? "detail") === "detail");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <TextField
          label={searchLabel}
          hideLabel
          type="search"
          placeholder={searchLabel}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Icon name="search" className="text-ink-muted" />}
          className="lg:w-96"
        />
        {filters.length > 0 ? (
          <div role="group" aria-label={t.filters} className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const on = active.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActive((a) => toggle(a, f.id))}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold ${on ? "border-primary bg-primary-soft text-primary" : "border-line-strong bg-surface text-ink"}`}
                >
                  {on ? <Icon name="check" size={16} /> : null}
                  {f.label}
                </button>
              );
            })}
          </div>
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
        <>
          <table className="block w-full border-collapse lg:table lg:overflow-hidden lg:rounded-lg lg:border lg:border-line lg:bg-surface">
            <caption className="sr-only">{caption}</caption>
            <thead className="sr-only lg:not-sr-only lg:table-header-group">
              <tr className="lg:border-b lg:border-line lg:bg-page">
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-4 py-3 text-xs font-semibold tracking-widest text-ink-muted uppercase ${c.align === "end" ? "text-right" : "text-left"}`}>
                    {c.header}
                  </th>
                ))}
                {hasDetail ? <td className="hidden" /> : null}
              </tr>
            </thead>
            <tbody className="block lg:table-row-group">
              {visible.map((row) => {
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
                          <Tag
                            scope={kind === "title" ? "row" : undefined}
                            className={`${PHONE_CELL[kind]} ${hidden} text-left font-normal lg:table-cell lg:px-4 lg:py-3.5 ${kind === "title" ? "lg:font-semibold" : ""} ${c.align === "end" ? "lg:text-right" : ""}`}
                          >
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
              })}
            </tbody>
          </table>
          <p className="text-sm text-ink-muted" data-testid="table-count">
            {t.showing(visible.length, rows.length)}
          </p>
        </>
      ) : null}
    </div>
  );
}

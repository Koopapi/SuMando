"use client";

// Spec 008 RF-36, RF-37: empleados de la sucursal con búsqueda y filtros; el sueldo solo en la vista del dueño.
import Link from "next/link";
import { es } from "@/i18n";
import type { EmployeeSummaryView } from "@/server/services/personnel/views";
import { DataTable, EmptyState, LinkButton, PageHeader, StatusBadge, formatMoney, type Column, type Filter } from "@/ui";
import { showDate } from "./dates";

const t = es.personnel;

export function EmployeesList({ employees, owner, canCreate }: { employees: EmployeeSummaryView[]; owner: boolean; canCreate: boolean }) {
  const columns: Column<EmployeeSummaryView>[] = [
    {
      key: "name",
      header: t.name,
      phone: "title",
      cell: (e) => (
        <Link href={`/personal/${e.id}`} className="font-semibold text-primary hover:underline">
          {e.name}
        </Link>
      ),
    },
    {
      key: "status",
      header: t.docs,
      phone: "badge",
      cell: (e) => (
        <span className="flex flex-wrap items-center gap-1">
          {!e.active ? <StatusBadge tone="neutral">{t.inactiveBadge}</StatusBadge> : null}
          {e.active && e.docs.missing ? <StatusBadge tone="warning">{t.missingBadge(e.docs.missing)}</StatusBadge> : null}
          {e.active && e.docs.expired ? <StatusBadge tone="danger">{t.expiredBadge(e.docs.expired)}</StatusBadge> : null}
          <span className="text-sm text-ink-muted tabular-nums">{t.docsValue(e.docs.ok, e.docs.total)}</span>
        </span>
      ),
    },
    { key: "position", header: t.position, phone: "primary", cell: (e) => e.position },
    { key: "hired", header: t.hiredOn, cell: (e) => showDate(e.hiredOn) },
    { key: "phoneN", header: t.phone, phone: "detail", cell: (e) => e.phone ?? "—" },
    ...(owner ? [{ key: "pay", header: t.pay, align: "end" as const, cell: (e: EmployeeSummaryView) => <span className="tabular-nums">{e.pay ? formatMoney(Number(e.pay)) : t.noPay}</span> }] : []),
  ];
  const positions = [...new Set(employees.map((e) => e.position))].sort((a, b) => a.localeCompare(b, "es"));
  const filters: Filter<EmployeeSummaryView>[] = [
    { id: "active", label: t.filterActive, test: (e) => e.active },
    { id: "inactive", label: t.filterInactive, test: (e) => !e.active },
    { id: "incomplete", label: t.filterIncomplete, test: (e) => e.docs.missing > 0 },
    { id: "expired", label: t.filterExpired, test: (e) => e.docs.expired > 0 },
    ...positions.map((p) => ({ id: `pos:${p}`, label: t.filterPosition(p), test: (e: EmployeeSummaryView) => e.position === p })),
  ];
  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.intro}
        figure={String(employees.filter((e) => e.active).length)}
        figureLabel={t.figureLabel}
        action={
          <span className="flex flex-wrap gap-2">
            {canCreate ? (
              <LinkButton href="/personal/nuevo" icon="plus">
                {t.create}
              </LinkButton>
            ) : null}
            <LinkButton href="/personal/documentos" variant="secondary">
              {t.documentsLink}
            </LinkButton>
            <LinkButton href="/personal/puestos" variant="secondary">
              {t.positionsLink}
            </LinkButton>
          </span>
        }
      />
      {employees.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        <DataTable caption={t.caption} rows={employees} columns={columns} rowKey={(e) => e.id} rowName={(e) => e.name} searchFields={(e) => [e.name]} searchLabel={t.search} filters={filters} initialFilters={["active"]} />
      )}
    </>
  );
}

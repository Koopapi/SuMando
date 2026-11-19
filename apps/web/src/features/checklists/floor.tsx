"use client";

// Spec 010 RF-38, RF-40: el teléfono de piso. El empleado toca su nombre (se recuerda en este teléfono) y llena las
// hojas de hoy; nada más de SuMando se abre aquí.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { es } from "@/i18n";
import type { FloorEmployeeView } from "@/server/services/checklists/floor";
import type { SheetView, TodayView } from "@/server/services/checklists/sheets";
import { Alert, Button, EmptyState, ListRow, LoadingState, PageHeader } from "@/ui";
import { api } from "../api";
import { readFloorView, writeFloorView } from "../wizards/floor-view";
import { draftPath } from "../wizards/use-wizard-draft";
import type { View } from "../wizards/view-switch";
import { FloorChecklistWizard } from "./wizards/floor-checklist";
import { TodayList } from "./lists";
import { SheetBoard } from "./sheet-board";

const t = es.checklists;
const KEY = "mando.piso.empleado";

export function readFloorEmployee(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeChosen(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento, se vuelve a elegir cada vez.
  }
}

export function FloorHome({ device, employees, today, items, cash = false }: { device: string; employees: FloorEmployeeView[]; today: string; items: TodayView[]; cash?: boolean }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = readFloorEmployee();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la elección vive en este teléfono y solo se lee al montar.
    setChosen(id && employees.some((e) => e.id === id) ? id : null);
    setReady(true);
  }, [employees]);
  const person = employees.find((e) => e.id === chosen);
  if (!ready) return <LoadingState />;
  if (!person) {
    return (
      <>
        <PageHeader title={t.floorWho} subtitle={t.floorWhoIntro} figureLabel={device} />
        {employees.length === 0 ? <EmptyState title={t.floorNoEmployees} /> : null}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="floor-employees">
          {employees.map((e) => (
            <li key={e.id}>
              <Button
                variant="secondary"
                full
                onClick={() => {
                  writeChosen(e.id);
                  setChosen(e.id);
                }}
              >
                {e.name}
              </Button>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <>
      <PageHeader title={t.floorTitle} subtitle={`${t.floorHello(person.name)} · ${device}`} />
      <Button
        variant="ghost"
        className="self-start"
        onClick={() => {
          writeChosen(null);
          setChosen(null);
        }}
      >
        {t.floorChange}
      </Button>
      <TodayList items={items} today={today} hrefOf={(id) => `/piso/${id}`} />
      {cash ? <ListRow href="/piso/caja" icon="cash" title={es.cash.floorLink} detail={es.cash.introFloor} /> : null}
    </>
  );
}

/** Spec 010 RF-38 y spec 015 RF-48: la hoja de hoy en el teléfono de piso, con el asistente «Checklist» o la hoja
 *  completa según lo que eligió ese empleado en ese teléfono (`?vista=` lo fuerza y lo recuerda). */
export function FloorSheet({ templateId, today, employees, view: forced }: { templateId: string; today: string; employees: FloorEmployeeView[]; view: View | null }) {
  const router = useRouter();
  const [state, setState] = useState<{ sheet: SheetView; employee: string; view: View; resume: boolean; pending: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (id: string, view: View, resume: boolean) => {
      void Promise.all([
        api<{ sheet: SheetView }>(`/api/checklists/${templateId}/${today}?employee=${encodeURIComponent(id)}`),
        view === "full" ? api<{ draft: unknown }>(draftPath("floor-checklist", templateId, id)) : Promise.resolve(null),
      ]).then(([r, d]) => {
        if (!r.ok) return setError(r.error.message);
        setError(null);
        setState({ sheet: r.data.sheet, employee: id, view, resume, pending: !!(d?.ok && d.data.draft) });
      });
    },
    [templateId, today],
  );

  useEffect(() => {
    const id = readFloorEmployee();
    if (!id) {
      router.replace("/piso");
      return;
    }
    if (forced) writeFloorView("floor-checklist", id, forced);
    load(id, forced ?? readFloorView("floor-checklist", id), false);
  }, [forced, load, router]);

  const switchTo = (view: View) => {
    if (!state) return;
    writeFloorView("floor-checklist", state.employee, view);
    setState(null);
    load(state.employee, view, view === "wizard");
  };

  return (
    <>
      <Link href="/piso" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.floorBack}
      </Link>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {state ? (
        <>
          <PageHeader title={state.sheet.templateName} />
          {state.view === "wizard" ? (
            <FloorChecklistWizard
              key={state.employee}
              sheet={state.sheet}
              employees={employees}
              employee={state.employee}
              autoResume={state.resume}
              onEmployee={(id) => {
                writeChosen(id);
                setState(null);
                load(id, readFloorView("floor-checklist", id), false);
              }}
              onFullView={() => switchTo("full")}
            />
          ) : (
            <>
              <div>
                <Button variant="secondary" onClick={() => switchTo("wizard")}>
                  {es.common.stepByStep}
                </Button>
              </div>
              {state.pending ? <Alert tone="info">{t.floorWizard.pendingDraft}</Alert> : null}
              <SheetBoard sheet={state.sheet} mode="device" employeeId={state.employee} />
            </>
          )}
        </>
      ) : !error ? (
        <LoadingState />
      ) : null}
    </>
  );
}

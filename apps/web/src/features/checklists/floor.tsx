"use client";

// Spec 010 RF-38, RF-40: el teléfono de piso. El empleado toca su nombre (se recuerda en este teléfono) y llena las
// hojas de hoy; nada más de SuMando se abre aquí.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { es } from "@/i18n";
import type { FloorEmployeeView } from "@/server/services/checklists/floor";
import type { SheetView, TodayView } from "@/server/services/checklists/sheets";
import { Alert, Button, EmptyState, LoadingState, PageHeader } from "@/ui";
import { api } from "../api";
import { TodayList } from "./lists";
import { SheetBoard } from "./sheet-board";

const t = es.checklists;
const KEY = "mando.piso.empleado";

function readChosen(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeChosen(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento, se vuelve a elegir cada vez.
  }
}

export function FloorHome({ device, employees, today, items }: { device: string; employees: FloorEmployeeView[]; today: string; items: TodayView[] }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = readChosen();
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
    </>
  );
}

export function FloorSheet({ templateId, today }: { templateId: string; today: string }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const [employee, setEmployee] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const id = readChosen();
    if (!id) {
      router.replace("/piso");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la elección vive en este teléfono y solo se lee al montar.
    setEmployee(id);
    void api<{ sheet: SheetView }>(`/api/checklists/${templateId}/${today}?employee=${encodeURIComponent(id)}`).then((r) => (r.ok ? setSheet(r.data.sheet) : setError(r.error.message)));
  }, [templateId, today, router]);
  return (
    <>
      <Link href="/piso" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.floorBack}
      </Link>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {sheet && employee ? (
        <>
          <PageHeader title={sheet.templateName} />
          <SheetBoard sheet={sheet} mode="device" employeeId={employee} />
        </>
      ) : !error ? (
        <LoadingState />
      ) : null}
    </>
  );
}

"use client";

// Spec 011 RF-30 a RF-32: el corte en el teléfono de piso, a ciegas, con el cajero que eligió su nombre.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { es } from "@/i18n";
import type { CutView } from "@/server/services/cash/cuts";
import { Alert, LoadingState, PageHeader } from "@/ui";
import { api } from "../api";
import { readFloorEmployee } from "../checklists/floor";
import { CutBoard } from "./cut-board";

export function FloorCash() {
  const router = useRouter();
  const [state, setState] = useState<{ cut: CutView | null; employee: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const id = readFloorEmployee();
    if (!id) {
      router.replace("/piso");
      return;
    }
    void api<{ cut: CutView | null }>(`/api/cash/current?employee=${encodeURIComponent(id)}`).then((r) => (r.ok ? setState({ cut: r.data.cut, employee: id }) : setError(r.error.message)));
  }, [router]);
  return (
    <>
      <Link href="/piso" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {es.checklists.floorBack}
      </Link>
      <PageHeader title={es.cash.title} subtitle={es.cash.introFloor} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {state ? <CutBoard cut={state.cut} mode="device" employeeId={state.employee} /> : !error ? <LoadingState /> : null}
    </>
  );
}

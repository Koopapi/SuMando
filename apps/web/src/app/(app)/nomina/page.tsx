// Spec 009: Nómina abre en la semana actual de la sucursal activa.
import { redirect } from "next/navigation";
import { weekOf } from "@/domain/payroll/week";
import { todayInMexico } from "@/domain/personnel/documents";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requirePageBranch();
  redirect(`/nomina/${weekOf(todayInMexico(appCtx().ports.clock.now()))}`);
}

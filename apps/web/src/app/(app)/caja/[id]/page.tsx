// Spec 011 RF-41: el detalle de un corte de la sucursal activa.
import Link from "next/link";
import { notFound } from "next/navigation";
import { CutBoard } from "@/features/cash/cut-board";
import { showDate } from "@/features/personnel/dates";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { cutDetail } from "@/server/services/cash/cuts";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.cash.title };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const cut = await cutDetail(appCtx(), { kind: "user", scope: { actor: user, active } }, (await params).id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!cut) notFound();
  return (
    <PageShell>
      <Link href="/caja/historial" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {es.cash.history}
      </Link>
      <PageHeader title={es.cash.cutTitle(showDate(cut.date))} />
      <CutBoard key={`${cut.id}-${cut.status}`} cut={cut} mode="user" canOpen={false} />
    </PageShell>
  );
}

// Spec 010 RF-15 a RF-36, RF-47: la hoja de una plantilla en una fecha.
import Link from "next/link";
import { notFound } from "next/navigation";
import { SheetBoard } from "@/features/checklists/sheet-board";
import { showDate } from "@/features/personnel/dates";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { sheetView } from "@/server/services/checklists/sheets";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.title };

export default async function Page({ params }: { params: Promise<{ templateId: string; date: string }> }) {
  const { user, active } = await requirePageBranch();
  const { templateId, date } = await params;
  const sheet = await sheetView(appCtx(), { kind: "user", scope: { actor: user, active } }, templateId, date).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!sheet) notFound();
  return (
    <PageShell>
      <Link href="/checklists" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {es.checklists.back}
      </Link>
      <PageHeader title={es.checklists.sheetTitle(sheet.templateName, showDate(sheet.date))} />
      <SheetBoard key={`${sheet.status}-${sheet.date}`} sheet={sheet} mode="user" />
    </PageShell>
  );
}

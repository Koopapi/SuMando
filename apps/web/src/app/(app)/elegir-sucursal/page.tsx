// RF-32, RF-35, RF-36, RF-38: elegir (o cambiar) la sucursal activa; sin ninguna, el aviso.
import Link from "next/link";
import { BranchChooser } from "@/features/branch/branch-chooser";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageSession } from "@/server/auth/page-guards";
import { branchChoices, resolveBranchState } from "@/server/services/active-branch";
import { Alert, PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function ChooseBranchPage() {
  const session = await requirePageSession();
  const ctx = appCtx();
  const [state, choices] = await Promise.all([resolveBranchState(ctx, session), branchChoices(ctx, session.user)]);
  return (
    <PageShell title={es.shell.chooseTitle} subtitle={choices.length > 0 ? es.shell.chooseIntro : undefined}>
      {choices.length === 0 && session.user.role === "owner" ? (
        <Alert tone="info">
          <p>{es.shell.noBusinessesOwner}</p>
          <Link href="/negocios" className="mt-2 inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-brand font-bold text-on-primary">
            {es.shell.goBusinesses}
          </Link>
        </Alert>
      ) : choices.length === 0 ? (
        <Alert tone="warning">{es.errors.no_branch}</Alert>
      ) : (
        <BranchChooser choices={choices} activeId={state.kind === "active" ? state.active.branch.id : null} />
      )}
    </PageShell>
  );
}

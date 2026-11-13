// Páginas con sesión: la estructura con el negocio y la sucursal activa (spec 001 RF-35; spec 002 RF-12, RF-16, RF-17).
import { redirect } from "next/navigation";
import type { BusinessColor } from "@/domain/business-color";
import { AppShell } from "@/features/shell/app-shell";
import { appCtx } from "@/server/app-context";
import { currentSession } from "@/server/auth/session";
import { resolveBranchState } from "@/server/services/active-branch";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const state = await resolveBranchState(appCtx(), session);
  const active =
    state.kind === "active" ? { business: state.active.business.name, branch: state.active.branch.name, color: state.active.business.color as BusinessColor } : null;
  return (
    <AppShell user={session.user} active={active}>
      {children}
    </AppShell>
  );
}

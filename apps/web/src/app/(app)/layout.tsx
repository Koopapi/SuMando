// Páginas con sesión: la barra con la sucursal activa (RF-35) va encima de todas.
import { redirect } from "next/navigation";
import { AppBar } from "@/features/shell/app-bar";
import { appCtx } from "@/server/app-context";
import { currentSession } from "@/server/auth/session";
import { resolveBranchState } from "@/server/services/active-branch";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const state = await resolveBranchState(appCtx(), session);
  const active = state.kind === "active" ? { business: state.active.business.name, branch: state.active.branch.name } : null;
  return (
    <>
      <AppBar user={session.user} active={active} />
      {children}
    </>
  );
}

// RF-12 a RF-16: cambiar la contraseña; con temporal es la única pantalla disponible.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { LogoutButton } from "@/features/auth/logout-button";
import { es } from "@/i18n";
import { currentSession } from "@/server/auth/session";
import { AuthShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const forced = session.user.mustChangePassword;
  return (
    <AuthShell title={es.auth.changeTitle} subtitle={forced ? es.auth.changeForcedIntro : es.auth.changeIntro}>
      <ChangePasswordForm />
      {forced ? <LogoutButton /> : null}
      {forced ? null : (
        <Link href="/" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
          {es.common.back}
        </Link>
      )}
    </AuthShell>
  );
}

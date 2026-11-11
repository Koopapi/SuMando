// RF-12 a RF-16: cambiar la contraseña; con temporal es la única pantalla disponible.
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { LogoutButton } from "@/features/auth/logout-button";
import { es } from "@/i18n";
import { currentSession } from "@/server/auth/session";
import { Card, PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const forced = session.user.mustChangePassword;
  return (
    <PageShell title={es.auth.changeTitle} narrow actions={<LogoutButton />}>
      <Card>
        <p className="mb-4 text-ink-muted">{forced ? es.auth.changeForcedIntro : es.auth.changeIntro}</p>
        <ChangePasswordForm />
      </Card>
    </PageShell>
  );
}

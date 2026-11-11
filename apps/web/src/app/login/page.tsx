// RF-4: entrar con correo y contraseña. Sin cuentas, lleva al primer arranque (RF-1).
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { isSetupNeeded } from "@/server/services/setup";
import { Card, PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isSetupNeeded(appCtx())) redirect("/setup");
  return (
    <PageShell title={es.auth.loginTitle} narrow>
      <Card>
        <p className="mb-4 text-ink-muted">{es.auth.loginIntro}</p>
        <LoginForm />
      </Card>
    </PageShell>
  );
}

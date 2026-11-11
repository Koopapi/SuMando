// RF-1 a RF-3: solo existe mientras no haya ninguna cuenta.
import { redirect } from "next/navigation";
import { SetupForm } from "@/features/auth/setup-form";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { isSetupNeeded } from "@/server/services/setup";
import { Card, PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await isSetupNeeded(appCtx()))) redirect("/login");
  return (
    <PageShell title={es.auth.setupTitle} narrow>
      <Card>
        <p className="mb-4 text-ink-muted">{es.auth.setupIntro}</p>
        <SetupForm />
      </Card>
    </PageShell>
  );
}

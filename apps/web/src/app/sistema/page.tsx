// Catálogo mínimo de componentes (T7). Solo existe con DEV_ENDPOINTS=1; la spec 002 construye el catálogo real.
import { notFound } from "next/navigation";
import { es } from "@/i18n";
import { devEndpointsEnabled } from "@/server/clock";
import { Alert, Button, Card, EmptyState, PageShell, PasswordField, TextField } from "@/ui";

export const dynamic = "force-dynamic";

export default function SystemPage() {
  if (!devEndpointsEnabled()) notFound();
  const t = es.system;
  return (
    <PageShell title={t.title}>
      <p className="text-ink-muted">{t.intro}</p>
      <Card title={t.buttons}>
        <div className="flex flex-wrap gap-3">
          <Button>{t.primary}</Button>
          <Button variant="secondary">{t.secondary}</Button>
          <Button variant="danger">{t.danger}</Button>
          <Button variant="ghost">{t.ghost}</Button>
          <Button loading>{t.loading}</Button>
        </div>
      </Card>
      <Card title={t.fields}>
        <div className="flex flex-col gap-4">
          <TextField label={t.fieldLabel} hint={t.fieldHint} />
          <TextField label={t.fieldLabel} error={t.fieldError} defaultValue="" />
          <PasswordField label={t.passwordLabel} autoComplete="new-password" />
        </div>
      </Card>
      <Card title={t.alerts}>
        <div className="flex flex-col gap-3">
          <Alert tone="info">{t.alertInfo}</Alert>
          <Alert tone="success">{t.alertSuccess}</Alert>
          <Alert tone="warning">{t.alertWarning}</Alert>
          <Alert tone="error" title={t.alertError}>
            {es.common.unknownError}
          </Alert>
        </div>
      </Card>
      <Card title={t.empty}>
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} action={<Button variant="secondary">{t.emptyAction}</Button>} />
      </Card>
      <Card title={t.card}>
        <p>{t.cardBody}</p>
      </Card>
    </PageShell>
  );
}

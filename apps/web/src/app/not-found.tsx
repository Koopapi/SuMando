// Página 404 en español (constitución, principio 11).
import Link from "next/link";
import { es } from "@/i18n";
import { PageShell } from "@/ui";

export default function NotFound() {
  const t = es.offline;
  return (
    <PageShell title={t.notFoundTitle} narrow brand>
      <p className="text-ink-muted">{t.notFoundBody}</p>
      <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-medium text-on-primary">
        {t.goHome}
      </Link>
    </PageShell>
  );
}

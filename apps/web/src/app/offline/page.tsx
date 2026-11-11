// RF-40: página propia sin conexión. Es estática y sin JavaScript obligatorio: el service worker la sirve desde caché.
import Link from "next/link";
import { es } from "@/i18n";
import { PageShell } from "@/ui";

export default function OfflinePage() {
  const t = es.offline;
  return (
    <PageShell title={t.title} narrow>
      <p className="text-ink-muted">{t.body}</p>
      <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-700 px-4 font-medium text-white">
        {t.retry}
      </Link>
    </PageShell>
  );
}

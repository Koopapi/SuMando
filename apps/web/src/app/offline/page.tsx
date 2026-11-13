// RF-40: página propia sin conexión. Es estática y sin JavaScript obligatorio: el service worker la sirve desde caché.
import Link from "next/link";
import { es } from "@/i18n";
import { AuthShell } from "@/ui";

export default function OfflinePage() {
  const t = es.offline;
  return (
    <AuthShell title={t.title} subtitle={t.body}>
      <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-brand font-bold text-on-primary">
        {t.retry}
      </Link>
    </AuthShell>
  );
}

// Página 404 en español (constitución, principio 11).
import Link from "next/link";
import { es } from "@/i18n";
import { AuthShell } from "@/ui";

export default function NotFound() {
  const t = es.offline;
  return (
    <AuthShell title={t.notFoundTitle} subtitle={t.notFoundBody}>
      <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-brand font-bold text-on-primary">
        {t.goHome}
      </Link>
    </AuthShell>
  );
}

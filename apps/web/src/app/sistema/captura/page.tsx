// Pantalla tipo del catálogo (spec 002, RF-41): datos de ejemplo, nada se guarda. Solo con DEV_ENDPOINTS=1.
import Link from "next/link";
import { notFound } from "next/navigation";
import { CapturePattern } from "@/features/system/patterns";
import { es } from "@/i18n";
import { devEndpointsEnabled } from "@/server/clock";

export const dynamic = "force-dynamic";

export const metadata = { title: es.system.capture.title };

export default function Page() {
  if (!devEndpointsEnabled()) notFound();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-12 lg:py-9">
      <Link href="/sistema" className="-mt-2 mb-4 inline-flex min-h-11 items-center self-start text-sm font-semibold text-primary lg:mt-0 lg:mb-0">
        {es.system.backToCatalog}
      </Link>
      <CapturePattern />
    </main>
  );
}

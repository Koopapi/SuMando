"use client";

// Aviso de dato raro (spec 015, RF-12, RF-14): el dato se ve fuera de lo normal; se muestra lo esperado al lado y
// para seguir hay que confirmarlo. Ya confirmado, queda la marca (también en el resumen).
import { es } from "@/i18n";
import { Button } from "./button";
import { Icon } from "./icons";

export function UnusualNotice({ what, expected, confirmed, onConfirm }: { what: string; expected: string; confirmed: boolean; onConfirm: () => void }) {
  const t = es.common.unusual;
  if (confirmed) return <UnusualMark />;
  return (
    <div role="status" className="flex flex-col gap-2 rounded-md border border-warning-soft bg-warning-soft px-3 py-2 text-sm text-warning" data-unusual="pending">
      <p>
        <span className="font-semibold">{t.title(what)}</span> {t.expected(expected)}
      </p>
      <div>
        <Button variant="secondary" onClick={onConfirm}>
          {t.confirm}
          <span className="sr-only"> {what}</span>
        </Button>
      </div>
    </div>
  );
}

/** RF-14: marca de un dato raro que ya se confirmó. */
export function UnusualMark() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-warning" data-unusual="confirmed">
      <Icon name="warning" size={16} />
      {es.common.unusual.mark}
    </span>
  );
}

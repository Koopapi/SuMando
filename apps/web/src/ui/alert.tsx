import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "error";

const TONE: Record<Tone, string> = {
  info: "bg-brand-50 text-brand-800 border-brand-100",
  success: "bg-success-100 text-success-700 border-success-100",
  warning: "bg-warning-100 text-warning-700 border-warning-100",
  error: "bg-danger-100 text-danger-700 border-danger-100",
};

/** Aviso en línea. Los errores se anuncian con `role="alert"`; el resto con `role="status"`. */
export function Alert({ tone = "info", title, children, className = "" }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${TONE[tone]} ${className}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : ""}>{children}</div> : null}
    </div>
  );
}

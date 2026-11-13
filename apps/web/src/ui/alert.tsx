import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "error";

const TONE: Record<Tone, string> = {
  info: "bg-primary-soft text-primary border-primary-soft",
  success: "bg-success-soft text-success border-success-soft",
  warning: "bg-warning-soft text-warning border-warning-soft",
  error: "bg-danger-soft text-danger border-danger-soft",
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

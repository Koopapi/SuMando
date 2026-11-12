"use client";

// Avisos flotantes (spec 002, RF-27 y RF-28): el de guardado se va solo a los 4 s; el de error se queda hasta que
// el usuario lo cierra. Un solo proveedor en el diseño raíz.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { es } from "@/i18n";
import { Icon } from "./icons";

export const TOAST_SUCCESS_MS = 4000;

interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fuera de ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: Toast["kind"], message: string) => {
      const id = next.current++;
      setToasts((ts) => [...ts.filter((t) => t.kind !== kind || t.message !== message), { id, kind, message }]);
      if (kind === "success") setTimeout(() => dismiss(id), TOAST_SUCCESS_MS);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(() => ({ success: (m) => push("success", m), error: (m) => push("error", m) }), [push]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <section aria-label={es.common.notifications} className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-auto lg:w-96">
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {toasts
            .filter((t) => t.kind === "success")
            .map((t) => (
              <div key={t.id} data-testid="toast-success" className="pointer-events-auto flex min-h-12 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-lg">
                <Icon name="success" className="text-success" />
                {t.message}
              </div>
            ))}
        </div>
        <div role="alert" className="flex flex-col gap-2">
          {toasts
            .filter((t) => t.kind === "error")
            .map((t) => (
              <div key={t.id} data-testid="toast-error" className="pointer-events-auto flex min-h-12 items-center gap-3 rounded-lg border border-danger bg-danger-soft py-1 pr-1 pl-4 text-sm font-semibold text-danger shadow-lg">
                <Icon name="alert" />
                <span className="flex-1">{t.message}</span>
                <button type="button" aria-label={es.common.dismiss} onClick={() => dismiss(t.id)} className="inline-flex size-11 items-center justify-center rounded-md hover:bg-danger-soft">
                  <Icon name="close" />
                </button>
              </div>
            ))}
        </div>
      </section>
    </ToastContext.Provider>
  );
}

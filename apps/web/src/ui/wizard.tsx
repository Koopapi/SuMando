"use client";

// Asistente por pasos (spec 002, RF-34 a RF-36). El estado de lo capturado vive en quien lo usa, así que volver a
// un paso anterior no pierde nada; mientras haya datos sin terminar, salir pide confirmación.
import { useEffect, useState, type ReactNode } from "react";
import { es } from "@/i18n";
import { Button } from "./button";
import { Dial } from "./dial";
import { Dialog } from "./dialog";
import { Icon } from "./icons";

export interface WizardStep {
  id: string;
  title: string;
  content: ReactNode;
  canContinue?: boolean;
}

export function Wizard({ steps, dirty, onExit, onFinish }: { steps: WizardStep[]; dirty: boolean; onExit: () => void; onFinish: () => void }) {
  const t = es.common;
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState<null | (() => void)>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // Enlaces internos de la app (menú, logo): se detienen y se pide confirmar antes de salir.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      setConfirm(() => () => window.location.assign(a.href));
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const exit = () => (dirty ? setConfirm(() => onExit) : onExit());

  return (
    <div className="flex flex-col gap-4" data-step={step.id}>
      <div className="flex items-center gap-3">
        <Dial value={(index + 1) / steps.length} label={t.step(index + 1, steps.length)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase" data-testid="wizard-progress">
            {t.step(index + 1, steps.length)}
          </p>
          <h2 className="font-brand text-xl font-bold">{step.title}</h2>
        </div>
        <button type="button" aria-label={t.exit} onClick={exit} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line-strong hover:bg-primary-soft">
          <Icon name="close" />
        </button>
      </div>
      <div>{step.content}</div>
      <div className="sticky bottom-(--nav-space) -mx-4 flex gap-3 border-t border-line-strong bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0">
        <Button variant="secondary" full disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          {t.previous}
        </Button>
        <Button full disabled={step.canContinue === false} onClick={() => (last ? onFinish() : setIndex((i) => i + 1))}>
          {last ? t.finish : t.next}
        </Button>
      </div>
      <Dialog open={confirm !== null} title={t.exitTitle} onClose={() => setConfirm(null)}>
        <p className="text-ink-muted">{t.exitBody}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            {t.keepGoing}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const go = confirm;
              setConfirm(null);
              go?.();
            }}
          >
            {t.exit}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

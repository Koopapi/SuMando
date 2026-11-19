"use client";

// Asistente por pasos (spec 002, RF-34 a RF-36; ampliado en la spec 015, RF-1 a RF-7 y RF-24). El estado de lo
// capturado vive en quien lo usa, así que volver a un paso anterior no pierde nada. Cada paso puede llevar una
// indicación de una frase y un ejemplo; con `review`, el asistente termina con un paso «Resumen» que muestra lo de
// cada paso con «Cambiar». El paso puede ser controlado (`index`) para volver al que tiene un error o retomar.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { es } from "@/i18n";
import { Button } from "./button";
import { Dial } from "./dial";
import { Dialog } from "./dialog";
import { Icon } from "./icons";

export interface WizardStep {
  id: string;
  title: string;
  content: ReactNode;
  /** false deshabilita «Siguiente» (spec 002). */
  canContinue?: boolean;
  /** RF-5: al tocar «Siguiente»; false no avanza (el paso muestra sus mensajes). Puede esperar al servidor. */
  validate?: () => boolean | Promise<boolean>;
  /** RF-2: qué hacer, en una frase. */
  hint?: string;
  /** RF-3: ejemplo con datos del negocio. */
  example?: string;
  /** RF-7: lo capturado en este paso, para el resumen; sin él, el paso no aparece en el resumen. */
  summary?: ReactNode;
}

export interface WizardReview {
  /** Lo que va al final del resumen (avisos, totales). */
  extra?: ReactNode;
  /** Texto del botón que registra (por defecto «Confirmar»). */
  confirmLabel?: string;
  busy?: boolean;
  /** RF-21: false no deja confirmar. */
  canConfirm?: boolean;
}

export interface WizardProps {
  steps: WizardStep[];
  dirty: boolean;
  onExit: () => void;
  onFinish: () => void;
  /** Paso controlado (índice dentro de los pasos más el resumen, si lo hay). */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** RF-7: añade el paso «Resumen» al final. */
  review?: WizardReview;
  /** RF-24: «Vista completa»; quien lo usa guarda lo capturado y cambia de pantalla. */
  onFullView?: () => void;
  /** Con borrador guardado en el servidor, salir no pierde nada y no pide confirmar. */
  saved?: boolean;
}

export function Wizard({ steps, dirty, onExit, onFinish, index: controlled, onIndexChange, review, onFullView, saved }: WizardProps) {
  const t = es.common;
  const [own, setOwn] = useState(0);
  const [confirm, setConfirm] = useState<null | (() => void)>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const all: WizardStep[] = review ? [...steps, { id: "summary", title: t.summaryTitle, hint: t.summaryHint, content: <Review steps={steps} extra={review.extra} onChange={(i) => go(i)} /> }] : steps;
  const index = Math.min(controlled ?? own, all.length - 1);
  const step = all[index];
  const last = index === all.length - 1;
  const guard = dirty && !saved;

  function go(i: number) {
    if (controlled === undefined) setOwn(i);
    onIndexChange?.(i);
  }

  // Al cambiar de paso, el foco va al título para que el lector de pantalla lo anuncie (RF-1, accesibilidad).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
    window.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => {
    if (!guard) return;
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
  }, [guard]);

  const [checking, setChecking] = useState(false);
  const exit = () => (guard ? setConfirm(() => onExit) : onExit());
  const next = async () => {
    if (step.validate) {
      setChecking(true);
      const ok = await step.validate();
      setChecking(false);
      if (!ok) return;
    }
    if (last) onFinish();
    else go(index + 1);
  };
  const isReview = review !== undefined && last;
  const disabled = isReview ? review.busy || review.canConfirm === false : step.canContinue === false;

  return (
    <div className="flex flex-col gap-4" data-step={step.id}>
      <div className="flex items-center gap-3">
        <Dial value={(index + 1) / all.length} label={t.step(index + 1, all.length)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase" data-testid="wizard-progress">
            {t.step(index + 1, all.length)}
          </p>
          <h2 ref={heading} tabIndex={-1} className="font-brand text-xl font-bold outline-none">
            <span className="sr-only">{t.step(index + 1, all.length)}: </span>
            {step.title}
          </h2>
        </div>
        <button type="button" aria-label={t.exit} onClick={exit} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line-strong hover:bg-primary-soft">
          <Icon name="close" />
        </button>
      </div>
      {step.hint || step.example ? (
        <div className="flex flex-col gap-1" data-testid="wizard-hint">
          {step.hint ? <p>{step.hint}</p> : null}
          {step.example ? <p className="text-sm text-ink-muted">{t.examplePrefix} {step.example}</p> : null}
        </div>
      ) : null}
      <div className="min-w-0">{step.content}</div>
      {onFullView ? (
        <div>
          <Button variant="ghost" onClick={onFullView}>
            {t.fullView}
          </Button>
        </div>
      ) : null}
      <div className="sticky bottom-(--nav-space) -mx-4 flex gap-3 border-t border-line-strong bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0">
        <Button variant="secondary" full disabled={index === 0} onClick={() => go(index - 1)}>
          {t.previous}
        </Button>
        <Button full disabled={disabled} loading={checking || (isReview && review.busy)} onClick={() => void next()}>
          {isReview ? (review.confirmLabel ?? t.confirm) : last ? t.finish : t.next}
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

/** RF-7: lo capturado en cada paso, con «Cambiar» para volver a él. */
function Review({ steps, extra, onChange }: { steps: WizardStep[]; extra?: ReactNode; onChange: (index: number) => void }) {
  const t = es.common;
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col">
        {steps.map((s, i) =>
          s.summary === undefined ? null : (
            <div key={s.id} className="flex flex-col gap-1 border-b border-line py-3" data-summary={s.id}>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sm font-semibold text-ink-muted">{s.title}</dt>
                <Button variant="ghost" onClick={() => onChange(i)}>
                  {t.change}
                  <span className="sr-only"> {s.title}</span>
                </Button>
              </div>
              <dd className="min-w-0">{s.summary}</dd>
            </div>
          ),
        )}
      </dl>
      {extra}
    </div>
  );
}

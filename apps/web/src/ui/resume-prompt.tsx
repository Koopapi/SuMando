"use client";

// «Continuar donde te quedaste» (spec 015, RF-18, RF-20): hay un asistente a medias de esta tarea.
import { es } from "@/i18n";
import { Button } from "./button";
import { formatDateTime } from "./format";

export function ResumePrompt({ updatedAt, stepTitle, onContinue, onRestart, busy }: { updatedAt: Date; stepTitle: string; onContinue: () => void; onRestart: () => void; busy?: boolean }) {
  const t = es.common.resume;
  return (
    <section aria-labelledby="resume-title" className="flex flex-col gap-3 rounded-lg border border-line-strong bg-surface p-4" data-testid="resume-prompt">
      <h2 id="resume-title" className="font-brand text-lg font-bold">
        {t.title}
      </h2>
      <p className="text-ink-muted">{t.body(formatDateTime(updatedAt), stepTitle)}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onContinue} disabled={busy}>
          {t.continue}
        </Button>
        <Button variant="secondary" onClick={onRestart} disabled={busy}>
          {t.restart}
        </Button>
      </div>
    </section>
  );
}

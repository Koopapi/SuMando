"use client";

// Cancelar con motivo escrito (spec 005, RF-36, RF-64): un diálogo con el motivo y la confirmación.
import { useState } from "react";
import { es } from "@/i18n";
import { Alert, Button, Dialog, TextArea } from "@/ui";
import { api } from "../api";

const t = es.inventory;

export function ReasonDialog({ open, title, intro, path, onClose, onDone }: { open: boolean; title: string; intro: string; path: string; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    const result = await api(path, { body: { reason: String(new FormData(form).get("reason") ?? "") } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onDone();
  }
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <p className="text-sm text-ink-muted">{intro}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <TextArea label={t.cancelReason} name="reason" rows={2} maxLength={200} hint={t.cancelReasonHint} required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t.keep}
          </Button>
          <Button type="submit" variant="danger" loading={busy}>
            {t.confirmCancel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

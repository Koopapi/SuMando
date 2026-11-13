"use client";

// Spec 008 RF-13 a RF-35, RF-40 a RF-42: el expediente. Los administradores suben documentos y ven su estado; el
// sueldo, los archivos y el registro solo aparecen en la vista del dueño (los arma el servidor).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { EmployeeDetailView, EmployeeDocumentView } from "@/server/services/personnel/views";
import { Alert, Button, Dialog, FileField, MoneyField, PageHeader, SectionLabel, SelectField, StatusBadge, TextArea, TextField, formatDateTime, formatMoney, useToast } from "@/ui";
import { api, formValues } from "../api";
import { showDate } from "./dates";

const t = es.personnel;
const TONE = { delivered: "success", missing: "warning", expired: "danger" } as const;

type Modal =
  | { kind: "edit" | "terminate" | "rehire" | "move" }
  | { kind: "upload"; doc: EmployeeDocumentView; replace: boolean }
  | { kind: "retire"; fileId: string; name: string }
  | null;

export function EmployeeDetail({ employee: e, positions, today }: { employee: EmployeeDetailView; positions: { id: string; name: string }[]; today: string }) {
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("resignation");

  async function call(path: string, body: unknown, method = "POST", done?: () => void) {
    setBusy(true);
    setError(null);
    const result = await api(path, { method, body });
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    setModal(null);
    done?.();
    router.refresh();
  }

  async function upload(form: HTMLFormElement, doc: EmployeeDocumentView, replace: boolean) {
    const data = new FormData(form);
    if (replace) data.set("replace", "1");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${e.id}/documents/${doc.typeId}`, { method: "POST", body: data });
      const body = await res.json().catch(() => null);
      setBusy(false);
      if (!res.ok) return setError(body?.error?.message ?? es.common.unknownError);
    } catch {
      setBusy(false);
      return setError(es.common.unknownError);
    }
    setModal(null);
    toast.success(t.uploaded);
    router.refresh();
  }

  const open = e.periods.find((p) => p.leftOn === null);
  return (
    <>
      <Link href="/personal" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.back}
      </Link>
      <PageHeader
        title={e.name}
        subtitle={t.branchLine(e.position, e.branch.name)}
        action={
          <span className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => (setError(null), setModal({ kind: "edit" }))}>
              {t.edit}
            </Button>
            {e.active ? (
              <Button variant="secondary" onClick={() => (setError(null), setModal({ kind: "terminate" }))}>
                {t.terminate}
              </Button>
            ) : (
              <Button onClick={() => (setError(null), setModal({ kind: "rehire" }))}>{t.rehire}</Button>
            )}
          </span>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {!e.active ? <StatusBadge tone="neutral">{t.inactiveBadge}</StatusBadge> : null}
        <span className="text-sm">{t.docSummary(e.docs.ok, e.docs.total)}</span>
      </div>
      {error && !modal ? <Alert tone="error">{error}</Alert> : null}
      <dl className="grid gap-x-8 gap-y-2 text-sm lg:grid-cols-3">
        <div>
          <dt className="font-semibold text-ink-muted">{t.phone}</dt>
          <dd>{e.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-muted">{t.hiredOn}</dt>
          <dd>{showDate(open?.hiredOn ?? e.periods.at(-1)?.hiredOn ?? null)}</dd>
        </div>
        {e.notes ? (
          <div className="lg:col-span-3">
            <dt className="font-semibold text-ink-muted">{t.notes}</dt>
            <dd className="whitespace-pre-line">{e.notes}</dd>
          </div>
        ) : null}
      </dl>

      {e.owner ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            void call(`/api/employees/${e.id}/pay`, { dailyPay: formValues(ev.currentTarget).dailyPay });
          }}
        >
          <MoneyField key={e.pay ?? ""} label={t.pay} name="dailyPay" hint={e.pay ? formatMoney(Number(e.pay)) : t.noPay} defaultValue={e.pay ?? ""} className="min-w-0 flex-1 lg:max-w-xs" />
          <Button type="submit" variant="secondary" loading={busy}>
            {t.setPay}
          </Button>
        </form>
      ) : null}

      <section aria-label={t.documents} className="flex flex-col gap-2">
        <SectionLabel as="h2">{t.documents}</SectionLabel>
        <ul className="flex flex-col">
          {e.documents.map((d) => (
            <li key={d.typeId} className="flex flex-col gap-2 border-b border-line py-3" data-testid="employee-document">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-semibold">{d.name}</span>
                {!d.required ? <StatusBadge tone="neutral">{t.optional}</StatusBadge> : null}
                <StatusBadge tone={TONE[d.status]}>{t.statuses[d.status]}</StatusBadge>
              </div>
              <p className="text-sm text-ink-muted">
                {[d.count ? t.files(d.count) : null, d.issuedOn ? t.issuedLine(showDate(d.issuedOn)) : null, d.validityMonths ? t.validity(d.validityMonths) : null].filter(Boolean).join(" · ")}
              </p>
              {d.files?.length ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {d.files.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center gap-2">
                      <a href={`/api/employee-files/${f.id}`} target="_blank" rel="noopener" className={`font-semibold ${f.replacedAt || f.retiredAt ? "text-ink-muted" : "text-primary"} hover:underline`} aria-label={t.openFile(f.name)}>
                        {f.name}
                      </a>
                      <span className="text-ink-muted">{t.uploadedLine(f.uploadedBy, formatDateTime(new Date(f.uploadedAt)))}</span>
                      {f.replacedAt ? <StatusBadge tone="neutral">{t.replacedTag}</StatusBadge> : null}
                      {f.retiredAt ? <span className="text-ink-muted">{t.retiredTag(f.retireReason ?? "")}</span> : null}
                      {!f.replacedAt && !f.retiredAt ? (
                        <Button variant="ghost" aria-label={t.retireFile(f.name)} onClick={() => (setError(null), setModal({ kind: "retire", fileId: f.id, name: f.name }))}>
                          {t.retire}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" aria-label={t.uploadFor(d.name)} onClick={() => (setError(null), setModal({ kind: "upload", doc: d, replace: false }))}>
                  {t.upload}
                </Button>
                {d.count ? (
                  <Button variant="ghost" aria-label={t.replaceFor(d.name)} onClick={() => (setError(null), setModal({ kind: "upload", doc: d, replace: true }))}>
                    {t.replace}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t.periods} className="flex flex-col gap-2">
        <SectionLabel as="h2">{t.periods}</SectionLabel>
        <ul className="flex flex-col gap-1 text-sm">
          {e.periods.map((p, i) => (
            <li key={i}>
              {t.periodLine(showDate(p.hiredOn), p.leftOn ? showDate(p.leftOn) : null)}
              {p.reason ? ` · ${t.reasons[p.reason]}${p.note ? `: ${p.note}` : ""}` : ""}
            </li>
          ))}
        </ul>
        {e.active && e.moveTo.length ? (
          <Button variant="ghost" className="self-start" onClick={() => (setError(null), setModal({ kind: "move" }))}>
            {t.move}
          </Button>
        ) : null}
      </section>

      {e.history ? (
        <section aria-label={t.history} className="flex flex-col gap-2">
          <SectionLabel as="h2">{t.history}</SectionLabel>
          <ol className="flex flex-col gap-1 text-sm" data-testid="employee-history">
            {e.history.map((h, i) => (
              <li key={i}>{t.historyLine(t.actions[h.action] ?? h.action, h.actor, formatDateTime(new Date(h.at)))}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <Dialog open={modal?.kind === "edit"} title={t.editTitle} onClose={() => setModal(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            const v = formValues(ev.currentTarget);
            void call(`/api/employees/${e.id}`, { name: v.name, positionId: v.positionId, phone: v.phone, notes: v.notes, ...(open ? { hiredOn: v.hiredOn } : {}) }, "PATCH");
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextField label={t.name} name="name" required maxLength={80} defaultValue={e.name} />
          <SelectField label={t.position} name="positionId" defaultValue={e.positionId} options={[...positions, ...(positions.some((p) => p.id === e.positionId) ? [] : [{ id: e.positionId, name: e.position }])].map((p) => ({ value: p.id, label: p.name }))} />
          {open ? <TextField label={t.hiredOn} name="hiredOn" type="date" required defaultValue={open.hiredOn} /> : null}
          <TextField label={t.phone} name="phone" type="tel" maxLength={30} defaultValue={e.phone ?? ""} />
          <TextArea label={t.notes} name="notes" rows={2} maxLength={500} defaultValue={e.notes ?? ""} />
          <Footer busy={busy} onCancel={() => setModal(null)} />
        </form>
      </Dialog>

      <Dialog open={modal?.kind === "terminate"} title={t.terminateTitle} onClose={() => setModal(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            const v = formValues(ev.currentTarget);
            void call(`/api/employees/${e.id}/terminate`, { leftOn: v.leftOn, reason, note: v.note });
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextField label={t.leftOn} name="leftOn" type="date" required defaultValue={today} />
          <SelectField label={t.reason} value={reason} onChange={(ev) => setReason(ev.target.value)} options={Object.entries(t.reasons).map(([value, label]) => ({ value, label }))} />
          <TextArea label={reason === "other" ? t.noteRequired : t.note} name="note" rows={2} maxLength={200} hint={t.reasonHint} required={reason === "other"} />
          <Footer busy={busy} onCancel={() => setModal(null)} danger />
        </form>
      </Dialog>

      <Dialog open={modal?.kind === "rehire"} title={t.rehireTitle} onClose={() => setModal(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            void call(`/api/employees/${e.id}/rehire`, { hiredOn: formValues(ev.currentTarget).hiredOn });
          }}
        >
          <p className="text-sm text-ink-muted">{t.rehireIntro}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextField label={t.hiredOn} name="hiredOn" type="date" required defaultValue={today} />
          <Footer busy={busy} onCancel={() => setModal(null)} />
        </form>
      </Dialog>

      <Dialog open={modal?.kind === "move"} title={t.moveTitle} onClose={() => setModal(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const v = formValues(ev.currentTarget);
            setBusy(true);
            setError(null);
            const result = await api(`/api/employees/${e.id}/move`, { body: { branchId: v.branchId, on: v.on } });
            setBusy(false);
            if (!result.ok) return setError(result.error.message);
            toast.success(t.moved);
            router.push("/personal");
          }}
        >
          <p className="text-sm text-ink-muted">{t.moveIntro}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <SelectField label={t.moveTo} name="branchId" options={e.moveTo.map((b) => ({ value: b.id, label: b.name }))} />
          <TextField label={t.moveOn} name="on" type="date" required defaultValue={today} />
          <Footer busy={busy} onCancel={() => setModal(null)} />
        </form>
      </Dialog>

      {modal?.kind === "upload" ? (
        <Dialog open title={modal.replace ? t.replaceTitle(modal.doc.name) : t.uploadTitle(modal.doc.name)} onClose={() => setModal(null)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              void upload(ev.currentTarget, modal.doc, modal.replace);
            }}
          >
            {error ? <Alert tone="error">{error}</Alert> : null}
            <FileField label={t.fileLabel} name="file" hint={t.fileHint} accept="image/*,application/pdf" multiple required />
            {modal.doc.validityMonths ? <TextField label={t.issuedOn} name="issuedOn" type="date" required defaultValue={today} /> : null}
            <Footer busy={busy} onCancel={() => setModal(null)} label={modal.replace ? t.replace : t.upload} />
          </form>
        </Dialog>
      ) : null}

      {modal?.kind === "retire" ? (
        <Dialog open title={t.retireTitle} onClose={() => setModal(null)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              void call(`/api/employee-files/${modal.fileId}/retire`, { reason: formValues(ev.currentTarget).reason });
            }}
          >
            <p className="text-sm text-ink-muted">{t.retireIntro}</p>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <TextArea label={t.reason} name="reason" rows={2} maxLength={200} hint={t.reasonHint} required />
            <Footer busy={busy} onCancel={() => setModal(null)} danger label={t.retire} />
          </form>
        </Dialog>
      ) : null}
    </>
  );
}

function Footer({ busy, onCancel, danger = false, label = t.save }: { busy: boolean; onCancel: () => void; danger?: boolean; label?: string }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel}>
        {t.cancel}
      </Button>
      <Button type="submit" variant={danger ? "danger" : "primary"} loading={busy}>
        {label}
      </Button>
    </div>
  );
}

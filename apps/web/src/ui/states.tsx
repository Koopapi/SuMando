import type { ReactNode } from "react";
import { es } from "@/i18n";
import { Dial } from "./dial";
import { Icon, type IconName } from "./icons";

/** Estados de una lista o tabla (RF-29): siempre con texto, nunca solo un dibujo. */
function Panel({ icon, title, description, action, children }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface px-5 py-8 text-center">
      {icon}
      {children}
      <p className="font-semibold text-ink">{title}</p>
      {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

const iconFor = (name: IconName, tone: string) => <Icon name={name} size={28} className={tone} />;

export function LoadingState({ label = es.common.loading }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" data-state="loading">
      <Panel title={label} icon={<Dial value={0.6} spinning />}>
        <div aria-hidden className="flex w-full max-w-64 flex-col items-center gap-2">
          <span className="h-3 w-full animate-pulse rounded-full bg-line" />
          <span className="h-3 w-3/4 animate-pulse rounded-full bg-line" />
        </div>
      </Panel>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div data-state="empty">
      <Panel icon={iconFor("searchX", "text-ink-muted")} title={title} description={description} action={action} />
    </div>
  );
}

export function ErrorState({ title = es.common.listErrorTitle, description = es.common.listErrorBody, action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div role="alert" data-state="error">
      <Panel icon={iconFor("wifiOff", "text-danger")} title={title} description={description} action={action} />
    </div>
  );
}

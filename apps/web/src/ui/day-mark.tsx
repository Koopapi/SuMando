"use client";

// Un día de la semana de nómina (spec 009, RF-13, RF-14): arriba el estado (sin marcar, trabajó, media jornada con una barra a la mitad), que
// cambia con un toque; abajo el retardo. Cada uno mide 44 × 44 px; el estado se dice con texto, no solo con color.
type State = "empty" | "worked" | "half";

const LOOK: Record<State, string> = {
  empty: "border border-line-strong bg-surface text-ink-muted",
  worked: "border border-primary bg-primary text-on-primary",
  half: "border border-primary bg-primary-soft text-primary",
};

export function DayMark({
  day,
  state,
  late,
  editable,
  busy = false,
  stateLabel,
  lateLabel,
  lateMark,
  onState,
  onLate,
}: {
  /** Letra del día («L»). */
  day: string;
  state: State;
  late: boolean;
  editable: boolean;
  busy?: boolean;
  /** Nombre accesible del botón del día, con persona, día y estado. */
  stateLabel: string;
  lateLabel: string;
  /** Texto visible del retardo («R»). */
  lateMark: string;
  onState: () => void;
  onLate: () => void;
}) {
  const off = !editable || busy;
  return (
    <span className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={stateLabel}
        aria-busy={busy || undefined}
        disabled={off}
        onClick={onState}
        data-state={state}
        className={`flex size-11 flex-col items-center justify-center rounded-md font-brand text-sm leading-none font-bold transition disabled:cursor-not-allowed ${LOOK[state]} ${!editable ? "opacity-40" : ""}`}
      >
        <span>{day}</span>
        {state === "half" ? <span aria-hidden className="mt-1 h-1 w-4 rounded-full bg-primary" /> : null}
      </button>
      <button
        type="button"
        aria-label={lateLabel}
        aria-pressed={late}
        disabled={off || state === "empty"}
        onClick={onLate}
        className={`flex size-11 items-center justify-center rounded-md text-xs font-bold transition disabled:cursor-not-allowed ${late ? "bg-warning-soft text-warning border border-warning" : "border border-dashed border-line text-ink-muted"} ${off || state === "empty" ? "opacity-40" : ""}`}
      >
        {late ? lateMark : ""}
      </button>
    </span>
  );
}

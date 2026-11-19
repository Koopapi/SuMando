// Vistas de la nómina (spec 009). Los campos en pesos solo van en las vistas del dueño (RF-5); el administrador
// recibe la misma semana sin ningún monto.
export type DayView = { state: "empty" | "worked" | "half"; late: boolean; editable: boolean };

export interface LoanLineView {
  id: string;
  lentOn: string;
  amount: string;
  balance: string;
  payment: string;
}

export interface PayrollRowView {
  employeeId: string;
  name: string;
  position: string;
  days: DayView[];
  counts: { days: number; half: number; late: number };
  /** Solo para el dueño. */
  money?: {
    pay: string | null;
    missingPay: boolean;
    days: string;
    extras: string;
    bonus: string;
    bonusConcept: string | null;
    late: string;
    meal: string;
    loans: string;
    loanLines: LoanLineView[];
    gross: string;
    deductions: string;
    net: string;
    negative: boolean;
  };
}

export interface PayrollTotalsView {
  days: string;
  extrasBonus: string;
  late: string;
  meal: string;
  loans: string;
  net: string;
}

export interface PayrollWeekView {
  start: string;
  end: string;
  dates: string[];
  today: string;
  status: "open" | "closed";
  closedAt: string | null;
  owner: boolean;
  groups: { position: string; rows: PayrollRowView[] }[];
  /** Solo para el dueño (RF-25). */
  totals?: PayrollTotalsView;
  prev: string;
  next: string;
}

export interface PayrollWeekSummaryView {
  start: string;
  end: string;
  status: "open" | "closed";
  people: number;
  /** Solo para el dueño (RF-46). */
  total?: string;
}

/** Billetes y monedas de un sobre (spec 009, RF-41); `cents` y `leftover` en centavos, como texto. */
export interface CashView {
  pieces: { cents: string; count: number }[];
  leftover: string;
}

/** Spec 015, RF-39: la semana como quedaría al cerrar con lo capturado en el asistente, sin guardar. */
export interface ClosePreviewView {
  week: PayrollWeekView;
  cash: Record<string, CashView>;
  totalCash: CashView;
  /** Lo que impediría cerrar, ya en español. */
  problems: string[];
}

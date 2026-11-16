// Alertas del tablero que se deciden sin base de datos (spec 012, RF-43, RF-44).
import { addDays, weekOf } from "../payroll/week";

export interface UnclosedInput {
  today: string;
  /** Lunes de la primera semana con captura de la sucursal; null si nunca hubo captura. */
  firstMonday: string | null;
  closed: Set<string>;
  /** Si algún empleado con sueldo tenía un periodo de trabajo que toca la semana. */
  staffed: (monday: string) => boolean;
}

/** RF-43: semanas terminadas (su domingo antes de hoy) sin cerrar, desde la primera captura. */
export function unclosedWeeks(input: UnclosedInput): string[] {
  if (!input.firstMonday) return [];
  const lastEnded = addDays(weekOf(input.today), -7);
  const out: string[] = [];
  for (let m = weekOf(input.firstMonday); m <= lastEnded; m = addDays(m, 7)) if (!input.closed.has(m) && input.staffed(m)) out.push(m);
  return out;
}

/** RF-44: alguna diferencia por forma de pago distinta de cero (la total es su suma). */
export const cutHasDifference = (differences: bigint[]) => differences.some((d) => d !== 0n);

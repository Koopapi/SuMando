// Periodo del tablero desde la dirección (spec 012, RF-11, RF-12).
import type { PeriodInput } from "@/domain/reports/period";

export const periodQuery = (request: Request): PeriodInput => {
  const q = new URL(request.url).searchParams;
  return { period: q.get("period") ?? undefined, from: q.get("from") ?? undefined, to: q.get("to") ?? undefined };
};

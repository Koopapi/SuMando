// Dirección del tablero (spec 012): el periodo y la sección abierta viven en `?periodo=…&desde=…&hasta=…&seccion=…`.
export interface DashboardQuery {
  periodo?: string;
  desde?: string;
  hasta?: string;
  seccion?: string;
}

export function dashboardHref(q: DashboardQuery): string {
  const params = new URLSearchParams();
  if (q.periodo && q.periodo !== "today") params.set("periodo", q.periodo);
  if (q.periodo === "range" && q.desde) params.set("desde", q.desde);
  if (q.periodo === "range" && q.hasta) params.set("hasta", q.hasta);
  if (q.seccion) params.set("seccion", q.seccion);
  const s = params.toString();
  return s ? `/tablero?${s}` : "/tablero";
}

/** Mismo periodo, para las rutas de la API (exportar). */
export function apiPeriod(q: DashboardQuery): string {
  const params = new URLSearchParams();
  params.set("period", q.periodo ?? "today");
  if (q.periodo === "range") {
    params.set("from", q.desde ?? "");
    params.set("to", q.hasta ?? "");
  }
  return params.toString();
}

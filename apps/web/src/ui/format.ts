// Formato de pesos y fechas para la interfaz (spec 002, RF-23 y RF-24). Las fechas siempre en la hora de la Ciudad de
// México, sin importar la zona del servidor o del navegador.
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dateParts = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

/** «$1,234.50». */
export function formatMoney(value: number): string {
  return money.format(value);
}

/** «11 nov 2026»: día, mes abreviado sin punto y año. */
export function formatDate(date: Date): string {
  const parts = Object.fromEntries(dateParts.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.day} ${String(parts.month).replace(".", "")} ${parts.year}`;
}

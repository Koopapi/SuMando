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

/** Cantidad exacta que llega como texto («8295.5»): con separador de miles y sin tocar los decimales («8,295.5»). */
export function formatQuantity(text: string): string {
  const [int, frac] = text.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

const time = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Mexico_City" });

/** «13 nov 2026, 18:05»: fecha y hora de la Ciudad de México (spec 004, historial). */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${time.format(date)}`;
}

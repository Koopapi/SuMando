// Normalización de correos y nombres (RF-9, RF-19, RF-20). Reglas puras: sin Next ni BD.
export const NAME_MAX = 60;
export const EMAIL_MAX = 254;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Nombre tal como se muestra: sin espacios exteriores y con los internos reducidos a uno. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Clave de unicidad: el nombre normalizado en minúsculas. */
export function nameKey(raw: string): string {
  return normalizeName(raw).normalize("NFKC").toLowerCase();
}

export type NameProblem = "empty" | "too_long";

export function nameProblem(raw: string): NameProblem | null {
  const name = normalizeName(raw);
  if (!name) return "empty";
  if (name.length > NAME_MAX) return "too_long";
  return null;
}

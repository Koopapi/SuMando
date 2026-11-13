// Validación de entrada común a varios servicios: el nombre normalizado o el correo normalizado, o un AppError.
import { isValidEmail, nameProblem, normalizeEmail, normalizeName, NAME_MAX } from "@/domain/text";
import { AppError } from "../errors";

export function assertValidName(raw: string): string {
  if (nameProblem(raw)) throw new AppError("name_invalid", { max: NAME_MAX });
  return normalizeName(raw);
}

export function assertValidEmail(raw: string): string {
  const email = normalizeEmail(raw);
  if (!isValidEmail(email)) throw new AppError("validation");
  return email;
}

/** Una violación de índice único de PostgreSQL (dos altas simultáneas con el mismo nombre o correo). */
export function isUniqueViolation(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  // Drizzle puede envolver el error del controlador: se mira también su causa.
  return (e as { code?: string }).code === "23505" || isUniqueViolation((e as { cause?: unknown }).cause);
}

// Textos de la interfaz, solo en español (constitución, principio 11). Ningún componente escribe texto suelto:
// `src/i18n/i18n.test.ts` lo comprueba.
import { auth } from "./es/auth";
import { businesses } from "./es/businesses";
import { common } from "./es/common";
import { errors } from "./es/errors";
import { home } from "./es/home";
import { offline } from "./es/offline";
import { people } from "./es/people";
import { shell } from "./es/shell";
import { system } from "./es/system";

export const es = { auth, businesses, common, errors, home, offline, people, shell, system } as const;
export type Dictionary = typeof es;
export type ErrorCode = keyof typeof errors;

/** Mensaje en español de un código de error, con sus parámetros si los lleva. */
export function translateError(code: string, params?: Record<string, unknown>): string {
  const entry = (errors as Record<string, string | ((p: never) => string)>)[code];
  if (typeof entry === "function") return entry((params ?? {}) as never);
  return entry ?? common.unknownError;
}

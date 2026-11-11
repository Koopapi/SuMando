// Textos de la interfaz, solo en español (constitución, principio 11). Ningún componente escribe texto suelto:
// `src/i18n/i18n.test.ts` lo comprueba.
import { common } from "./es/common";
import { errors } from "./es/errors";
import { system } from "./es/system";

export const es = { common, errors, system } as const;
export type Dictionary = typeof es;
export type ErrorCode = keyof typeof errors;

/** Mensaje en español de un código de error, con sus parámetros si los lleva. */
export function translateError(code: string, params?: Record<string, unknown>): string {
  const entry = (errors as Record<string, string | ((p: never) => string)>)[code];
  if (typeof entry === "function") return entry((params ?? {}) as never);
  return entry ?? common.unknownError;
}

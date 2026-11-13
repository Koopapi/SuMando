// Utilidades de los handlers de `app/api`: leer JSON validado, responder errores con código y mensaje en español.
import { ZodError, type ZodType } from "zod";
import { devEndpointsEnabled } from "./clock";
import { AppError, isAppError } from "./errors";

export const MAX_BODY_BYTES = 16 * 1024;

export function errorResponse(error: AppError) {
  return Response.json(error.toJSON(), { status: error.status });
}

/** Lee el cuerpo JSON (máximo 16 KB) y lo valida; cualquier fallo es `validation` (422). */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new AppError("validation");
  let raw: unknown = {};
  if (text.trim()) {
    try {
      raw = JSON.parse(text);
    } catch {
      throw new AppError("validation");
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new AppError("validation");
  return parsed.data;
}

/** Las rutas de desarrollo (/api/dev/*) no existen sin DEV_ENDPOINTS=1. */
export function requireDevEndpoints() {
  if (!devEndpointsEnabled()) throw new AppError("dev_only");
}

/** Envuelve un handler: los `AppError` salen como JSON con su estado; lo inesperado, como 500 sin detalles. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (isAppError(e)) return errorResponse(e);
      if (e instanceof ZodError) return errorResponse(new AppError("validation"));
      console.error(e);
      return Response.json({ error: { code: "internal", message: "Algo salió mal. Inténtalo de nuevo." } }, { status: 500 });
    }
  };
}

// Cliente mínimo de la API para los componentes de cliente: devuelve el error del servidor con su mensaje en español.
import { es } from "@/i18n";

export interface ApiError {
  code: string;
  message: string;
  params?: Record<string, string | number>;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const fallback: ApiError = { code: "network", message: es.common.unknownError };
  try {
    const res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (res.status === 204) return { ok: true, data: undefined as T };
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data?.error ?? fallback };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: fallback };
  }
}

export function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));
}

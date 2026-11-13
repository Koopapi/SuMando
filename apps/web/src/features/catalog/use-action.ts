"use client";

// Acciones del catálogo: llaman a la API, muestran el error del servidor y refrescan la pantalla al terminar.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../api";

export function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run<T>(path: string, init: { method?: string; body?: unknown } = { method: "POST" }): Promise<T | null> {
    setBusy(true);
    setError(null);
    const result = await api<T>(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return null;
    }
    router.refresh();
    return result.data ?? ({} as T);
  }

  return { run, error, setError, busy, router };
}

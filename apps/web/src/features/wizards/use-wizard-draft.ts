"use client";

// Lo capturado en un asistente, guardado en el servidor (spec 015, RF-17 a RF-21, RF-27): se lee al abrir y, si hay
// algo a medias, se ofrece continuar o empezar de nuevo; se guarda al cambiar de paso y poco después de cada cambio;
// se descarta al empezar de nuevo o al confirmar. Nada de esto registra la tarea (RF-8).
import { useCallback, useEffect, useRef, useState } from "react";
import type { WizardKind } from "@/domain/wizards/drafts";
import { api } from "../api";

export interface DraftPrompt {
  updatedAt: Date;
  step: string;
}

export interface WizardDraftOptions<T> {
  kind: WizardKind;
  target?: string;
  /** Teléfono de piso: el empleado elegido. */
  employee?: string;
  initial: T;
  steps: string[];
  /** Al llegar desde la otra vista (RF-27), se continúa sin preguntar. */
  autoResume?: boolean;
}

const SAVE_DELAY_MS = 800;

export function draftPath(kind: WizardKind, target?: string, employee?: string) {
  const q = new URLSearchParams();
  if (target) q.set("target", target);
  if (employee) q.set("employee", employee);
  const query = q.toString();
  return `/api/wizards/${kind}/draft${query ? `?${query}` : ""}`;
}

export function useWizardDraft<T>({ kind, target, employee, initial, steps, autoResume = false }: WizardDraftOptions<T>) {
  const path = draftPath(kind, target, employee);
  const [data, setData] = useState<T>(initial);
  const [index, setIndexState] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [prompt, setPrompt] = useState<(DraftPrompt & { data: T }) | null>(null);
  const latest = useRef({ data, index, touched: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(initial);
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { data: d, index: i, touched } = latest.current;
    if (!touched) return;
    await api(path, { method: "PUT", body: { step: stepsRef.current[i] ?? stepsRef.current[0], data: d } });
  }, [path]);

  useEffect(() => {
    let alive = true;
    void api<{ draft: { step: string; data: T; updatedAt: string } | null }>(path).then((r) => {
      if (!alive) return;
      const draft = r.ok ? r.data.draft : null;
      if (draft) {
        const at = Math.max(0, stepsRef.current.indexOf(draft.step));
        if (autoResume) {
          latest.current = { data: draft.data, index: at, touched: true };
          setData(draft.data);
          setIndexState(at);
        } else setPrompt({ updatedAt: new Date(draft.updatedAt), step: draft.step, data: draft.data });
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [path, autoResume]);

  // Lo último que se capturó no se pierde al cerrar la pestaña o cambiar de pantalla.
  useEffect(() => {
    const flush = () => {
      if (latest.current.touched && timer.current) void save();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [save]);

  const update = useCallback(
    (fn: (d: T) => T) => {
      setData((d) => {
        const next = fn(d);
        latest.current = { ...latest.current, data: next, touched: true };
        return next;
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), SAVE_DELAY_MS);
    },
    [save],
  );

  const setIndex = useCallback(
    (i: number) => {
      setIndexState(i);
      latest.current = { ...latest.current, index: i };
      // El resumen no es un paso con datos: se guarda en el último.
      if (latest.current.touched && i < stepsRef.current.length) void save();
    },
    [save],
  );

  const resume = useCallback(() => {
    if (!prompt) return;
    const at = Math.max(0, stepsRef.current.indexOf(prompt.step));
    latest.current = { data: prompt.data, index: at, touched: true };
    setData(prompt.data);
    setIndexState(at);
    setPrompt(null);
  }, [prompt]);

  const discard = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    latest.current = { data: initialRef.current, index: 0, touched: false };
    await api(path, { method: "DELETE" });
  }, [path]);

  const restart = useCallback(async () => {
    await discard();
    setData(initialRef.current);
    setIndexState(0);
    setPrompt(null);
  }, [discard]);

  return { data, update, index, setIndex, loaded, prompt, resume, restart, discard, save };
}

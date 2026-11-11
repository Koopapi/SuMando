"use client";

import { useEffect } from "react";

/** Registra el service worker de la página «sin conexión» (RF-40). */
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

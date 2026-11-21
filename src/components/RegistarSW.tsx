"use client";

import { useEffect } from "react";

/** Regista o service worker, que torna a app instalável e mostra uma página própria quando não há rede. */
export function RegistarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* sem service worker a app continua a funcionar normalmente */
    });
  }, []);
  return null;
}

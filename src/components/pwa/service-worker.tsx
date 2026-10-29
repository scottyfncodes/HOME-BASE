"use client";
import { useEffect } from "react";

/** Must match PAGES in public/sw.js and the offline page's inline script. */
const PAGE_CACHE = "hb-pages-v1";

/** Registers /sw.js in production. Development keeps the network honest. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

/** Forgets every page saved for offline use. Called on sign-out and on signed-out screens. */
export async function clearOfflinePages() {
  try {
    if ("caches" in window) await caches.delete(PAGE_CACHE);
  } catch {
    /* storage blocked: nothing was saved either */
  }
}

export function ClearOfflinePages() {
  useEffect(() => {
    void clearOfflinePages();
  }, []);
  return null;
}

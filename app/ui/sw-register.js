"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // next-pwa is disabled in development; avoid registering /sw.js locally
    // to prevent 404 HTML responses causing "Unexpected token '<'" issues.
    if (process.env.NODE_ENV === "development") return;

    let cancelled = false;

    async function register() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (!cancelled) {
          console.log("HCH PWA Ready");
        }
        return reg;
      } catch (error) {
        console.error("HCH PWA service worker registration failed:", error);
      }
    }

    // Defer until after page load to avoid blocking hydration.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}

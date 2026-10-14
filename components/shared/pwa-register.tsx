"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const path = window.location.pathname.toLowerCase();
        if (path.startsWith("/fa")) {
          localStorage.setItem("user_locale", "fa");
          localStorage.setItem("preferred_lang", "fa");
        } else if (path.startsWith("/en")) {
          localStorage.setItem("user_locale", "en");
          localStorage.setItem("preferred_lang", "en");
        }
      } catch {}

      // Expose a helper on window to easily force purge PWA cache from console or code
      (window as unknown as { __forceRefreshCache: () => Promise<void> }).__forceRefreshCache = async () => {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage("PURGE_CACHE");
        }
        window.location.reload();
      };

      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");

          // Always check for an updated Service Worker immediately from server
          registration.update().catch(() => {});

          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (installingWorker.state === "installed") {
                  // Tell new worker to activate immediately
                  installingWorker.postMessage("SKIP_WAITING");
                }
              });
            }
          });
        } catch (error) {
          console.error("PWA Service Worker registration error:", error);
        }
      };

      // Listen for when a new service worker takes over and automatically refresh caches
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}

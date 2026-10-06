"use client";

import { useEffect } from "react";

/**
 * Suppresses the React 19 dev-mode console warning:
 * "Encountered a script tag while rendering React component."
 *
 * This warning is caused by `next-themes` injecting an anti-flash <script>
 * inside the React component tree. This is a known upstream incompatibility
 * between next-themes and React 19. It is a DEV-ONLY warning and does NOT
 * affect production builds or any runtime behavior.
 *
 * Remove this component once next-themes ships a fix using <template>.
 */
export function DevWarningSupressor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const originalError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("Encountered a script tag while rendering React")) {
        return; // suppress only this specific warning
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}

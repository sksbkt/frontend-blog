"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Patch console.error at module-evaluation time (runs before any render).
// This suppresses the React 19 dev warning about next-themes injecting a
// <script> tag inside the React component tree. This is a known upstream
// incompatibility — it is DEV-ONLY and does NOT affect production or runtime.
// Remove this block once next-themes ships a fix that uses <template> instead.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const _orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React")
    ) {
      return;
    }
    _orig(...args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="theme"
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

"use client";

import { ThemeProvider } from "@/components/shared/theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

"use client";

import React, { useEffect } from "react";
import { Activity, Radio } from "lucide-react";
import { useTelemetryStore } from "@/lib/stores/use-telemetry-store";
import { subscribeToTelemetryToasts, type ToastNotifier } from "@/lib/hooks/use-telemetry-fetch";

interface DeveloperTelemetryToggleProps {
  onToast?: ToastNotifier;
  compact?: boolean;
}

export function DeveloperTelemetryToggle({
  onToast,
  compact = false,
}: DeveloperTelemetryToggleProps) {
  const { isTelemetryEnabled, isHudOpen, toggleTelemetry, setIsHudOpen } = useTelemetryStore();

  const handleToggle = () => {
    if (!isTelemetryEnabled) {
      toggleTelemetry();
      setIsHudOpen(true);
    } else {
      setIsHudOpen(!isHudOpen);
    }
  };

  useEffect(() => {
    if (!onToast) return;
    const unsubscribe = subscribeToTelemetryToasts((text, type) => {
      onToast(text, type);
    });
    return unsubscribe;
  }, [onToast]);

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs min-h-[36px] ${
          isTelemetryEnabled
            ? isHudOpen
              ? "border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20"
              : "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
        title="Developer Telemetry HUD: Toggle HUD Window (Ctrl+Shift+H)"
      >
        <Activity className={`w-3.5 h-3.5 ${isTelemetryEnabled ? "animate-pulse text-emerald-500" : ""}`} />
        <span className="hidden lg:inline">Telemetry HUD</span>
        <span
          className={`w-2 h-2 rounded-full ${
            isTelemetryEnabled ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-muted-foreground/40"
          }`}
        />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-xs">
      <div className="flex items-center gap-2.5">
        <div
          className={`p-2 rounded-lg ${
            isTelemetryEnabled
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-foreground flex items-center gap-2">
            <span>Developer Telemetry HUD</span>
            {isTelemetryEnabled && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                LIVE
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-[11px] mt-0.5">
            Show live notifications for AI syntheses, GitHub syncs, and database cache hits.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleTelemetry}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
          isTelemetryEnabled ? "bg-emerald-600" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow-lg ring-0 transition duration-200 ease-in-out ${
            isTelemetryEnabled ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

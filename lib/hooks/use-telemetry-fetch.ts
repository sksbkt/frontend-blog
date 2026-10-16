"use client";

import { useCallback } from "react";
import type { ApiResponse } from "@/types/api";
import { useTelemetryStore } from "@/lib/stores/use-telemetry-store";

export type ToastNotifier = (
  text: string,
  type: "success" | "error" | "info"
) => void;

type TelemetryToastListener = (text: string, type: "success" | "error" | "info") => void;
const toastListeners = new Set<TelemetryToastListener>();

export function subscribeToTelemetryToasts(listener: TelemetryToastListener) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function dispatchTelemetryToast(text: string, type: "success" | "error" | "info" = "info") {
  for (const listener of toastListeners) {
    listener(text, type);
  }
}

/**
 * Executes a fetch request and intercepts the standardized ApiResponse envelope
 * to display telemetry toasts when Developer HUD is active.
 */
export async function trackedFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  customToast?: ToastNotifier
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || `Request failed with status ${res.status}`
    );
  }

  const json: ApiResponse<T> = await res.json();
  const meta = json.meta;

  if (meta && typeof window !== "undefined") {
    const isEnabled = localStorage.getItem("admin_dev_telemetry_enabled") === "true";
    if (isEnabled) {
      let toastText = "";
      let toastType: "success" | "info" = "info";

      if (meta.source === "GEMINI_GENERATION") {
        const count = meta.details?.synthesizedCount ?? 1;
        toastText = `[Gemini API] Synthesized ${count} item(s) in ${meta.durationMs}ms`;
        toastType = "info";
      } else if (meta.source === "GITHUB_API") {
        const action = meta.details?.action || "Fetched GitHub data";
        toastText = `[GitHub API] ${action} in ${meta.durationMs}ms`;
        toastType = "info";
      } else if (meta.source === "CACHE_DATABASE") {
        toastText = `[DB Cache Hit] Retrieved in ${meta.durationMs}ms`;
        toastType = "success";
      }

      if (toastText) {
        if (customToast) {
          customToast(toastText, toastType);
        }
        dispatchTelemetryToast(toastText, toastType);
      }
    }
  }

  return json.data;
}

export function useTelemetryFetch() {
  const { isTelemetryEnabled } = useTelemetryStore();

  const fetchWithTelemetry = useCallback(
    async <T>(
      input: RequestInfo | URL,
      init?: RequestInit,
      notify?: ToastNotifier
    ): Promise<T> => {
      return trackedFetch<T>(input, init, notify);
    },
    []
  );

  return {
    isTelemetryEnabled,
    trackedFetch: fetchWithTelemetry,
  };
}

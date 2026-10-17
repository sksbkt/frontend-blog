/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Real-Time Telemetry Client Store & SSE Connection Manager
 */

"use client";

import { useSyncExternalStore, useEffect } from "react";
import type { TelemetryStreamEvent } from "@/types/api";

const STORAGE_KEY_ENABLED = "admin_dev_telemetry_enabled";
const STORAGE_KEY_HUD_OPEN = "admin_dev_telemetry_hud_open";
const MAX_EVENTS_HISTORY = 50;

export type TelemetryConnectionStatus = "connected" | "reconnecting" | "idle" | "error";

interface TelemetryState {
  isEnabled: boolean;
  isHudOpen: boolean;
  connectionStatus: TelemetryConnectionStatus;
  events: TelemetryStreamEvent[];
}

let state: TelemetryState = {
  isEnabled: false,
  isHudOpen: false,
  connectionStatus: "idle",
  events: [],
};

const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    state.isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
    state.isHudOpen = localStorage.getItem(STORAGE_KEY_HUD_OPEN) === "true";
  } catch {}
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

let eventSource: EventSource | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

function connectSSE() {
  if (typeof window === "undefined") return;
  if (!state.isEnabled) {
    disconnectSSE();
    return;
  }
  if (eventSource && (eventSource.readyState === EventSource.OPEN || eventSource.readyState === EventSource.CONNECTING)) {
    return;
  }

  state = {
    ...state,
    connectionStatus: reconnectAttempts > 0 ? "reconnecting" : ("connecting" as any),
  };
  emitChange();

  try {
    eventSource = new EventSource("/api/telemetry/stream");

    eventSource.onopen = () => {
      reconnectAttempts = 0;
      state = { ...state, connectionStatus: "connected" };
      emitChange();
    };

    eventSource.onmessage = (e) => {
      if (!e.data || e.data.startsWith(":")) return; // heartbeat
      try {
        const streamEvent = JSON.parse(e.data) as TelemetryStreamEvent;
        if (!streamEvent || !streamEvent.id) return;

        // Add to ring buffer (newest at top)
        const current = [...state.events];
        // avoid duplicate if flushed from recent
        if (!current.some((ev) => ev.id === streamEvent.id)) {
          current.unshift(streamEvent);
          if (current.length > MAX_EVENTS_HISTORY) {
            current.pop();
          }
          state = { ...state, events: current };
          emitChange();
        }
      } catch (err) {
        console.warn("[TelemetryClient] Parse error:", err);
      }
    };

    eventSource.onerror = () => {
      state = { ...state, connectionStatus: "reconnecting" };
      emitChange();
      eventSource?.close();
      eventSource = null;

      // Exponential reconnect with max 10s
      if (state.isEnabled) {
        const delay = Math.min(10000, 1000 * Math.pow(1.5, reconnectAttempts));
        reconnectAttempts++;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectSSE, delay);
      }
    };
  } catch (err) {
    console.error("[TelemetryClient] Connection failed:", err);
    state = { ...state, connectionStatus: "error" };
    emitChange();
  }
}

function disconnectSSE() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  reconnectAttempts = 0;
  state = { ...state, connectionStatus: "idle" };
  emitChange();
}

// Automatically initiate SSE if enabled on initial script load in browser
if (typeof window !== "undefined" && state.isEnabled) {
  setTimeout(connectSSE, 100);
}

export const telemetryStore = {
  getState: () => state,
  setEnabled: (value: boolean) => {
    state = { ...state, isEnabled: value };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_ENABLED, String(value));
      } catch {}
    }
    if (value) {
      connectSSE();
    } else {
      disconnectSSE();
    }
    emitChange();
  },
  toggleEnabled: () => {
    telemetryStore.setEnabled(!state.isEnabled);
  },
  setHudOpen: (open: boolean) => {
    state = { ...state, isHudOpen: open };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_HUD_OPEN, String(open));
      } catch {}
    }
    emitChange();
  },
  toggleHud: () => {
    telemetryStore.setHudOpen(!state.isHudOpen);
  },
  clearEvents: () => {
    state = { ...state, events: [] };
    emitChange();
  },
  addLocalEvent: (event: TelemetryStreamEvent) => {
    const current = [event, ...state.events];
    if (current.length > MAX_EVENTS_HISTORY) current.pop();
    state = { ...state, events: current };
    emitChange();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useTelemetryStore() {
  const currentState = useSyncExternalStore(
    telemetryStore.subscribe,
    telemetryStore.getState,
    () => state
  );

  // Hook ensuring SSE is alive if telemetry is active
  useEffect(() => {
    if (currentState.isEnabled && (!eventSource || eventSource.readyState === EventSource.CLOSED)) {
      connectSSE();
    }
  }, [currentState.isEnabled]);

  // Derived statistics selectors
  const total = currentState.events.length;
  const dbHits = currentState.events.filter((e) => e.source === "DB_CACHE").length;
  const geminiCount = currentState.events.filter((e) => e.source === "GEMINI_SYNTHESIS").length;
  const githubCount = currentState.events.filter((e) => e.source === "GITHUB_API").length;
  const hitRatePercent = total > 0 ? Math.round((dbHits / total) * 100) : 0;
  const totalLatency = currentState.events.reduce((sum, e) => sum + (e.latencyMs || 0), 0);
  const avgLatencyMs = total > 0 ? Math.round(totalLatency / total) : 0;

  return {
    isTelemetryEnabled: currentState.isEnabled,
    isHudOpen: currentState.isHudOpen,
    connectionStatus: currentState.connectionStatus,
    events: currentState.events,
    setIsTelemetryEnabled: telemetryStore.setEnabled,
    toggleTelemetry: telemetryStore.toggleEnabled,
    setIsHudOpen: telemetryStore.setHudOpen,
    toggleHud: telemetryStore.toggleHud,
    clearEvents: telemetryStore.clearEvents,
    addLocalEvent: telemetryStore.addLocalEvent,
    stats: {
      total,
      dbHits,
      geminiCount,
      githubCount,
      hitRatePercent,
      avgLatencyMs,
    },
  };
}

/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Telemetry Event Bus Singleton
 * Dispatches real-time resolution telemetry to active SSE subscribers.
 */

import { EventEmitter } from "events";
import type { TelemetryStreamEvent } from "@/types/api";

const RECENT_BUFFER_SIZE = 20;

class TelemetryEventBus extends EventEmitter {
  private recentEvents: TelemetryStreamEvent[] = [];

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  public emitEvent(
    eventData: Omit<TelemetryStreamEvent, "id" | "timestamp" | "traceId"> & {
      id?: string;
      timestamp?: string;
      traceId?: string;
    }
  ): TelemetryStreamEvent {
    const fullEvent: TelemetryStreamEvent = {
      id: eventData.id || `tevt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: eventData.timestamp || new Date().toISOString(),
      traceId: eventData.traceId || `tr_${Date.now().toString(36)}`,
      entityType: eventData.entityType,
      key: eventData.key,
      source: eventData.source,
      latencyMs: Math.max(0, Math.round(eventData.latencyMs)),
      status: eventData.status,
      details: eventData.details,
    };

    // Maintain recent events ring buffer
    this.recentEvents.push(fullEvent);
    if (this.recentEvents.length > RECENT_BUFFER_SIZE) {
      this.recentEvents.shift();
    }

    this.emit("event", fullEvent);
    return fullEvent;
  }

  public getRecent(): TelemetryStreamEvent[] {
    return [...this.recentEvents];
  }
}

// Global singleton to survive hot-reloads and dev compilation in Next.js
declare global {
  // eslint-disable-next-line no-var
  var __telemetryEventBus: TelemetryEventBus | undefined;
}

export const telemetryBus: TelemetryEventBus =
  globalThis.__telemetryEventBus || (globalThis.__telemetryEventBus = new TelemetryEventBus());

export function emitTelemetryEvent(
  eventData: Omit<TelemetryStreamEvent, "id" | "timestamp" | "traceId"> & {
    id?: string;
    timestamp?: string;
    traceId?: string;
  }
): TelemetryStreamEvent {
  return telemetryBus.emitEvent(eventData);
}

export function subscribeTelemetry(
  listener: (event: TelemetryStreamEvent) => void
): () => void {
  telemetryBus.on("event", listener);
  return () => {
    telemetryBus.off("event", listener);
  };
}

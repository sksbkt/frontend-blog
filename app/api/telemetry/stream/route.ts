import { subscribeTelemetry, telemetryBus } from "@/lib/telemetry/event-bus";
import type { TelemetryStreamEvent } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function sendEvent(event: TelemetryStreamEvent) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream might have closed
        }
      }

      function sendHeartbeat() {
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          // Stream might have closed
        }
      }

      // 0. Immediate connection comment to flush HTTP response headers
      try {
        controller.enqueue(encoder.encode(": connected\n\n"));
      } catch {}

      // 1. Flush recent events on connect for immediate context
      const recent = telemetryBus.getRecent();
      for (const event of recent) {
        sendEvent(event);
      }

      // 2. Subscribe to live events
      const unsubscribe = subscribeTelemetry((event) => {
        sendEvent(event);
      });

      // 3. Heartbeat timer every 15 seconds
      const heartbeatInterval = setInterval(sendHeartbeat, 15000);

      // 4. Handle client abort
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

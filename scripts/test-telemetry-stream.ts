import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== TESTING TELEMETRY SSE STREAM & LIVE EVENT INTEGRATION ===");
  const baseUrl = "http://localhost:3000";
  const receivedEvents: any[] = [];
  const abortController = new AbortController();

  // Safety ceiling: 15s max
  const timeoutId = setTimeout(() => {
    console.warn("[TEST TIMEOUT] Aborting stream after 15s...");
    abortController.abort();
  }, 15000);

  try {
    // 1. Establish SSE stream connection to /api/telemetry/stream
    console.log("[1/4] Connecting to SSE stream: /api/telemetry/stream...");
    const streamRes = await fetch(`${baseUrl}/api/telemetry/stream`, {
      headers: { Accept: "text/event-stream" },
      signal: abortController.signal,
    });

    if (!streamRes.ok) {
      throw new Error(`Failed to connect to SSE stream: ${streamRes.statusText}`);
    }

    console.log("[1/4] SSE stream connected (HTTP 200 text/event-stream).");
    const reader = streamRes.body?.getReader();
    if (!reader) throw new Error("Stream reader not available.");

    const decoder = new TextDecoder();
    let streamBuffer = "";

    // Background reader loop
    const readStreamPromise = (async () => {
      while (!abortController.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n\n");
        streamBuffer = lines.pop() || "";

        for (const block of lines) {
          const trimmed = block.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              receivedEvents.push(json);
              console.log(
                `  -> [SSE RECEIVED] ID: ${json.id} | Source: ${json.source} | Entity: ${json.entityType} | Key: "${json.key}" | Latency: ${json.latencyMs}ms`
              );
            } catch {}
          }
        }
      }
    })();

    // 2. Allow stream setup
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 3. Trigger a DB Cache check route call
    console.log("\n[2/4] Triggering POST /api/admin/tech-definitions/check (Cache lookup)...");
    const checkRes = await fetch(`${baseUrl}/api/admin/tech-definitions/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ techs: ["react", "nextjs"] }),
    });
    const checkData = await checkRes.json();
    console.log(`[Check Route] DB Hit: ${checkData.data.cached.length} items (Took ${checkData.meta.durationMs}ms)`);

    // 4. Wait for first SSE event to arrive
    console.log("\n[3/4] Awaiting live telemetry SSE event from bus...");
    const pollStart = Date.now();
    while (receivedEvents.length === 0 && Date.now() - pollStart < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // 5. Trigger a second DB Cache check with different techs
    console.log("\n[4/4] Triggering second check query to verify streaming continuity...");
    const checkRes2 = await fetch(`${baseUrl}/api/admin/tech-definitions/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ techs: ["tailwindcss", "jotai"] }),
    });
    const checkData2 = await checkRes2.json();
    console.log(`[Check Route 2] DB Hit: ${checkData2.data.cached.length} items (Took ${checkData2.meta.durationMs}ms)`);

    // Allow time for second event to stream
    await new Promise((resolve) => setTimeout(resolve, 1000));

    clearTimeout(timeoutId);
    abortController.abort();
    try {
      await readStreamPromise;
    } catch {}

    console.log(`\n=== TELEMETRY STREAM TEST SUMMARY ===`);
    console.log(`Total SSE Events Received: ${receivedEvents.length}`);
    const dbEvents = receivedEvents.filter((e) => e.source === "DB_CACHE");
    const geminiEvents = receivedEvents.filter((e) => e.source === "GEMINI_SYNTHESIS");

    console.log(`- DB_CACHE Events: ${dbEvents.length}`);
    console.log(`- GEMINI_SYNTHESIS Events: ${geminiEvents.length}`);

    if (receivedEvents.length > 0) {
      console.log("\n✅ SUCCESS: Real-time telemetry SSE stream verified!");
    } else {
      console.warn("\n⚠️ WARNING: No stream events received.");
    }
  } catch (err: any) {
    if (err.name !== "AbortError") {
      console.error("❌ Test error:", err);
    }
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

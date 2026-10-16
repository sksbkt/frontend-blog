import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeLookupKey } from "@/lib/tech-resolver";
import type { ApiResponse, TechCheckResult } from "@/types/api";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const rawTechNames: string[] = body.techs || body.names || [];

    const uniqueRaw = Array.from(
      new Set(rawTechNames.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean))
    );
    const lookupKeys = uniqueRaw.map(sanitizeLookupKey);

    const cachedDefs = await prisma.techDefinition.findMany({
      where: {
        OR: [
          { slug: { in: lookupKeys } },
          { aliases: { hasSome: lookupKeys } },
        ],
      },
    });

    const cached: TechCheckResult["cached"] = [];
    const resolvedSet = new Set<string>();

    for (const raw of uniqueRaw) {
      const key = sanitizeLookupKey(raw);
      const match = cachedDefs.find(
        (def) => def.slug === key || def.aliases.some((a) => sanitizeLookupKey(a) === key)
      );
      if (match) {
        cached.push({
          name: match.name,
          slug: match.slug,
          summaryEn: match.summaryEn,
          summaryFa: match.summaryFa,
          icon: match.icon,
          category: match.category,
        });
        resolvedSet.add(raw);
      }
    }

    const missing = uniqueRaw.filter((raw) => !resolvedSet.has(raw));
    const durationMs = Date.now() - startTime;

    const response: ApiResponse<TechCheckResult> = {
      data: {
        cached,
        missing,
      },
      meta: {
        source: "CACHE_DATABASE",
        durationMs,
        timestamp: new Date().toISOString(),
        details: {
          requestedCount: uniqueRaw.length,
          cachedCount: cached.length,
          missingCount: missing.length,
        },
      },
    };

    try {
      const { emitTelemetryEvent } = await import("@/lib/telemetry/event-bus");
      emitTelemetryEvent({
        entityType: "tech",
        key: uniqueRaw.slice(0, 3).join(", ") + (uniqueRaw.length > 3 ? "..." : ""),
        source: "DB_CACHE",
        latencyMs: durationMs,
        status: "SUCCESS",
        details: {
          requestedCount: uniqueRaw.length,
          cachedCount: cached.length,
          missingCount: missing.length,
        },
      });
    } catch {}

    return NextResponse.json(response);
  } catch (error) {
    console.error("[TechCheckRoute] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check tech cache",
      },
      { status: 500 }
    );
  }
}

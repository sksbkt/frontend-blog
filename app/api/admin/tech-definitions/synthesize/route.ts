import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMissingTechDefinitions } from "@/lib/gemini/tech-def";
import { sanitizeLookupKey } from "@/lib/tech-resolver";
import type { ApiResponse } from "@/types/api";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const missing: string[] = body.missing || [];

    if (!Array.isArray(missing) || missing.length === 0) {
      return NextResponse.json({
        data: [],
        meta: {
          source: "GEMINI_GENERATION",
          durationMs: 0,
          timestamp: new Date().toISOString(),
          details: { synthesizedCount: 0 },
        },
      });
    }

    console.log(`[TechSynthesizeRoute] Synthesizing missing via Gemini:`, missing);
    const generated = await generateMissingTechDefinitions(missing);

    const savedRecords = [];

    for (const item of generated) {
      const normalizedAliases = Array.from(
        new Set([
          ...item.aliases.map(sanitizeLookupKey),
          sanitizeLookupKey(item.rawInput),
        ])
      ).filter((a) => a && a !== item.slug);

      const record = await prisma.techDefinition.upsert({
        where: { slug: item.slug },
        update: {
          aliases: {
            push: normalizedAliases,
          },
          icon: item.icon || undefined,
          category: item.category || undefined,
        },
        create: {
          slug: item.slug,
          name: item.name,
          aliases: normalizedAliases,
          summaryEn: item.summaryEn,
          summaryFa: item.summaryFa,
          category: item.category,
          icon: item.icon || null,
        },
      });

      savedRecords.push(record);
    }

    const durationMs = Date.now() - startTime;
    const response: ApiResponse<typeof savedRecords> = {
      data: savedRecords,
      meta: {
        source: "GEMINI_GENERATION",
        durationMs,
        timestamp: new Date().toISOString(),
        details: {
          requestedCount: missing.length,
          synthesizedCount: savedRecords.length,
          generatedTechs: savedRecords.map((r) => r.slug),
        },
      },
    };

    try {
      const { emitTelemetryEvent } = await import("@/lib/telemetry/event-bus");
      emitTelemetryEvent({
        entityType: "tech",
        key: missing.join(", "),
        source: "GEMINI_SYNTHESIS",
        latencyMs: durationMs,
        status: "SUCCESS",
        details: {
          synthesizedCount: savedRecords.length,
          generated: savedRecords.map((r) => r.name),
        },
      });
    } catch {}

    return NextResponse.json(response);
  } catch (error) {
    console.error("[TechSynthesizeRoute] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to synthesize tech definitions",
      },
      { status: 500 }
    );
  }
}

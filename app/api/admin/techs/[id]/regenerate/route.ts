import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateMissingTechDefinitions } from "@/lib/gemini/tech-def";
import { sanitizeLookupKey } from "@/lib/tech-resolver";
import type { ApiResponse } from "@/types/api";
import type { TechDefinition } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const startTime = Date.now();
  console.log(`[API REGENERATE] 1. Auth session check starting... (${new Date().toISOString()})`);

  const session = await getSession();

  if (!session) {
    console.warn(`[API REGENERATE] Auth failed: No active session.`);
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  console.log(`[API REGENERATE] 2. Auth verified for user: ${session.user?.login}`);
  const { id } = await params;
  console.log(`[API REGENERATE] 3. Looking up tech record for slug: "${id}"`);

  try {
    const existing = await prisma.techDefinition.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      console.warn(`[API REGENERATE] Record "${id}" not found in database.`);
      return NextResponse.json(
        { success: false, message: `Tech definition "${id}" not found.` },
        { status: 404 }
      );
    }

    console.log(`[API REGENERATE] 4. Triggering Gemini taxonomy generation for "${existing.name}"...`);
    const tAi0 = Date.now();
    const generatedList = await generateMissingTechDefinitions([existing.name]);
    const elapsedAiMs = Date.now() - tAi0;
    console.log(`[API REGENERATE] 5. Gemini responded in: ${elapsedAiMs} ms`);

    if (!generatedList || generatedList.length === 0) {
      console.error(`[API REGENERATE] Gemini returned empty definition for "${existing.name}".`);
      return NextResponse.json(
        { success: false, message: `Gemini did not return synthesized metadata for "${existing.name}".` },
        { status: 502 }
      );
    }

    const gen = generatedList[0];
    const canonicalSlug = gen.slug || existing.slug;
    const mergedAliases = Array.from(
      new Set([
        ...existing.aliases,
        ...gen.aliases.map(sanitizeLookupKey),
        sanitizeLookupKey(gen.rawInput),
        sanitizeLookupKey(existing.name),
      ])
    ).filter((a) => a && a !== canonicalSlug);

    console.log(`[API REGENERATE] 6. Updating Prisma record for ID "${existing.id}"...`);
    const updated = await prisma.techDefinition.update({
      where: { id: existing.id },
      data: {
        name: gen.name || existing.name,
        slug: canonicalSlug,
        aliases: mergedAliases,
        summaryEn: gen.summaryEn || existing.summaryEn,
        summaryFa: gen.summaryFa || existing.summaryFa,
        category: gen.category || existing.category,
        icon: gen.icon || existing.icon,
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(`[API REGENERATE] 7. Responding with 200 JSON (Total: ${durationMs}ms)...`);

    const response: ApiResponse<TechDefinition> = {
      data: updated,
      meta: {
        source: "GEMINI_GENERATION",
        durationMs,
        timestamp: new Date().toISOString(),
        details: {
          regeneratedName: updated.name,
          aliasCount: mergedAliases.length,
        },
      },
    };

    try {
      const { emitTelemetryEvent } = await import("@/lib/telemetry/event-bus");
      emitTelemetryEvent({
        entityType: "tech",
        key: updated.slug,
        source: "GEMINI_SYNTHESIS",
        latencyMs: durationMs,
        status: "SUCCESS",
        details: {
          name: updated.name,
          aliasCount: mergedAliases.length,
        },
      });
    } catch {}

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[API REGENERATE] Exception during regeneration:", err?.message || err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to regenerate tech definition." },
      { status: 500 }
    );
  }
}

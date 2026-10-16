import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sanitizeLookupKey } from "@/lib/tech-resolver";
import type { ApiResponse } from "@/types/api";
import type { TechDefinition } from "@prisma/client";

export async function GET(req: Request) {
  const startTime = Date.now();
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  try {
    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { aliases: { hasSome: [q.toLowerCase(), sanitizeLookupKey(q)] } },
      ];
    }

    if (category && category !== "all") {
      where.category = { equals: category, mode: "insensitive" };
    }

    const [total, techs] = await Promise.all([
      prisma.techDefinition.count({ where }),
      prisma.techDefinition.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
    ]);

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      data: techs,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      meta: {
        source: "CACHE_DATABASE",
        durationMs,
        timestamp: new Date().toISOString(),
        details: { total, returned: techs.length, page },
      },
    });
  } catch (err: any) {
    console.error("[AdminTechsAPI] GET error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to fetch tech definitions." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { name, slug, aliases, summaryEn, summaryFa, category, icon } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, message: "A valid 'name' is required." },
        { status: 400 }
      );
    }

    const canonicalSlug = (slug || sanitizeLookupKey(name)).toLowerCase().trim();
    const cleanAliases: string[] = Array.isArray(aliases)
      ? Array.from(
          new Set(
            aliases
              .map((a: unknown) => (typeof a === "string" ? sanitizeLookupKey(a) : ""))
              .filter((a: string) => a && a !== canonicalSlug)
          )
        )
      : [];

    const created = await prisma.techDefinition.create({
      data: {
        name: name.trim(),
        slug: canonicalSlug,
        aliases: cleanAliases,
        summaryEn: (summaryEn || "").trim(),
        summaryFa: (summaryFa || "").trim(),
        category: (category || "other").toLowerCase().trim(),
        icon: icon ? icon.trim() : null,
      },
    });

    const durationMs = Date.now() - startTime;

    const response: ApiResponse<TechDefinition> = {
      data: created,
      meta: {
        source: "CACHE_DATABASE",
        durationMs,
        timestamp: new Date().toISOString(),
        details: { action: "create", id: created.id },
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err: any) {
    console.error("[AdminTechsAPI] POST error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to create tech definition." },
      { status: 500 }
    );
  }
}

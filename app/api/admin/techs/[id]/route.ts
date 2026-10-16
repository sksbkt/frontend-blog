import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sanitizeLookupKey } from "@/lib/tech-resolver";
import type { ApiResponse } from "@/types/api";
import type { TechDefinition } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const startTime = Date.now();
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const tech = await prisma.techDefinition.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!tech) {
      return NextResponse.json(
        { success: false, message: `Tech definition "${id}" not found.` },
        { status: 404 }
      );
    }

    const durationMs = Date.now() - startTime;
    const response: ApiResponse<TechDefinition> = {
      data: tech,
      meta: {
        source: "CACHE_DATABASE",
        durationMs,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[AdminTechsAPI] GET [id] error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to fetch tech definition." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const startTime = Date.now();
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, slug, aliases, summaryEn, summaryFa, category, icon } = body;

    const existing = await prisma.techDefinition.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: `Tech definition "${id}" not found.` },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }

    if (typeof slug === "string" && slug.trim()) {
      updateData.slug = sanitizeLookupKey(slug);
    }

    if (Array.isArray(aliases)) {
      updateData.aliases = Array.from(
        new Set(
          aliases
            .map((a: unknown) => (typeof a === "string" ? sanitizeLookupKey(a) : ""))
            .filter((a: string) => a && a !== (updateData.slug || existing.slug))
        )
      );
    }

    if (typeof summaryEn === "string") {
      updateData.summaryEn = summaryEn.trim();
    }

    if (typeof summaryFa === "string") {
      updateData.summaryFa = summaryFa.trim();
    }

    if (typeof category === "string") {
      updateData.category = category.trim().toLowerCase();
    }

    if (icon !== undefined) {
      updateData.icon = typeof icon === "string" && icon.trim() ? icon.trim() : null;
    }

    const updated = await prisma.techDefinition.update({
      where: { id: existing.id },
      data: updateData,
    });

    const durationMs = Date.now() - startTime;
    const response: ApiResponse<TechDefinition> = {
      data: updated,
      meta: {
        source: "CACHE_DATABASE",
        durationMs,
        timestamp: new Date().toISOString(),
        details: { action: "update", id: updated.id },
      },
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[AdminTechsAPI] PATCH [id] error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to update tech definition." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const startTime = Date.now();
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.techDefinition.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: `Tech definition "${id}" not found.` },
        { status: 404 }
      );
    }

    await prisma.techDefinition.delete({
      where: { id: existing.id },
    });

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      message: `Deleted tech definition "${existing.name}".`,
      meta: {
        source: "CACHE_DATABASE",
        durationMs,
        timestamp: new Date().toISOString(),
        details: { action: "delete", id: existing.id },
      },
    });
  } catch (err: any) {
    console.error("[AdminTechsAPI] DELETE [id] error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to delete tech definition." },
      { status: 500 }
    );
  }
}

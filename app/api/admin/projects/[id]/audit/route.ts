/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Project Audit Recalculation API
 * POST /api/admin/projects/[id]/audit
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateProjectAuditReport } from "@/lib/sca/audit-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin session required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { slug: { equals: decodedId, mode: "insensitive" } },
          { githubUrl: { contains: decodedId, mode: "insensitive" } },
          { title: { equals: decodedId, mode: "insensitive" } },
        ],
      },
    });

    let activeProject = project;
    if (!activeProject) {
      activeProject = await prisma.project.findFirst();
    }

    if (!activeProject) {
      return NextResponse.json(
        { success: false, message: `Project "${id}" not found.` },
        { status: 404 }
      );
    }

    // Fetch all canonical slugs and aliases
    const techDefs = await prisma.techDefinition.findMany({
      select: { slug: true, aliases: true },
    });
    const canonicalTechSlugs = new Set<string>();
    techDefs.forEach((t) => {
      canonicalTechSlugs.add(t.slug.toLowerCase().trim());
      if (Array.isArray(t.aliases)) {
        t.aliases.forEach((a) => canonicalTechSlugs.add(a.toLowerCase().trim()));
      }
    });

    // Revalidate and ensure sovereign asset caching (14-day TTL revalidation hook)
    let sovereignCoverUrl = activeProject.coverImageUrl;
    if (activeProject.githubUrl) {
      const ghMatch = activeProject.githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
      if (ghMatch) {
        try {
          const { getOrCacheGithubOgImage } = await import("@/lib/github-og-cache");
          const ogUrl = await getOrCacheGithubOgImage(ghMatch[1], ghMatch[2].replace(/\.git$/i, ""));
          if (!sovereignCoverUrl || sovereignCoverUrl.includes("githubassets.com") || sovereignCoverUrl.includes("github-og")) {
            sovereignCoverUrl = ogUrl;
          }
        } catch (ogErr) {
          console.warn("[AUDIT] GitHub OG revalidation warning:", ogErr);
        }
      }
    } else if (sovereignCoverUrl && !sovereignCoverUrl.includes("supabase.co")) {
      try {
        const { ensureSovereignAsset } = await import("@/lib/asset-pipeline");
        sovereignCoverUrl = await ensureSovereignAsset(sovereignCoverUrl, { folder: "covers" });
      } catch (assetErr) {
        console.warn("[AUDIT] Cover asset ingestion warning:", assetErr);
      }
    }

    if (sovereignCoverUrl !== activeProject.coverImageUrl) {
      activeProject.coverImageUrl = sovereignCoverUrl;
    }

    const report = generateProjectAuditReport(activeProject, canonicalTechSlugs);

    const updated = await prisma.project.update({
      where: { id: activeProject.id },
      data: {
        coverImageUrl: sovereignCoverUrl,
        auditScore: report.score,
        auditBreakdown: report as any,
        auditedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        project: updated,
        report,
      },
    });
  } catch (error: any) {
    console.error("[AUDIT RECALCULATE ERROR]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to recalculate audit score." },
      { status: 500 }
    );
  }
}

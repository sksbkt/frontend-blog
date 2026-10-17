import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureProjectOgAsset } from "@/lib/assets/og-cache-manager";
import { revalidateTag } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).replace(/^drafts\./, "");

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: cleanId }, { slug: cleanId }],
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: `Project not found for id/slug "${cleanId}".` },
        { status: 404 }
      );
    }

    const repoUrl = project.repoUrl || project.githubUrl;
    if (!repoUrl) {
      return NextResponse.json(
        { success: false, message: "Project has no GitHub repository URL to fetch OpenGraph from." },
        { status: 400 }
      );
    }

    console.log(`[Admin Fetch-OG] Fetching & processing GitHub OG for ${project.slug} (${repoUrl})...`);
    const { highResUrl, lowResUrl } = await ensureProjectOgAsset(project.slug, repoUrl, {
      forceRefresh: true,
    });

    try {
      revalidateTag("projects", "max");
      revalidateTag(`project:${project.id}`, "max");
      revalidateTag(`project:${project.slug}`, "max");
    } catch {}

    return NextResponse.json({
      success: true,
      highResUrl,
      lowResUrl,
      message: `Successfully fetched and processed GitHub OpenGraph for "${project.title}".`,
    });
  } catch (error: any) {
    console.error("[Admin Fetch-OG] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch GitHub OpenGraph." },
      { status: 500 }
    );
  }
}

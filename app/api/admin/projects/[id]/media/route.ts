import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(
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

    // 1. Fetch AssetCache entries for this project
    const cacheRows = await prisma.assetCache.findMany({
      where: { projectSlug: project.slug },
    });

    const ogRow = cacheRows.find((r) => r.assetType === "GITHUB_OG");

    // 2. Query Supabase Storage for files under projects/captures/
    const supabase = getServiceSupabase();
    const { data: captureFiles } = await supabase.storage
      .from("projects")
      .list("captures", { search: project.slug });

    const capturesList: Array<{
      name: string;
      url: string;
      lowResUrl?: string | null;
      type: "SCREENSHOT" | "GIF";
    }> = [];

    // Add cached captures
    for (const row of cacheRows.filter((r) => r.assetType === "SCREENSHOT" || r.assetType === "GIF")) {
      capturesList.push({
        name: row.assetType === "GIF" ? `${project.slug}-preview.gif` : `${project.slug}-screenshot.webp`,
        url: row.highResUrl,
        lowResUrl: row.lowResUrl,
        type: row.assetType as "SCREENSHOT" | "GIF",
      });
    }

    // Also include storage bucket files if not already in list
    if (captureFiles) {
      for (const file of captureFiles) {
        if (!file.name.includes("-low.webp") && file.name.startsWith(project.slug)) {
          const { data } = supabase.storage.from("projects").getPublicUrl(`captures/${file.name}`);
          const isGif = file.name.endsWith(".gif");
          if (!capturesList.some((c) => c.url === data.publicUrl)) {
            let lowResUrl: string | undefined = undefined;
            if (!isGif) {
              const lowResName = file.name.replace(/-high\.webp$/, "-low.webp");
              const lowResData = supabase.storage.from("projects").getPublicUrl(`captures/${lowResName}`);
              lowResUrl = lowResData.data.publicUrl;
            }
            capturesList.push({
              name: file.name,
              url: data.publicUrl,
              lowResUrl: lowResUrl || null,
              type: isGif ? "GIF" : "SCREENSHOT",
            });
          }
        }
      }
    }

    // Check if coverImageUrl itself is from github-og or captures
    let githubOgUrl = ogRow?.highResUrl || null;
    let githubOgLowRes = ogRow?.lowResUrl || null;

    if (!githubOgUrl && project.coverImageUrl?.includes("/projects/github-og/")) {
      githubOgUrl = project.coverImageUrl;
      githubOgLowRes = project.lowResCoverUrl || null;
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        slug: project.slug,
        title: project.title,
        coverImageUrl: project.coverImageUrl,
        lowResCoverUrl: project.lowResCoverUrl,
        assetSource: project.assetSource,
        githubUrl: project.githubUrl || project.repoUrl,
      },
      githubOg: {
        exists: Boolean(githubOgUrl),
        url: githubOgUrl,
        lowResUrl: githubOgLowRes,
      },
      captures: capturesList,
    });
  } catch (error: any) {
    console.error("[Admin Media API] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load project media." },
      { status: 500 }
    );
  }
}

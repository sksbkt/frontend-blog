import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureSovereignAsset } from "@/lib/asset-pipeline";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { projectId, imageAssetId, imageUrl, alt, lowResUrl } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { success: false, message: "Project ID is required." },
        { status: 400 }
      );
    }

    const cleanId = projectId.replace(/^drafts\./, "");
    const rawCoverUrl = imageUrl || imageAssetId;

    if (!rawCoverUrl || typeof rawCoverUrl !== "string") {
      return NextResponse.json(
        { success: false, message: "A valid image URL is required." },
        { status: 400 }
      );
    }

    // If the image is already in Supabase Storage, keep its exact sovereign URL
    let resolvedCoverUrl = rawCoverUrl;
    if (!rawCoverUrl.includes("supabase.co/storage/v1/object/public/projects/")) {
      resolvedCoverUrl = await ensureSovereignAsset(rawCoverUrl, {
        folder: "covers",
        customFileName: `cover-${cleanId}-${Date.now().toString(36)}.png`,
      });
    }

    if (!resolvedCoverUrl) {
      return NextResponse.json(
        { success: false, message: "Failed to ingest sovereign asset." },
        { status: 500 }
      );
    }

    // Determine assetSource and lowResCoverUrl
    const assetSource = resolvedCoverUrl.includes("/github-og/")
      ? "GITHUB_OG"
      : resolvedCoverUrl.includes("/captures/")
      ? "GITHUB_ACTION_CAPTURE"
      : "USER_UPLOAD";

    let finalLowRes = lowResUrl || null;
    if (!finalLowRes) {
      const cacheRow = await prisma.assetCache.findFirst({
        where: { highResUrl: resolvedCoverUrl },
      });
      if (cacheRow?.lowResUrl) finalLowRes = cacheRow.lowResUrl;
    }

    // Update Project in PostgreSQL via Prisma
    const existing = await prisma.project.findFirst({
      where: {
        OR: [{ id: cleanId }, { slug: cleanId }],
      },
    });

    let updatedProject = null;
    if (existing) {
      updatedProject = await prisma.project.update({
        where: { id: existing.id },
        data: {
          coverImageUrl: resolvedCoverUrl,
          lowResCoverUrl: finalLowRes,
          assetSource,
        },
      });

      try {
        revalidateTag("projects", "max");
        revalidateTag(`project:${existing.id}`, "max");
        revalidateTag(`project:${existing.slug}`, "max");
      } catch {}
    }

    const formattedCoverRef = {
      _type: "image",
      alt: alt || "Cover Image",
      asset: {
        _id: resolvedCoverUrl,
        url: resolvedCoverUrl,
      },
    };

    return NextResponse.json({
      success: true,
      message: "Cover image successfully updated in Supabase PostgreSQL.",
      coverImage: formattedCoverRef,
      assetId: resolvedCoverUrl,
      project: updatedProject,
    });
  } catch (error) {
    console.error("[Set-Cover] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to set cover image.",
      },
      { status: 500 }
    );
  }
}

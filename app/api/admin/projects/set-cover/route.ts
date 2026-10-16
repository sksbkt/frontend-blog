import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { uploadProjectImage } from "@/lib/supabase";

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
    const { projectId, imageAssetId, imageUrl, alt } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { success: false, message: "Project ID is required." },
        { status: 400 }
      );
    }

    const cleanId = projectId.replace(/^drafts\./, "");
    let resolvedCoverUrl = imageUrl || imageAssetId;

    // If an external URL is passed without already being in Supabase Storage, download and persist to Supabase
    if (imageUrl && typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl) && !imageUrl.includes("supabase.co")) {
      try {
        let res = await fetch(imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], `cover-${cleanId}.png`, { type: blob.type || "image/png" });
          const uploadedUrl = await uploadProjectImage(file, cleanId);
          if (uploadedUrl) {
            resolvedCoverUrl = uploadedUrl;
          }
        }
      } catch (err) {
        console.warn("[Set-Cover] Warning persisting remote image to Supabase Storage, using direct URL:", err);
      }
    }

    if (!resolvedCoverUrl) {
      return NextResponse.json(
        { success: false, message: "A valid image URL is required." },
        { status: 400 }
      );
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

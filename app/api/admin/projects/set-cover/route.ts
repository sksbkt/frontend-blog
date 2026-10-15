import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { writeClient } from "@/lib/sanity/write-client";

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

    let finalAssetId = imageAssetId;

    // If an external URL is passed (e.g. GitHub raw URL or remote asset) without an existing Sanity asset ID:
    if (!finalAssetId && imageUrl && typeof imageUrl === "string") {
      try {
        let res = await fetch(imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        // If direct fetch fails (e.g. GitHub OpenGraph anti-bot 429), leverage Next.js image optimizer proxy
        if (!res.ok && (imageUrl.includes("opengraph.githubassets.com") || imageUrl.includes("github"))) {
          try {
            const optimizerUrl = new URL(
              `/_next/image?url=${encodeURIComponent(imageUrl)}&w=1200&q=75`,
              request.url
            ).toString();
            const optRes = await fetch(optimizerUrl);
            if (optRes.ok) {
              res = optRes;
            }
          } catch {}
        }

        if (!res.ok) {
          throw new Error(`Failed to download remote asset from: ${imageUrl}`);
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        const filename = imageUrl.split("/").pop()?.split("?")[0] || `cover-${Date.now()}.png`;

        const uploaded = await writeClient.assets.upload("image", buffer, {
          filename,
        });

        if (uploaded?._id) {
          finalAssetId = uploaded._id;
        }
      } catch (err: unknown) {
        console.error("[Set-Cover] Error uploading image to Sanity:", err);
        return NextResponse.json(
          {
            success: false,
            message: err instanceof Error ? err.message : "Failed to upload image buffer to Sanity.",
          },
          { status: 500 }
        );
      }
    }

    if (!finalAssetId) {
      return NextResponse.json(
        { success: false, message: "A valid Sanity asset ID or downloadable image URL is required." },
        { status: 400 }
      );
    }

    // Format strict Sanity Image Reference Object
    const formattedCoverRef = {
      _type: "image",
      alt: alt || "Cover Image",
      asset: {
        _type: "reference",
        _ref: finalAssetId,
      },
    };

    // Prepare patch: update coverImage and legacy image
    const patch = writeClient
      .patch(projectId)
      .set({
        coverImage: formattedCoverRef,
        image: formattedCoverRef,
      });

    // If project doesn't have this asset in gallery, append it to media assets
    const projectDoc = await writeClient.getDocument(projectId);
    const existingGallery = (projectDoc?.gallery || []) as Array<{
      asset?: { _ref?: string; _id?: string };
    }>;
    const alreadyInGallery = existingGallery.some(
      (item) => item.asset?._ref === finalAssetId || item.asset?._id === finalAssetId
    );

    if (!alreadyInGallery) {
      patch.setIfMissing({ gallery: [] }).append("gallery", [
        {
          _key: `media-${Date.now()}`,
          _type: "galleryImage",
          caption: alt || "Project Media Asset",
          alt: alt || "Project Media Asset",
          asset: {
            _type: "reference",
            _ref: finalAssetId,
          },
        },
      ]);
    }

    const updated = await patch.commit();

    // Invalidate Next.js cache tags for live views
    revalidateTag("projects", "max");
    revalidateTag(`project:${projectId}`, "max");
    const updatedSlug = (updated as { slug?: { current?: string } })?.slug?.current;
    if (updatedSlug) {
      revalidateTag(`project:${updatedSlug}`, "max");
    }

    return NextResponse.json({
      success: true,
      message: "Cover image successfully updated in Sanity CMS.",
      coverImage: formattedCoverRef,
      assetId: finalAssetId,
      project: updated,
    });
  } catch (error) {
    console.error("[Set-Cover] Mutation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to set cover image.",
      },
      { status: 500 }
    );
  }
}

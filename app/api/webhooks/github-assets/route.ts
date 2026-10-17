import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServiceSupabase } from "@/lib/supabase";
import { processAndStoreDualTier } from "@/lib/images/process-progressive";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let projectSlug = "";
    let assets: Array<{ name: string; buffer: Buffer; contentType: string }> = [];

    if (contentType.includes("application/json")) {
      const body = await request.json();
      projectSlug = body.projectSlug || body.slug || "";
      const rawAssets = body.assets || [];

      for (const item of rawAssets) {
        let buf: Buffer | null = null;
        let cType = item.contentType || "image/png";

        if (item.base64) {
          buf = Buffer.from(item.base64, "base64");
        } else if (item.url) {
          const res = await fetch(item.url);
          if (res.ok) {
            buf = Buffer.from(await res.arrayBuffer());
            const headerType = res.headers.get("content-type");
            if (headerType) cType = headerType;
          }
        }

        if (buf) {
          assets.push({
            name: item.name || "capture",
            buffer: buf,
            contentType: cType,
          });
        }
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      projectSlug = (formData.get("projectSlug") as string) || (formData.get("slug") as string) || "";

      for (const [key, value] of formData.entries()) {
        if (value && typeof value === "object" && "arrayBuffer" in value) {
          const file = value as File;
          const arrayBuf = await file.arrayBuffer();
          assets.push({
            name: file.name || key,
            buffer: Buffer.from(arrayBuf),
            contentType: file.type || "image/png",
          });
        }
      }
    }

    if (!projectSlug) {
      return NextResponse.json(
        { success: false, message: "projectSlug is required." },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ slug: projectSlug }, { id: projectSlug }],
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: `Project "${projectSlug}" not found.` },
        { status: 404 }
      );
    }

    const supabase = getServiceSupabase();
    const processedAssets: Array<{ name: string; highResUrl: string; lowResUrl?: string; type: string }> = [];
    let primaryHighRes: string | null = null;
    let primaryLowRes: string | null = null;

    for (const asset of assets) {
      const isGif = asset.contentType === "image/gif" || asset.name.toLowerCase().endsWith(".gif");
      const cleanName = asset.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");

      if (isGif) {
        // Direct upload GIF to projects/captures/[slug]-[name].gif
        const storagePath = `captures/${project.slug}-${cleanName}.gif`;
        const { error: uploadErr } = await supabase.storage
          .from("projects")
          .upload(storagePath, asset.buffer, {
            contentType: "image/gif",
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        const { data } = supabase.storage.from("projects").getPublicUrl(storagePath);
        const gifUrl = data.publicUrl;

        // Invalidate pre-existing GIF captures for this project
        await prisma.assetCache.deleteMany({
          where: { projectSlug: project.slug, assetType: "GIF" },
        });

        // Record in AssetCache
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        await prisma.assetCache.create({
          data: {
            projectSlug: project.slug,
            assetType: "GIF",
            highResUrl: gifUrl,
            expiresAt,
          },
        });

        processedAssets.push({
          name: asset.name,
          highResUrl: gifUrl,
          type: "GIF",
        });
      } else {
        // Static Screenshot: process dual-tier WebP
        const { highResUrl, lowResUrl } = await processAndStoreDualTier(
          asset.buffer,
          "captures",
          `${project.slug}-${cleanName}`
        );

        // Invalidate pre-existing SCREENSHOT captures for this project
        await prisma.assetCache.deleteMany({
          where: { projectSlug: project.slug, assetType: "SCREENSHOT" },
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        await prisma.assetCache.create({
          data: {
            projectSlug: project.slug,
            assetType: "SCREENSHOT",
            highResUrl,
            lowResUrl,
            expiresAt,
          },
        });

        if (!primaryHighRes) {
          primaryHighRes = highResUrl;
          primaryLowRes = lowResUrl;
        }

        processedAssets.push({
          name: asset.name,
          highResUrl,
          lowResUrl,
          type: "SCREENSHOT",
        });
      }
    }

    // Update Project record if static captures were provided
    if (primaryHighRes) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          coverImageUrl: primaryHighRes,
          lowResCoverUrl: primaryLowRes,
          assetSource: "GITHUB_ACTION_CAPTURE",
        },
      });
    }

    try {
      revalidateTag("projects", "max");
      revalidateTag(`project:${project.id}`, "max");
      revalidateTag(`project:${project.slug}`, "max");
    } catch {}

    return NextResponse.json({
      success: true,
      projectSlug: project.slug,
      processedCount: processedAssets.length,
      assets: processedAssets,
      message: `Successfully processed ${processedAssets.length} capture asset(s) for "${project.slug}".`,
    });
  } catch (error: any) {
    console.error("[Webhook Assets Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process visual assets." },
      { status: 500 }
    );
  }
}

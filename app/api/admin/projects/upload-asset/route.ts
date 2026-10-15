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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const caption = (formData.get("caption") as string | null) || "";
    const isCover = formData.get("isCover") === "true";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided in form data." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Sanity
    const isVideo = file.type.startsWith("video/");
    const assetType = isVideo ? "file" : "image";

    const uploadedAsset = await writeClient.assets.upload(assetType, buffer, {
      filename: file.name,
      contentType: file.type,
    });

    if (!uploadedAsset?._id) {
      throw new Error("Failed to upload asset to Sanity.");
    }

    let galleryItem = null;

    // If projectId is provided, update project document
    if (projectId) {
      const patch = writeClient.patch(projectId);

      if (isVideo) {
        patch.set({
          "video.enabled": true,
          "video.asset": {
            _type: "reference",
            _ref: uploadedAsset._id,
          },
        });
      } else {
        const itemKey = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        galleryItem = {
          _key: itemKey,
          _type: "galleryImage",
          caption: caption || file.name,
          alt: caption || file.name,
          asset: {
            _type: "reference",
            _ref: uploadedAsset._id,
          },
        };

        // Append to gallery
        patch.setIfMissing({ gallery: [] });
        patch.append("gallery", [galleryItem]);

        if (isCover) {
          patch.set({
            coverImage: {
              _type: "image",
              alt: caption || file.name,
              asset: {
                _type: "reference",
                _ref: uploadedAsset._id,
              },
            },
          });
        }
      }

      await patch.commit();

      revalidateTag("projects", "max");
      revalidateTag(`project:${projectId}`, "max");
    }

    return NextResponse.json({
      success: true,
      asset: {
        _id: uploadedAsset._id,
        url: uploadedAsset.url,
      },
      galleryItem,
      message: "Asset uploaded successfully to Sanity!",
    });
  } catch (error) {
    console.error("Upload asset error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload asset.",
      },
      { status: 500 }
    );
  }
}

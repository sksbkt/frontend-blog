import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writeClient } from "@/lib/sanity/write-client";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 },
    );
  }

  try {
    const projects = await writeClient.fetch(
      `*[_type == "project"] | order(_createdAt desc){
        _id,
        _createdAt,
        _updatedAt,
        title,
        slug,
        description,
        technologies,
        github,
        demo,
        featured,
        content,
        "image": select(
          defined(image.asset->url) => { "_id": image.asset->_id, "url": image.asset->url, "_ref": image.asset->_id },
          defined(image.asset.url) => { "_id": image.asset._id, "url": image.asset.url, "_ref": image.asset._ref },
          null
        ),
        coverImage{
          alt,
          _type,
          "asset": select(
            defined(asset->url) => { "_id": asset->_id, "url": asset->url, "_ref": asset->_id },
            defined(asset.url) => { "_id": asset._id, "url": asset.url, "_ref": asset._ref },
            null
          )
        },
        gallery[]{
          alt,
          caption,
          _key,
          _type,
          "asset": select(
            defined(asset->url) => { "_id": asset->_id, "url": asset->url, "_ref": asset->_id },
            defined(asset.url) => { "_id": asset._id, "url": asset.url, "_ref": asset._ref },
            null
          )
        },
        video{
          enabled,
          url,
          "asset": select(
            defined(asset->url) => { "_id": asset->_id, "url": asset->url },
            defined(asset.url) => { "_id": asset._id, "url": asset.url },
            null
          )
        },
        previewGif{
          enabled,
          alt,
          _type,
          "asset": select(
            defined(asset->url) => { "_id": asset->_id, "url": asset->url, "_ref": asset->_id },
            defined(asset.url) => { "_id": asset._id, "url": asset.url, "_ref": asset._ref },
            null
          )
        },
        "isDraft": _id in path("drafts.**")
      }`,
    );

    const drafts = projects.filter((p: { isDraft: boolean }) => p.isDraft);
    const published = projects.filter((p: { isDraft: boolean }) => !p.isDraft);

    return NextResponse.json({
      success: true,
      drafts,
      published,
      all: projects,
    });
  } catch (error) {
    console.error("Admin fetch projects error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch projects.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, message: "Project ID is required." },
        { status: 400 },
      );
    }

    if (action === "publish") {
      const draftDoc = await writeClient.getDocument(id);

      if (!draftDoc) {
        return NextResponse.json(
          { success: false, message: "Draft document not found." },
          { status: 404 },
        );
      }

      const publishedId = id.replace(/^drafts\./, "");
      const { _rev, ...cleanDraft } = draftDoc;
      const publishedDoc = {
        ...cleanDraft,
        _id: publishedId,
      };

      await writeClient
        .transaction()
        .createOrReplace(publishedDoc)
        .delete(id)
        .commit();

      return NextResponse.json({
        success: true,
        message: "Project published successfully to portfolio!",
        publishedId,
      });
    }

    if (action === "unpublish") {
      const publishedDoc = await writeClient.getDocument(id);

      if (!publishedDoc) {
        return NextResponse.json(
          { success: false, message: "Project document not found." },
          { status: 404 },
        );
      }

      const draftId = id.startsWith("drafts.") ? id : `drafts.${id}`;
      const { _rev, ...cleanDoc } = publishedDoc;
      const draftDoc = {
        ...cleanDoc,
        _id: draftId,
      };

      await writeClient
        .transaction()
        .createOrReplace(draftDoc)
        .delete(id)
        .commit();

      return NextResponse.json({
        success: true,
        message: "Project moved to drafts.",
        draftId,
      });
    }

    return NextResponse.json(
      { success: false, message: `Unsupported action: "${action}"` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Admin project action error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Project action failed.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { id, data } = body;

    if (!id || typeof id !== "string" || !data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, message: "Project ID and update data are required." },
        { status: 400 },
      );
    }

    // Prepare patch
    const patch = writeClient.patch(id);
    const allowedFields = [
      "title",
      "slug",
      "description",
      "technologies",
      "github",
      "demo",
      "featured",
      "content",
      "coverImage",
      "gallery",
      "video",
      "previewGif",
      "image",
    ];

    const patchData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in data) {
        if (field === "slug" && typeof data.slug === "string") {
          patchData.slug = { _type: "slug", current: data.slug };
        } else if (field === "coverImage") {
          // Handled specially below
        } else if (field === "gallery") {
          // Handled specially below
        } else if (field === "previewGif") {
          // Handled specially below
        } else {
          patchData[field] = data[field];
        }
      }
    }

    // Process coverImage and sync with legacy image field
    if ("coverImage" in data && data.coverImage) {
      let finalAssetRef = data.coverImage.asset?._id || data.coverImage.asset?._ref;
      const targetUrl = data.coverImage.asset?.url;

      // If we only have an external URL (e.g. GitHub OpenGraph), upload it directly to Sanity Assets pipeline
      if (!finalAssetRef && targetUrl && /^https?:\/\//i.test(targetUrl)) {
        try {
          const imgRes = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; PortfolioAdmin/1.0)",
            },
          });
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const uploaded = await writeClient.assets.upload("image", buffer, {
              filename: `cover-${id.replace(/[^a-zA-Z0-9_-]/g, "")}.png`,
            });
            if (uploaded?._id) {
              finalAssetRef = uploaded._id;
            }
          }
        } catch (uploadErr) {
          console.warn("[Admin PATCH] Warning uploading external cover image to Sanity:", uploadErr);
        }
      }

      if (finalAssetRef) {
        patchData.coverImage = {
          _type: "image",
          alt: data.coverImage.alt || "Cover Image",
          asset: {
            _type: "reference",
            _ref: finalAssetRef,
          },
        };
        // Also update legacy image field so any component querying 'image' immediately reflects the change
        patchData.image = {
          _type: "image",
          alt: data.coverImage.alt || "Cover Image",
          asset: {
            _type: "reference",
            _ref: finalAssetRef,
          },
        };
      } else {
        patchData.coverImage = data.coverImage;
      }
    }

    // Process gallery items
    if ("gallery" in data && Array.isArray(data.gallery)) {
      patchData.gallery = data.gallery.map((item: any, idx: number) => {
        const assetRef = item.asset?._id || item.asset?._ref;
        return {
          _key: item._key || `gallery-${Date.now()}-${idx}`,
          _type: "galleryImage",
          caption: item.caption || "",
          alt: item.alt || item.caption || "Gallery Image",
          ...(assetRef
            ? {
                asset: {
                  _type: "reference",
                  _ref: assetRef,
                },
              }
            : item.asset
            ? { asset: item.asset }
            : {}),
        };
      });
    }

    // Process previewGif
    if ("previewGif" in data && data.previewGif) {
      const assetRef = data.previewGif.asset?._id || data.previewGif.asset?._ref;
      patchData.previewGif = {
        _type: "image",
        enabled: data.previewGif.enabled !== false,
        ...(assetRef
          ? {
              asset: {
                _type: "reference",
                _ref: assetRef,
              },
            }
          : data.previewGif.asset
          ? { asset: data.previewGif.asset }
          : {}),
      };
    }

    await patch.set(patchData).commit();

    return NextResponse.json({
      success: true,
      message: "Project updated successfully.",
      coverImage: patchData.coverImage,
    });
  } catch (error) {
    console.error("Admin patch project error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update project.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Project ID is required." },
      { status: 400 },
    );
  }

  try {
    await writeClient.delete(id);

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully.",
    });
  } catch (error) {
    console.error("Admin delete project error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete project.",
      },
      { status: 500 },
    );
  }
}

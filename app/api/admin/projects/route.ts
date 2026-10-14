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
        image,
        coverImage{
          ...,
          asset->{
            _id,
            url
          }
        },
        gallery[]{
          ...,
          asset->{
            _id,
            url
          }
        },
        video{
          enabled,
          url,
          asset->{
            _id,
            url
          }
        },
        previewGif{
          ...,
          asset->{
            _id,
            url
          }
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
        } else {
          patchData[field] = data[field];
        }
      }
    }

    await patch.set(patchData).commit();

    return NextResponse.json({
      success: true,
      message: "Project updated successfully.",
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

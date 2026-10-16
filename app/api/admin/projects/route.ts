import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { mapPrismaToAdminProject } from "@/lib/services/project-service";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const projects = await prisma.project.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    const adminProjects = projects.map(mapPrismaToAdminProject);
    const drafts = adminProjects.filter((p) => p.isDraft);
    const published = adminProjects.filter((p) => !p.isDraft);

    return NextResponse.json({
      success: true,
      drafts,
      published,
      all: adminProjects,
    });
  } catch (error) {
    console.error("[Admin GET projects] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch projects.",
      },
      { status: 500 }
    );
  }
}

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
    const { action, id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, message: "Project ID is required." },
        { status: 400 }
      );
    }

    const cleanId = id.replace(/^drafts\./, "");
    const targetProject = await prisma.project.findFirst({
      where: {
        OR: [{ id: cleanId }, { slug: cleanId }],
      },
    });

    if (!targetProject) {
      return NextResponse.json(
        { success: false, message: "Project document not found in database." },
        { status: 404 }
      );
    }

    if (action === "publish") {
      const updated = await prisma.project.update({
        where: { id: targetProject.id },
        data: { isPublished: true },
      });

      try {
        revalidateTag("projects", "max");
        revalidateTag(`project:${updated.slug}`, "max");
        revalidateTag(`project:${updated.id}`, "max");
      } catch {}

      return NextResponse.json({
        success: true,
        message: "Project published successfully to portfolio!",
        publishedId: updated.id,
      });
    }

    if (action === "unpublish") {
      const updated = await prisma.project.update({
        where: { id: targetProject.id },
        data: { isPublished: false },
      });

      try {
        revalidateTag("projects", "max");
        revalidateTag(`project:${updated.slug}`, "max");
        revalidateTag(`project:${updated.id}`, "max");
      } catch {}

      return NextResponse.json({
        success: true,
        message: "Project moved to drafts.",
        draftId: `drafts.${updated.id}`,
      });
    }

    return NextResponse.json(
      { success: false, message: `Unsupported action: "${action}"` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Admin POST project action] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Project action failed.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const rawId = body.id || body._id;
    const data = body.data || body;

    if (!rawId || typeof rawId !== "string" || !data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, message: "Project ID and update data are required." },
        { status: 400 }
      );
    }

    const cleanId = rawId.replace(/^drafts\./, "");
    const existing = await prisma.project.findFirst({
      where: {
        OR: [{ id: cleanId }, { slug: cleanId }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Project not found in database." },
        { status: 404 }
      );
    }

    // Resolve cover image URL if provided
    let coverImageUrl: string | undefined = undefined;
    if (data.coverImage) {
      coverImageUrl =
        data.coverImage.asset?.url ||
        data.coverImage.url ||
        (typeof data.coverImage === "string" ? data.coverImage : undefined);
    } else if (data.image) {
      coverImageUrl =
        data.image.asset?.url ||
        data.image.url ||
        (typeof data.image === "string" ? data.image : undefined);
    }

    const updatePayload: Record<string, any> = {};

    if (data.title) {
      updatePayload.title =
        typeof data.title === "object" ? data.title.en || data.title.fa : data.title;
    }

    if (data.slug) {
      updatePayload.slug =
        typeof data.slug === "object" ? data.slug.current : data.slug;
    }

    if (data.description) {
      if (typeof data.description === "object") {
        if (data.description.en !== undefined) updatePayload.taglineEn = data.description.en;
        if (data.description.fa !== undefined) updatePayload.taglineFa = data.description.fa;
      } else {
        updatePayload.taglineEn = data.description;
      }
    }

    if (data.content?.overview) {
      if (typeof data.content.overview === "object") {
        if (data.content.overview.en !== undefined) updatePayload.descriptionEn = data.content.overview.en;
        if (data.content.overview.fa !== undefined) updatePayload.descriptionFa = data.content.overview.fa;
      }
    }

    if (Array.isArray(data.technologies)) {
      updatePayload.technologies = data.technologies;
    }

    if (data.github !== undefined) {
      updatePayload.githubUrl = data.github;
    }

    if (data.demo !== undefined) {
      updatePayload.liveUrl = data.demo;
    }

    if (data.featured !== undefined) {
      updatePayload.featured = Boolean(data.featured);
    }

    if (coverImageUrl) {
      updatePayload.coverImageUrl = coverImageUrl;
    }

    if (data.aiContextDigest !== undefined) {
      updatePayload.aiContextDigest = data.aiContextDigest;
    }

    if (data.languages !== undefined) {
      updatePayload.languages = data.languages;
    }

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: updatePayload,
    });

    try {
      revalidateTag("projects", "max");
      revalidateTag(`project:${updated.id}`, "max");
      revalidateTag(`project:${updated.slug}`, "max");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Project updated successfully in PostgreSQL.",
      project: mapPrismaToAdminProject(updated),
    });
  } catch (error) {
    console.error("[Admin PATCH project] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update project.",
      },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;

export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("id");

  if (!rawId) {
    return NextResponse.json(
      { success: false, message: "Project ID is required." },
      { status: 400 }
    );
  }

  const cleanId = rawId.replace(/^drafts\./, "");

  try {
    const existing = await prisma.project.findFirst({
      where: {
        OR: [{ id: cleanId }, { slug: cleanId }],
      },
    });

    if (existing) {
      await prisma.project.delete({
        where: { id: existing.id },
      });

      try {
        revalidateTag("projects", "max");
        revalidateTag(`project:${existing.slug}`, "max");
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully from database.",
    });
  } catch (error) {
    console.error("[Admin DELETE project] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete project.",
      },
      { status: 500 }
    );
  }
}

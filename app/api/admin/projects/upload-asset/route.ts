import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { uploadProjectImage } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

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

    const cleanId = projectId ? projectId.replace(/^drafts\./, "") : undefined;

    // Upload to Supabase Storage "projects" bucket
    const publicUrl = await uploadProjectImage(file, cleanId || "asset");

    const galleryItem = {
      _key: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      _type: "galleryImage",
      caption: caption || file.name,
      alt: caption || file.name,
      asset: {
        _id: publicUrl,
        url: publicUrl,
      },
    };

    // If projectId is provided, update project in Prisma
    if (cleanId) {
      const existing = await prisma.project.findFirst({
        where: {
          OR: [{ id: cleanId }, { slug: cleanId }],
        },
      });

      if (existing) {
        await prisma.project.update({
          where: { id: existing.id },
          data: {
            ...(isCover ? { coverImageUrl: publicUrl } : {}),
          },
        });

        try {
          revalidateTag("projects", "max");
          revalidateTag(`project:${existing.id}`, "max");
          revalidateTag(`project:${existing.slug}`, "max");
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      asset: {
        _id: publicUrl,
        url: publicUrl,
      },
      galleryItem,
      message: "Asset uploaded successfully to Supabase Storage!",
    });
  } catch (error) {
    console.error("[Upload-Asset] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload asset.",
      },
      { status: 500 }
    );
  }
}

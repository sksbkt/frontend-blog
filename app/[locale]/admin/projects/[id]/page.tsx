import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { mapPrismaToAdminProject } from "@/lib/services/project-service";
import { ProjectFullPageEditor } from "@/components/admin/project-full-page-editor";
import { NotFoundDraftGenerator } from "@/components/admin/not-found-draft-generator";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import type { SanityProject } from "@/components/admin/types";

export const metadata: Metadata = {
  title: "Project Editor | Portfolio Admin Studio",
  description: "Dedicated full-page project content, story, and media editor.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProjectEditorPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ProjectEditorPage({ params }: ProjectEditorPageProps) {
  const { locale, id } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/admin`);
  }

  const decodedId = decodeURIComponent(id);

  let project: SanityProject | null = null;

  try {
    const cleanId = decodedId.replace(/^drafts\./, "");
    const dbProject = await prisma.project.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { slug: cleanId },
          { githubUrl: { contains: cleanId } },
          { title: cleanId },
        ],
      },
    });

    if (dbProject) {
      project = mapPrismaToAdminProject(dbProject) as SanityProject;
    }
  } catch (err) {
    console.error("[ProjectEditorPage] Error querying project from database:", err);
  }

  // Check if repository is private on GitHub
  let isPrivateRepo = false;
  try {
    const rawRepo = project?.github
      ? project.github.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "")
      : `${session.user.login}/${decodedId.replace(/^drafts\./, "")}`;

    if (rawRepo.includes("/")) {
      const ghRes = await fetch(`https://api.github.com/repos/${rawRepo}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Portfolio-Admin-CMS",
        },
        cache: "no-store",
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        isPrivateRepo = Boolean(ghData.private);
      }
    }
  } catch {}

  // If no project exists yet in Sanity, initialize clean default draft with empty fields
  const finalProject: SanityProject = project || {
    _id: decodedId.startsWith("drafts.") ? decodedId : `drafts.${decodedId}`,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    title: { en: "", fa: "" },
    slug: { current: decodedId.replace(/^drafts\./, "") },
    description: { en: "", fa: "" },
    technologies: [],
    github: decodedId.replace(/^drafts\./, "").includes("/")
      ? `https://github.com/${decodedId.replace(/^drafts\./, "")}`
      : `https://github.com/${session.user.login}/${decodedId.replace(/^drafts\./, "")}`,
    demo: "",
    featured: false,
    content: {
      overview: { en: "", fa: "" },
      challenges: { en: "", fa: "" },
      outcome: { en: "", fa: "" },
    },
    isDraft: true,
  };

  return (
    <main className="admin-page min-h-screen bg-background text-foreground transition-colors duration-200">
      <ProjectFullPageEditor
        initialProject={finalProject}
        locale={locale}
        isPrivateRepo={isPrivateRepo}
      />
    </main>
  );
}

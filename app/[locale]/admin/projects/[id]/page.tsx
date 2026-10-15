import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { writeClient } from "@/lib/sanity/write-client";
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
  const draftId = decodedId.startsWith("drafts.") ? decodedId : `drafts.${decodedId}`;

  let project: SanityProject | null = null;

  try {
    const docs = await writeClient.fetch<SanityProject[]>(
      `*[_type == "project" && (_id == $id || _id == $draftId || slug.current == $id || github match $id || title.en == $id)] | order(_updatedAt desc){
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
        aiContextDigest,
        rawLanguages,
        "languages": languages[]{
          _key,
          name,
          percentage,
          color,
          bytes
        },
        "isDraft": string::startsWith(_id, "drafts."),
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
          alt,
          "asset": select(
            defined(asset->url) => { "_id": asset->_id, "url": asset->url },
            defined(asset.url) => { "_id": asset._id, "url": asset.url },
            null
          )
        }
      }`,
      { id: decodedId, draftId }
    );

    // Prioritize draft document if available, then fallback to most recent document
    project = docs.find((d) => d._id.startsWith("drafts.")) || docs[0] || null;
  } catch (err) {
    console.error("[ProjectEditorPage] Error querying Sanity project:", err);
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
    title: { en: decodedId.replace(/^drafts\./, ""), fa: "" },
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

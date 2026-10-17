/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 * 
 * Project Draft Creation Service
 * Persists AI-analyzed and imported project drafts directly into PostgreSQL via Prisma
 * and routes all cover imagery through Universal Sovereign Asset Pipeline (Supabase Storage).
 */

import { prisma } from "@/lib/prisma";
import { ensureSovereignAsset } from "@/lib/asset-pipeline";
import { revalidateTag } from "next/cache";

type LocalizedText = {
  en: string;
  fa: string;
};

type TechnologyInput = {
  name: string;
  description: string;
};

type ProjectDraftInput = {
  title: LocalizedText;
  slug: string;
  description: LocalizedText;
  technologies: TechnologyInput[];
  github: string;
  demo: string;
  content: {
    overview: LocalizedText;
    challenges: LocalizedText;
    outcome: LocalizedText;
  };
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateUrl(value: string, fieldName: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error(`${fieldName} must be a valid URL.`);
  }
}

function validateProject(project: ProjectDraftInput) {
  if (!project.title.en.trim() || !project.title.fa.trim()) {
    throw new Error("Project title is required.");
  }

  if (!project.description.en.trim() || !project.description.fa.trim()) {
    throw new Error("Project description is required.");
  }

  if (!project.github.trim()) {
    throw new Error("GitHub URL is required.");
  }

  validateUrl(project.github, "GitHub URL");

  if (project.demo.trim()) {
    validateUrl(project.demo, "Demo URL");
  }

  if (project.technologies.length === 0) {
    throw new Error("At least one technology is required.");
  }

  for (const technology of project.technologies) {
    if (!technology.name.trim()) {
      throw new Error("Technology name cannot be empty.");
    }
  }

  if (
    !project.content.overview.en.trim() ||
    !project.content.overview.fa.trim()
  ) {
    throw new Error("Project overview is required.");
  }
}

function getGitHubSocialImageUrl(githubUrl: string): string | null {
  try {
    const url = new URL(githubUrl);
    if (url.hostname !== "github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repository = parts[1].replace(/\.git$/, "");
    return `https://opengraph.githubassets.com/1/${owner}/${repository}`;
  } catch {
    return null;
  }
}

export async function createProjectDraft(project: ProjectDraftInput) {
  const normalizedSlug = normalizeSlug(project.slug || project.title.en);

  validateProject({
    ...project,
    slug: normalizedSlug,
  });

  // Ingest cover image into Supabase Storage
  let sovereignCoverUrl: string | null = null;
  const ogUrl = getGitHubSocialImageUrl(project.github);
  if (ogUrl) {
    try {
      sovereignCoverUrl = await ensureSovereignAsset(ogUrl, {
        folder: "covers",
        customFileName: `${normalizedSlug}-og.png`,
      });
    } catch (err) {
      console.warn("[ProjectDraft] Warning ingesting sovereign OG image:", err);
    }
  }

  const techNames = project.technologies.map((t) => t.name.trim()).filter(Boolean);

  // Persist directly into PostgreSQL via Prisma
  const savedProject = await prisma.project.upsert({
    where: { slug: normalizedSlug },
    create: {
      slug: normalizedSlug,
      title: project.title.en,
      taglineEn: project.description.en,
      taglineFa: project.description.fa,
      descriptionEn: project.content.overview.en,
      descriptionFa: project.content.overview.fa,
      coverImageUrl: sovereignCoverUrl,
      githubUrl: project.github,
      liveUrl: project.demo || null,
      isPublished: false,
      featured: false,
      technologies: techNames,
    },
    update: {
      title: project.title.en,
      taglineEn: project.description.en,
      taglineFa: project.description.fa,
      descriptionEn: project.content.overview.en,
      descriptionFa: project.content.overview.fa,
      coverImageUrl: sovereignCoverUrl || undefined,
      githubUrl: project.github,
      liveUrl: project.demo || null,
      technologies: techNames,
    },
  });

  try {
    revalidateTag("projects", "max");
    revalidateTag(`project:${savedProject.id}`, "max");
    revalidateTag(`project:${savedProject.slug}`, "max");
  } catch {}

  return {
    _id: savedProject.id,
    id: savedProject.id,
    slug: savedProject.slug,
    project: savedProject,
  };
}

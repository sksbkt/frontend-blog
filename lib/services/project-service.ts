import { prisma } from "@/lib/prisma";
import type { Project } from "@/types/project";
import { getGitHubOpenGraphUrl } from "@/lib/sanity/mappers";

export function mapPrismaProjectToDomain(p: {
  id: string;
  slug: string;
  title: string;
  taglineEn: string;
  taglineFa: string;
  descriptionEn: string;
  descriptionFa: string;
  coverImageUrl?: string | null;
  githubUrl?: string | null;
  liveUrl?: string | null;
  order: number;
  isPublished: boolean;
  featured: boolean;
  technologies: string[];
  languages?: unknown;
  aiContextDigest?: unknown;
}): Project {
  const openGraphImage = getGitHubOpenGraphUrl(p.githubUrl || undefined) ?? undefined;
  const image = p.coverImageUrl || openGraphImage || "/images/projects/frontend-blog.jpg";

  return {
    id: p.id,
    title: {
      en: p.title || p.slug,
      fa: p.taglineFa || p.title || p.slug,
    },
    slug: p.slug,
    description: {
      en: p.taglineEn || p.title || "",
      fa: p.taglineFa || p.title || "",
    },
    image,
    coverImage: p.coverImageUrl || undefined,
    openGraphImage,
    technologies: p.technologies || [],
    github: p.githubUrl || undefined,
    demo: p.liveUrl || undefined,
    featured: p.featured,
    content: {
      overview: {
        en: p.descriptionEn || p.taglineEn || "",
        fa: p.descriptionFa || p.taglineFa || "",
      },
      challenges: {
        en: "",
        fa: "",
      },
      outcome: {
        en: "",
        fa: "",
      },
    },
    languages: Array.isArray(p.languages) ? (p.languages as any) : [],
    aiContextDigest: (p.aiContextDigest as any) || null,
  };
}

/**
 * Fetch all published projects ordered by display order and creation date.
 */
export async function getDbProjects(): Promise<Project[]> {
  try {
    const projects = await prisma.project.findMany({
      where: { isPublished: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return projects.map(mapPrismaProjectToDomain);
  } catch (error) {
    console.error("[ProjectService] Failed to fetch projects from database:", error);
    return [];
  }
}

/**
 * Fetch a single project by slug from the database.
 */
export async function getDbProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { slug },
    });
    if (!project) return null;
    return mapPrismaProjectToDomain(project);
  } catch (error) {
    console.error(`[ProjectService] Failed to fetch project '${slug}' from database:`, error);
    return null;
  }
}

/**
 * Fetch featured projects for homepage showcase.
 */
export async function getDbFeaturedProjects(): Promise<Project[]> {
  try {
    const projects = await prisma.project.findMany({
      where: {
        isPublished: true,
        featured: true,
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return projects.map(mapPrismaProjectToDomain);
  } catch (error) {
    console.error("[ProjectService] Failed to fetch featured projects:", error);
    return [];
  }
}

/**
 * Maps a Prisma Project record to the admin editor format.
 */
export function mapPrismaToAdminProject(p: any) {
  return {
    _id: p.id,
    _createdAt: p.createdAt?.toISOString?.() || new Date().toISOString(),
    _updatedAt: p.updatedAt?.toISOString?.() || new Date().toISOString(),
    title: {
      en: p.title || p.slug,
      fa: p.taglineFa || p.title || p.slug,
    },
    slug: { current: p.slug },
    description: {
      en: p.taglineEn || p.title || "",
      fa: p.taglineFa || p.title || "",
    },
    technologies: p.technologies || [],
    github: p.githubUrl || "",
    demo: p.liveUrl || undefined,
    featured: p.featured,
    content: {
      overview: {
        en: p.descriptionEn || p.taglineEn || "",
        fa: p.descriptionFa || p.taglineFa || "",
      },
      challenges: { en: "", fa: "" },
      outcome: { en: "", fa: "" },
    },
    isDraft: !p.isPublished,
    coverImage: p.coverImageUrl
      ? { asset: { url: p.coverImageUrl, _id: p.coverImageUrl } }
      : undefined,
    image: p.coverImageUrl
      ? { asset: { url: p.coverImageUrl, _id: p.coverImageUrl } }
      : undefined,
    aiContextDigest: p.aiContextDigest || undefined,
    languages: Array.isArray(p.languages) ? p.languages : undefined,
  };
}

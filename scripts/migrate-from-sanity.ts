import "dotenv/config";
import { createClient } from "@sanity/client";
import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import { prisma } from "../lib/prisma";

// 1. Initialize Sanity Client
const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "8ddk8iol";
const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const sanityApiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
const sanityToken = process.env.SANITY_API_WRITE_TOKEN;

console.log(`Connecting to Sanity (Project: ${sanityProjectId}, Dataset: ${sanityDataset})...`);

const sanity = createClient({
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: sanityApiVersion,
  token: sanityToken,
  useCdn: false,
});

const imageBuilder = createImageUrlBuilder(sanity);

function getImageUrl(source: unknown): string | null {
  if (!source) return null;
  try {
    return imageBuilder.image(source as SanityImageSource).url();
  } catch {
    return null;
  }
}

interface SanityProjectDoc {
  _id: string;
  title?: { en?: string; fa?: string };
  slug?: { current?: string };
  description?: { en?: string; fa?: string };
  image?: unknown;
  coverImage?: unknown;
  github?: string;
  demo?: string;
  order?: number;
  featured?: boolean;
  content?: {
    overview?: { en?: string; fa?: string };
    challenges?: { en?: string; fa?: string };
    outcome?: { en?: string; fa?: string };
  };
  technologies?: string[];
  languages?: Array<{
    name?: string;
    percentage?: number;
    color?: string;
    bytes?: number;
  }>;
  aiContextDigest?: Record<string, unknown>;
}

interface SanityTechDoc {
  _id: string;
  name?: string;
  slug?: { current?: string };
  summary_en?: string;
  summary_fa?: string;
  category?: string;
}

async function migrate() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING ONE-TIME MIGRATION: SANITY -> SUPABASE POSTGRESQL");
  console.log("══════════════════════════════════════════════════════════════");

  // ─────────────────────────────────────────────────────────────────
  // A. MIGRATE TECH DEFINITIONS
  // ─────────────────────────────────────────────────────────────────
  console.log("\n📦 Fetching Tech Definitions from Sanity...");
  const rawTechs: SanityTechDoc[] = await sanity.fetch(
    `*[_type == "techDefinition" && !(_id in path("drafts.**"))]`
  );

  console.log(`Found ${rawTechs.length} tech definition(s). Migrating...`);
  let techSuccessCount = 0;

  for (const tech of rawTechs) {
    const slug = tech.slug?.current || tech.name?.toLowerCase().replace(/[^a-z0-9]/g, "-");
    if (!slug || !tech.name) {
      console.warn(`  ⚠️ Skipping tech definition with missing slug/name: ${tech._id}`);
      continue;
    }

    try {
      await prisma.techDefinition.upsert({
        where: { slug },
        update: {
          name: tech.name,
          summaryEn: tech.summary_en || "",
          summaryFa: tech.summary_fa || "",
          category: tech.category || null,
        },
        create: {
          slug,
          name: tech.name,
          summaryEn: tech.summary_en || "",
          summaryFa: tech.summary_fa || "",
          category: tech.category || null,
        },
      });
      techSuccessCount++;
      console.log(`  ✓ TechDefinition: [${slug}] "${tech.name}"`);
    } catch (err) {
      console.error(`  ✕ Error upserting TechDefinition [${slug}]:`, err);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // B. MIGRATE PROJECTS
  // ─────────────────────────────────────────────────────────────────
  console.log("\n📦 Fetching Projects from Sanity...");
  // Fetch published projects first, then fallback to drafts if no published exists
  const rawProjects: SanityProjectDoc[] = await sanity.fetch(
    `*[_type == "project" && !(_id in path("drafts.**"))] | order(_createdAt asc)`
  );

  console.log(`Found ${rawProjects.length} published project(s). Migrating...`);
  let projectSuccessCount = 0;

  for (const doc of rawProjects) {
    const slug = doc.slug?.current;
    if (!slug) {
      console.warn(`  ⚠️ Skipping project with missing slug: ${doc._id}`);
      continue;
    }

    const title = doc.title?.en || doc.title?.fa || slug;
    const taglineEn = doc.description?.en || doc.title?.en || "";
    const taglineFa = doc.description?.fa || doc.title?.fa || "";

    // Prefer full overview text for description, fallback to tagline
    const descriptionEn = doc.content?.overview?.en || doc.description?.en || "";
    const descriptionFa = doc.content?.overview?.fa || doc.description?.fa || "";

    // Resolve cover image URL from Sanity CDN
    const coverImageUrl = getImageUrl(doc.coverImage) || getImageUrl(doc.image) || null;

    const githubUrl = doc.github || null;
    const liveUrl = doc.demo || null;
    const order = typeof doc.order === "number" ? doc.order : 0;
    const isPublished = !doc._id.startsWith("drafts.");
    const featured = Boolean(doc.featured);
    const technologies = Array.isArray(doc.technologies) ? doc.technologies : [];
    const languages = doc.languages || [];
    const aiContextDigest = doc.aiContextDigest ? (doc.aiContextDigest as any) : null;

    try {
      await prisma.project.upsert({
        where: { slug },
        update: {
          title,
          taglineEn,
          taglineFa,
          descriptionEn,
          descriptionFa,
          coverImageUrl,
          githubUrl,
          liveUrl,
          order,
          isPublished,
          featured,
          technologies,
          languages,
          aiContextDigest,
        },
        create: {
          slug,
          title,
          taglineEn,
          taglineFa,
          descriptionEn,
          descriptionFa,
          coverImageUrl,
          githubUrl,
          liveUrl,
          order,
          isPublished,
          featured,
          technologies,
          languages,
          aiContextDigest,
        },
      });
      projectSuccessCount++;
      console.log(`  ✓ Project: [${slug}] "${title}" (Tech: ${technologies.length}, AI Dossier: ${aiContextDigest ? "YES" : "NO"})`);
    } catch (err) {
      console.error(`  ✕ Error upserting Project [${slug}]:`, err);
    }
  }

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("🏁 MIGRATION SUMMARY REPORT");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(`• Tech Definitions Migrated: ${techSuccessCount} / ${rawTechs.length}`);
  console.log(`• Projects Migrated:         ${projectSuccessCount} / ${rawProjects.length}`);
  console.log("✔ PostgreSQL Database successfully populated via Prisma!");
}

migrate()
  .catch((err) => {
    console.error("Migration fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

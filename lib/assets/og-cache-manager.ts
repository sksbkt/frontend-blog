import { prisma } from "@/lib/prisma";
import { processAndStoreDualTier } from "@/lib/images/process-progressive";

export interface EnsureOgAssetOptions {
  forceRefresh?: boolean;
}

/**
 * Static Sovereign OpenGraph Asset Manager
 * Assets are treated as permanent sovereign media in Supabase Storage (projects/github-og/).
 * No automatic background expiration or TTL polling occurs; refreshing only happens
 * when explicitly triggered via the Admin Media UI.
 */
export async function ensureProjectOgAsset(
  projectSlug: string,
  repoUrl: string,
  options: EnsureOgAssetOptions = {}
) {
  const now = new Date();

  // 1. Check existing static cache (unless forceRefresh is explicitly requested)
  if (!options.forceRefresh) {
    const cached = await prisma.assetCache.findUnique({
      where: { projectSlug_assetType: { projectSlug, assetType: "GITHUB_OG" } },
    });

    if (cached && cached.highResUrl) {
      return { highResUrl: cached.highResUrl, lowResUrl: cached.lowResUrl };
    }
  }

  // 2. Derive GitHub OG URL
  const cleanRepo = repoUrl
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/$/, "");
  const rawOgUrl = `https://opengraph.githubassets.com/1/${cleanRepo}`;

  const res = await fetch(rawOgUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RootZeroSovereignAssetBot/1.0)",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch GitHub OG for ${cleanRepo} (${res.status})`);
  const imageBuffer = Buffer.from(await res.arrayBuffer());

  // 3. Process into dual tiers and store strictly under projects/github-og/
  const { highResUrl, lowResUrl } = await processAndStoreDualTier(
    imageBuffer,
    "github-og",
    `${projectSlug}-og`
  );

  // Far-future static date (permanent sovereign asset)
  const permanentDate = new Date("2099-12-31T23:59:59.000Z");

  // 4. Update Cache and Project Record
  await prisma.$transaction([
    prisma.assetCache.upsert({
      where: { projectSlug_assetType: { projectSlug, assetType: "GITHUB_OG" } },
      create: {
        projectSlug,
        assetType: "GITHUB_OG",
        highResUrl,
        lowResUrl,
        expiresAt: permanentDate,
        cachedAt: now,
      },
      update: {
        highResUrl,
        lowResUrl,
        cachedAt: now,
        expiresAt: permanentDate,
      },
    }),
    prisma.project.update({
      where: { slug: projectSlug },
      data: {
        coverImageUrl: highResUrl,
        lowResCoverUrl: lowResUrl,
        assetSource: "GITHUB_OG",
        ogCachedAt: now,
      },
    }),
  ]);

  return { highResUrl, lowResUrl };
}

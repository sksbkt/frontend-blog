/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * GitHub OpenGraph Asset Caching Pipeline
 * 14-day TTL CDN caching with Supabase Storage and PostgreSQL AssetCache.
 * Standardized on Universal Sovereign Asset Ingestion Pipeline.
 */

import { ensureSovereignAsset } from "@/lib/asset-pipeline";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Retrieves a cached OpenGraph image from Supabase Storage or revalidates
 * stale cache entries (> 14 days) by fetching from GitHub and re-uploading.
 */
export async function getOrCacheGithubOgImage(
  repoOwner: string,
  repoName: string,
  options?: { forceRefresh?: boolean }
): Promise<string> {
  const cleanOwner = repoOwner.toLowerCase().trim();
  const cleanRepo = repoName.toLowerCase().trim();
  const cacheKey = `github-og:${cleanOwner}/${cleanRepo}`;
  const customFileName = `${cleanOwner}-${cleanRepo}.png`;
  const githubOgUrl = `https://opengraph.githubassets.com/1/${repoOwner}/${repoName}`;

  return ensureSovereignAsset(githubOgUrl, {
    folder: "github-og",
    ttlMs: undefined,
    forceRefresh: options?.forceRefresh,
    customKey: cacheKey,
    customFileName,
    contentType: "image/png",
  });
}

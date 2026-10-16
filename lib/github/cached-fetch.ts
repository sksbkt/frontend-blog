/**
 * GitHub API ETag Caching & Rate-Limit Shield with Persistent Prisma ApiCache
 *
 * Implements:
 * 1. Two-tier caching: In-memory (L1) + PostgreSQL Prisma ApiCache (L2).
 * 2. ETag (If-None-Match) conditional HTTP validation (304 Not Modified uses 0 API quota).
 * 3. GITHUB_TOKEN authentication header attachment (upgrades to 5,000 req/hr).
 * 4. Eliminates serverless memory loss.
 */

import { prisma } from "@/lib/prisma";

export interface CachedFetchOptions {
  token?: string;
  forceRefresh?: boolean;
  revalidateSeconds?: number; // default: 3600 (1 hour)
  headers?: Record<string, string>;
  isText?: boolean;
}

export interface CacheEntry<T = unknown> {
  etag: string | null;
  data: T;
  timestamp: number;
}

// Global in-memory L1 cache store
const gitHubCache = new Map<string, CacheEntry<unknown>>();

/**
 * Perform a GitHub API request protected by ETag caching, in-memory TTL, and PostgreSQL persistence
 */
export async function fetchGitHubWithCache<T>(
  urlOrEndpoint: string,
  options?: CachedFetchOptions
): Promise<T | null> {
  const url = urlOrEndpoint.startsWith("http")
    ? urlOrEndpoint
    : `https://api.github.com${urlOrEndpoint.startsWith("/") ? "" : "/"}${urlOrEndpoint}`;

  const revalidateMs = (options?.revalidateSeconds ?? 3600) * 1000;
  let cached = gitHubCache.get(url) as CacheEntry<T> | undefined;

  // 1. Check L1 Memory Cache
  if (!options?.forceRefresh && cached) {
    const ageMs = Date.now() - cached.timestamp;
    if (ageMs < revalidateMs) {
      return cached.data;
    }
  }

  // 2. Check L2 PostgreSQL ApiCache (persistent across serverless restarts)
  if (!options?.forceRefresh && !cached) {
    try {
      const dbCache = await prisma.apiCache.findUnique({
        where: { key: url },
      });
      if (dbCache) {
        cached = {
          etag: dbCache.etag,
          data: dbCache.data as T,
          timestamp: dbCache.updatedAt.getTime(),
        };
        gitHubCache.set(url, cached);

        const ageMs = Date.now() - cached.timestamp;
        if (ageMs < revalidateMs) {
          return cached.data;
        }
      }
    } catch (dbErr) {
      console.warn("[CachedFetch] Database L2 cache read error:", dbErr);
    }
  }

  // 3. Prepare HTTP headers
  const authToken = options?.token || process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Portfolio-Admin-CMS",
    ...options?.headers,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  // 4. Attach ETag for 304 conditional request (does not consume API quota)
  if (cached?.etag && !options?.forceRefresh) {
    headers["If-None-Match"] = cached.etag;
  }

  try {
    const res = await fetch(url, {
      headers,
      cache: "no-store",
    });

    // 5. Handle 304 Not Modified: Reuse cached data without consuming quota
    if (res.status === 304 && cached) {
      cached.timestamp = Date.now();
      gitHubCache.set(url, cached);

      // Refresh DB timestamp in background
      prisma.apiCache
        .update({
          where: { key: url },
          data: { updatedAt: new Date() },
        })
        .catch(() => {});

      return cached.data;
    }

    // 6. Handle 404 Not Found
    if (res.status === 404) {
      return null;
    }

    // 7. Handle Rate Limiting (403 or 429)
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = res.headers.get("x-ratelimit-reset");
      const limit = res.headers.get("x-ratelimit-limit") || "60";

      let resetTimeFormatted = "shortly";
      if (reset) {
        const resetDate = new Date(parseInt(reset, 10) * 1000);
        resetTimeFormatted = resetDate.toLocaleTimeString();
      }

      if (remaining === "0" || res.status === 429) {
        throw new Error(
          `GitHub API rate limit exceeded (${remaining}/${limit} remaining). Quota resets at ${resetTimeFormatted}. Set GITHUB_TOKEN in your environment to increase baseline limit to 5,000 req/hr.`
        );
      }
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`[CachedFetch] GitHub request failed [${res.status}]: ${url}`, errBody);
      return null;
    }

    // 8. Parse response and store in L1 and L2
    const data: T = options?.isText
      ? ((await res.text()) as unknown as T)
      : ((await res.json()) as T);

    const etag = res.headers.get("etag");

    const entry: CacheEntry<T> = {
      etag,
      data,
      timestamp: Date.now(),
    };

    gitHubCache.set(url, entry);

    // Persist to Supabase PostgreSQL ApiCache table
    try {
      await prisma.apiCache.upsert({
        where: { key: url },
        update: {
          etag,
          data: (options?.isText ? { text: data } : data) as any,
        },
        create: {
          key: url,
          etag,
          data: (options?.isText ? { text: data } : data) as any,
        },
      });
    } catch (persistErr) {
      console.warn("[CachedFetch] Failed to persist to ApiCache table:", persistErr);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("rate limit")) {
      throw error;
    }

    if (cached) {
      console.warn(`[CachedFetch] Network error fetching ${url}; serving stale cached data.`, error);
      return cached.data;
    }

    console.warn(`[CachedFetch] Error fetching ${url}:`, error);
    return null;
  }
}

export function clearGitHubCache(): void {
  gitHubCache.clear();
}

export function getGitHubCacheStats(): { size: number; urls: string[] } {
  return {
    size: gitHubCache.size,
    urls: Array.from(gitHubCache.keys()),
  };
}

/**
 * GitHub API ETag Caching & Rate-Limit Shield
 *
 * Implements:
 * 1. In-memory TTL caching (default: 3600s / 1hr) to eliminate redundant requests.
 * 2. ETag (If-None-Match) conditional HTTP validation (304 Not Modified uses 0 API quota).
 * 3. GITHUB_TOKEN authentication header attachment (upgrades to 5,000 req/hr).
 * 4. Rate-limit monitoring and descriptive error handling on 403 / 429.
 * 5. Bypass option (forceRefresh: true) for manual busts.
 */

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

// Global in-memory cache store
const gitHubCache = new Map<string, CacheEntry<unknown>>();

/**
 * Perform a GitHub API request protected by ETag caching and in-memory TTL
 */
export async function fetchGitHubWithCache<T>(
  urlOrEndpoint: string,
  options?: CachedFetchOptions
): Promise<T | null> {
  const url = urlOrEndpoint.startsWith("http")
    ? urlOrEndpoint
    : `https://api.github.com${urlOrEndpoint.startsWith("/") ? "" : "/"}${urlOrEndpoint}`;

  const revalidateMs = (options?.revalidateSeconds ?? 3600) * 1000;
  const cached = gitHubCache.get(url) as CacheEntry<T> | undefined;

  // 1. Fast in-memory TTL hit: bypass network entirely if fresh and not force-refreshing
  if (!options?.forceRefresh && cached) {
    const ageMs = Date.now() - cached.timestamp;
    if (ageMs < revalidateMs) {
      return cached.data;
    }
  }

  // 2. Prepare HTTP headers
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

  // 3. Attach ETag for 304 conditional request (does not consume API quota)
  if (cached?.etag && !options?.forceRefresh) {
    headers["If-None-Match"] = cached.etag;
  }

  try {
    const res = await fetch(url, {
      headers,
      cache: "no-store",
    });

    // 4. Handle 304 Not Modified: Reuse cached data without consuming quota
    if (res.status === 304 && cached) {
      cached.timestamp = Date.now(); // refresh TTL
      return cached.data;
    }

    // 5. Handle 404 Not Found
    if (res.status === 404) {
      return null;
    }

    // 6. Handle Rate Limiting (403 or 429)
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

      const bodyText = await res.text().catch(() => "");
      throw new Error(
        `GitHub API access forbidden [403]: ${bodyText || "Ensure your token has repository read permissions."}`
      );
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`[CachedFetch] GitHub request failed [${res.status}]: ${url}`, errBody);
      return null;
    }

    // 7. Parse response and store ETag
    const data: T = options?.isText
      ? ((await res.text()) as unknown as T)
      : ((await res.json()) as T);

    const etag = res.headers.get("etag");

    gitHubCache.set(url, {
      etag,
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    // If rate-limited error, bubble it up so admin UI/logs know specifically
    if (error instanceof Error && error.message.includes("rate limit")) {
      throw error;
    }

    // If network error occurred but we have a cached version, serve stale as graceful fallback
    if (cached) {
      console.warn(`[CachedFetch] Network error fetching ${url}; serving stale cached data.`, error);
      return cached.data;
    }

    console.warn(`[CachedFetch] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Clear in-memory cache store
 */
export function clearGitHubCache(): void {
  gitHubCache.clear();
}

/**
 * Get current cache statistics
 */
export function getGitHubCacheStats(): { size: number; urls: string[] } {
  return {
    size: gitHubCache.size,
    urls: Array.from(gitHubCache.keys()),
  };
}

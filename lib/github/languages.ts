import { fetchGitHubWithCache, type CachedFetchOptions } from "./cached-fetch";

/**
 * Canonical GitHub language color mappings.
 * Matches GitHub's linguistic color registry.
 */
export const GITHUB_LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Rust: "#dea584",
  Go: "#00ADD8",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Java: "#b07219",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Astro: "#ff5a03",
  Markdown: "#083fa1",
  Dockerfile: "#384d54",
  Lua: "#000080",
  R: "#198CE7",
  Elixir: "#6e4a7e",
  Zig: "#ec915c",
  Haskell: "#5e5086",
  Solidity: "#AA6746",
  GraphQL: "#e10098",
  JSON: "#292929",
  YAML: "#cb171e",
};

export const DEFAULT_LANGUAGE_COLOR = "#8b949e";

/**
 * Returns the canonical hex color for a given language name.
 */
export function getLanguageColor(languageName: string): string {
  if (!languageName) return DEFAULT_LANGUAGE_COLOR;
  return GITHUB_LANGUAGE_COLORS[languageName] || DEFAULT_LANGUAGE_COLOR;
}

export interface LanguageBreakdownItem {
  name: string;
  bytes: number;
  percentage: number;
  formattedPercentage: string;
  color: string;
}

export interface ProjectLanguageItem {
  _key?: string;
  name: string;
  percentage: number;
  color: string;
  bytes: number;
}


/**
 * Computes language percentages from raw byte counts.
 * Returns sorted list (highest percentage first).
 */
export function computeLanguageBreakdown(
  rawLanguages?: Record<string, number> | string | null
): LanguageBreakdownItem[] {
  if (!rawLanguages) return [];

  let parsed: Record<string, number> = {};
  if (typeof rawLanguages === "string") {
    try {
      parsed = JSON.parse(rawLanguages);
    } catch {
      return [];
    }
  } else {
    parsed = rawLanguages;
  }

  const entries = Object.entries(parsed).filter(
    ([, bytes]) => typeof bytes === "number" && bytes > 0
  );

  if (entries.length === 0) return [];

  const totalBytes = entries.reduce((acc, [, bytes]) => acc + bytes, 0);
  if (totalBytes <= 0) return [];

  return entries
    .map(([name, bytes]) => {
      const pct = (bytes / totalBytes) * 100;
      // Round to 1 decimal place, or "< 0.1%" if very small
      const rounded = Math.round(pct * 10) / 10;
      const formatted = rounded < 0.1 && pct > 0 ? "< 0.1%" : `${rounded.toFixed(1)}%`;

      return {
        name,
        bytes,
        percentage: Number(rounded.toFixed(1)),
        formattedPercentage: formatted,
        color: getLanguageColor(name),
      };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * Formats raw languages into an array of ProjectLanguageItem for Sanity storage
 */
export function formatProjectLanguages(
  rawLanguages?: Record<string, number> | string | null
): ProjectLanguageItem[] {
  const breakdown = computeLanguageBreakdown(rawLanguages);
  return breakdown.map((item, idx) => ({
    _key: `lang_${item.name.toLowerCase()}_${idx}`,
    name: item.name,
    percentage: item.percentage,
    color: item.color,
    bytes: item.bytes,
  }));
}


/**
 * Fetches repository language byte counts from GitHub API with ETag caching.
 */
export async function fetchRepoLanguages(
  owner: string,
  repo: string,
  options?: CachedFetchOptions
): Promise<Record<string, number>> {
  try {
    const data = await fetchGitHubWithCache<Record<string, number>>(
      `/repos/${owner}/${repo}/languages`,
      options
    );
    return data || {};
  } catch (error) {
    console.warn(`[GitHub Languages] Failed to fetch languages for ${owner}/${repo}:`, error);
    return {};
  }
}

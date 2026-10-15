/**
 * GitHub Repository Inspection Helpers
 * Inspects README presence, file tree, package.json, and main entry points.
 */

type GitHubFileResponse = {
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
  download_url?: string | null;
};

type GitHubTreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
};

type GitHubTreeResponse = {
  sha: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
};

import { extractEnvVarsFromText } from "@/lib/utils/extract-env-vars";

export type RepoContext = {
  owner: string;
  repo: string;
  fullName: string;
  repository: {
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    homepage: string | null;
    language: string | null;
    topics: string[];
    defaultBranch: string;
    stars: number;
    forks: number;
    isPrivate: boolean;
  };
  readme: {
    exists: boolean;
    content: string;
    size: number;
  };
  packageJson: Record<string, unknown> | null;
  detectedEnvKeys: string[];
  structure: {
    totalFiles: number;
    topLevelFiles: string[];
    configFiles: string[];
    treeSample: string[];
    entryPoint: {
      path: string | null;
      snippet: string | null;
    };
  };
};

export interface GitHubFetchOptions {
  forceRefresh?: boolean;
  revalidate?: number;
  tags?: string[];
}

interface ETagCacheEntry<T = unknown> {
  etag: string;
  data: T;
  timestamp: number;
}

// In-memory cache map for ETags and 304 Not Modified responses
const gitHubETagCache = new Map<string, ETagCacheEntry>();

export async function ghFetch<T>(
  url: string,
  token?: string,
  options?: GitHubFetchOptions,
): Promise<T | null> {
  const authToken = token || process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Portfolio-Admin-CMS",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const cached = gitHubETagCache.get(url);
  if (cached?.etag && !options?.forceRefresh) {
    headers["If-None-Match"] = cached.etag;
  }

  const fetchInit: RequestInit = {
    headers,
    ...(options?.forceRefresh
      ? { cache: "no-store" }
      : {
          next: {
            revalidate: options?.revalidate ?? 3600,
            tags: options?.tags ?? ["github-repo"],
          },
        }),
  };

  const response = await fetch(url, fetchInit);

  if (response.status === 304 && cached) {
    return cached.data as T;
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub request failed [${response.status}]: ${url}`);
  }

  const data = (await response.json()) as T;
  const etag = response.headers.get("etag");
  if (etag) {
    gitHubETagCache.set(url, {
      etag,
      data,
      timestamp: Date.now(),
    });
  }

  return data;
}

/**
 * 1. Inspect if a repository contains a README.md and retrieve content
 */
export async function inspectReadme(
  owner: string,
  repo: string,
  token?: string,
  options?: GitHubFetchOptions,
): Promise<{ exists: boolean; content: string; size: number }> {
  try {
    const data = await ghFetch<GitHubFileResponse>(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      token,
      options,
    );

    if (!data || !data.content) {
      return { exists: false, content: "", size: 0 };
    }

    const decoded = Buffer.from(
      data.content,
      (data.encoding as BufferEncoding) || "base64",
    ).toString("utf-8");

    return {
      exists: true,
      content: decoded,
      size: data.size || decoded.length,
    };
  } catch (error) {
    console.warn(`[inspectReadme] Error fetching readme for ${owner}/${repo}:`, error);
    return { exists: false, content: "", size: 0 };
  }
}

/**
 * 2. Fetch and parse package.json if present
 */
export async function inspectPackageJson(
  owner: string,
  repo: string,
  token?: string,
  options?: GitHubFetchOptions,
): Promise<Record<string, unknown> | null> {
  try {
    const data = await ghFetch<GitHubFileResponse>(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      token,
      options,
    );

    if (!data || !data.content) {
      return null;
    }

    const pkgStr = Buffer.from(
      data.content,
      (data.encoding as BufferEncoding) || "base64",
    ).toString("utf-8");

    return JSON.parse(pkgStr) as Record<string, unknown>;
  } catch (error) {
    console.warn(`[inspectPackageJson] package.json not found or invalid for ${owner}/${repo}`);
    return null;
  }
}

/**
 * 3. Fetch repository file tree and identify structure
 */
export async function inspectFileTree(
  owner: string,
  repo: string,
  defaultBranch: string,
  token?: string,
  options?: GitHubFetchOptions,
): Promise<{
  totalFiles: number;
  topLevelFiles: string[];
  configFiles: string[];
  treeSample: string[];
  allPaths: string[];
}> {
  try {
    const treeData = await ghFetch<GitHubTreeResponse>(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      token,
      options,
    );

    if (!treeData || !Array.isArray(treeData.tree)) {
      return {
        totalFiles: 0,
        topLevelFiles: [],
        configFiles: [],
        treeSample: [],
        allPaths: [],
      };
    }

    // Filter out node_modules, build artifacts, git internals
    const ignoredPrefixes = [
      "node_modules/",
      ".git/",
      ".next/",
      "dist/",
      "build/",
      ".cache/",
      "vendor/",
      "out/",
    ];

    const validItems = treeData.tree.filter(
      (item) => !ignoredPrefixes.some((p) => item.path.startsWith(p)),
    );

    const allPaths = validItems.map((item) => item.path);

    // Top-level files/folders
    const topLevelFiles = validItems
      .filter((item) => !item.path.includes("/"))
      .map((item) => (item.type === "tree" ? `${item.path}/` : item.path));

    // Recognized configuration files
    const knownConfigNames = [
      "package.json",
      "tsconfig.json",
      "jsconfig.json",
      "next.config.js",
      "next.config.mjs",
      "next.config.ts",
      "vite.config.js",
      "vite.config.ts",
      "tailwind.config.js",
      "tailwind.config.ts",
      "postcss.config.js",
      "webpack.config.js",
      "Dockerfile",
      "docker-compose.yml",
      "docker-compose.yaml",
      ".env.example",
      "sanity.config.ts",
      "sanity.config.js",
      ".eslintrc.json",
      ".prettierrc",
    ];

    const configFiles = allPaths.filter((p) => {
      const base = p.split("/").pop() || "";
      return knownConfigNames.includes(base);
    });

    // Curate a clean sample of up to 40 notable files
    const sample = allPaths
      .filter((p) => {
        return (
          p.endsWith(".ts") ||
          p.endsWith(".tsx") ||
          p.endsWith(".js") ||
          p.endsWith(".jsx") ||
          p.endsWith(".json") ||
          p.endsWith(".py") ||
          p.endsWith(".go") ||
          p.endsWith(".rs") ||
          p.endsWith(".md") ||
          p.endsWith(".html") ||
          p.endsWith(".css")
        );
      })
      .slice(0, 40);

    return {
      totalFiles: validItems.length,
      topLevelFiles,
      configFiles,
      treeSample: sample,
      allPaths,
    };
  } catch (error) {
    console.warn(`[inspectFileTree] Failed to fetch tree for ${owner}/${repo}:`, error);
    return {
      totalFiles: 0,
      topLevelFiles: [],
      configFiles: [],
      treeSample: [],
      allPaths: [],
    };
  }
}

/**
 * 4. Fetch the main entry point code snippet
 */
export async function inspectEntryPoint(
  owner: string,
  repo: string,
  allPaths: string[],
  packageJson: Record<string, unknown> | null,
  token?: string,
  options?: GitHubFetchOptions,
): Promise<{ path: string | null; snippet: string | null }> {
  // Candidate entry points in order of priority
  const candidates: string[] = [];

  if (packageJson?.main && typeof packageJson.main === "string") {
    candidates.push(packageJson.main.replace(/^\.\//, ""));
  }

  candidates.push(
    "src/index.tsx",
    "src/index.ts",
    "src/main.tsx",
    "src/main.ts",
    "src/App.tsx",
    "src/App.jsx",
    "app/page.tsx",
    "app/layout.tsx",
    "pages/index.tsx",
    "pages/index.js",
    "index.tsx",
    "index.ts",
    "index.js",
    "main.py",
    "app.py",
    "main.go",
  );

  const matchedPath = candidates.find((cand) => allPaths.includes(cand));

  if (!matchedPath) {
    return { path: null, snippet: null };
  }

  try {
    const fileData = await ghFetch<GitHubFileResponse>(
      `https://api.github.com/repos/${owner}/${repo}/contents/${matchedPath}`,
      token,
      options,
    );

    if (!fileData || !fileData.content) {
      return { path: matchedPath, snippet: null };
    }

    const decoded = Buffer.from(
      fileData.content,
      (fileData.encoding as BufferEncoding) || "base64",
    ).toString("utf-8");

    // Grab first 80 lines
    const snippet = decoded.split("\n").slice(0, 80).join("\n");

    return {
      path: matchedPath,
      snippet,
    };
  } catch {
    return { path: matchedPath, snippet: null };
  }
}

/**
 * 5. Inspect repository files for environment variable references
 */
export async function inspectEnvVars(
  owner: string,
  repo: string,
  allPaths: string[],
  entrySnippet: string | null,
  token?: string,
  options?: GitHubFetchOptions,
): Promise<string[]> {
  const foundKeys = new Set<string>();

  if (entrySnippet) {
    const fromEntry = extractEnvVarsFromText(entrySnippet);
    for (const k of fromEntry) foundKeys.add(k);
  }

  const envCandidates = allPaths
    .filter((p) => {
      const lower = p.toLowerCase();
      return (
        lower.includes(".env.example") ||
        lower.includes(".env.sample") ||
        lower.includes(".env.template") ||
        lower.includes(".env.local.example") ||
        lower.endsWith("config.ts") ||
        lower.endsWith("config.js") ||
        lower.endsWith("config.mjs") ||
        lower.includes("lib/env") ||
        lower.includes("src/env") ||
        lower.includes("supabase") ||
        lower.includes("firebase") ||
        lower.includes("auth.") ||
        lower.includes("api/auth") ||
        lower.includes("sanity.config") ||
        lower.includes("sanity.client")
      );
    })
    .slice(0, 8);

  await Promise.all(
    envCandidates.map(async (filePath) => {
      try {
        const fileData = await ghFetch<GitHubFileResponse>(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
          token,
          options,
        );
        if (fileData?.content) {
          const decoded = Buffer.from(
            fileData.content,
            (fileData.encoding as BufferEncoding) || "base64",
          ).toString("utf-8");
          const keys = extractEnvVarsFromText(decoded);
          for (const k of keys) foundKeys.add(k);
        }
      } catch {}
    }),
  );

  return Array.from(foundKeys).sort();
}

/**
 * Main Orchestrator: Comprehensive Repo Inspection
 */
export async function inspectRepository(
  fullName: string,
  token?: string,
  options?: GitHubFetchOptions,
): Promise<RepoContext> {
  const [owner, repo] = fullName.split("/");
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  type GHRepoRaw = {
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    language: string | null;
    topics?: string[];
    default_branch: string;
    stargazers_count: number;
    forks_count: number;
    private: boolean;
  };

  const repoDetails = await ghFetch<GHRepoRaw>(apiBase, token, options);

  if (!repoDetails) {
    throw new Error(`Repository ${fullName} not found or inaccessible with provided token.`);
  }

  const defaultBranch = repoDetails.default_branch || "main";

  // Run inspections in parallel
  const [readmeResult, pkgResult, treeResult] = await Promise.all([
    inspectReadme(owner, repo, token, options),
    inspectPackageJson(owner, repo, token, options),
    inspectFileTree(owner, repo, defaultBranch, token, options),
  ]);

  const entryPointResult = await inspectEntryPoint(
    owner,
    repo,
    treeResult.allPaths,
    pkgResult,
    token,
    options,
  );

  const detectedEnvKeys = await inspectEnvVars(
    owner,
    repo,
    treeResult.allPaths,
    entryPointResult.snippet,
    token,
    options,
  );

  return {
    owner,
    repo,
    fullName,
    repository: {
      name: repoDetails.name,
      fullName: repoDetails.full_name,
      description: repoDetails.description,
      htmlUrl: repoDetails.html_url,
      homepage: repoDetails.homepage,
      language: repoDetails.language,
      topics: repoDetails.topics || [],
      defaultBranch,
      stars: repoDetails.stargazers_count,
      forks: repoDetails.forks_count,
      isPrivate: repoDetails.private,
    },
    readme: {
      exists: readmeResult.exists,
      content: readmeResult.content,
      size: readmeResult.size,
    },
    packageJson: pkgResult,
    detectedEnvKeys,
    structure: {
      totalFiles: treeResult.totalFiles,
      topLevelFiles: treeResult.topLevelFiles,
      configFiles: treeResult.configFiles,
      treeSample: treeResult.treeSample,
      entryPoint: entryPointResult,
    },
  };
}

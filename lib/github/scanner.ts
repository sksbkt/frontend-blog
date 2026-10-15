/**
 * High-Signal Heuristic Repository Scanner
 *
 * Performs targeted, token-efficient queries against GitHub API to construct
 * a high-signal codebase digest (~6k-8k tokens max) without brute-force downloads.
 * Uses ETag caching & in-memory TTL to shield rate limits.
 */

import { fetchGitHubWithCache, type CachedFetchOptions } from "./cached-fetch";
import { fetchRepoLanguages } from "./languages";

export interface HighSignalFile {
  path: string;
  category: "schema" | "routing" | "config" | "core";
  content: string;
}

export interface CommitHistoryItem {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export interface HighSignalRepoContext {
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  repository: {
    name: string;
    description: string | null;
    homepage: string | null;
    language: string | null;
    topics: string[];
    isPrivate: boolean;
  };
  topology: string[];
  hasBoilerplateReadme: boolean;
  readmeContent: string | null;
  manifest: {
    type: "package.json" | "pyproject.toml" | "Cargo.toml" | "none";
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
    raw?: string;
  };
  highSignalFiles: HighSignalFile[];
  recentCommits: CommitHistoryItem[];
  latestCommitSha: string;
  languages?: Record<string, number>;
  formattedPromptDigest: string;
}

export interface ScannerOptions {
  token?: string;
  forceRefresh?: boolean;
  revalidateSeconds?: number;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

const BOILERPLATE_PATTERNS = [
  "bootstrapped with create-next-app",
  "bootstrapped with [create-next-app]",
  "getting started with create react app",
  "getting started with create-react-app",
  "this is a [next.js](https://nextjs.org) project bootstrapped with",
  "this is a next.js project bootstrapped with",
  "vite + react",
  "welcome to your new next.js project",
  "welcome to astro",
  "npm run dev # or yarn dev or pnpm dev",
];

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".cache",
  ".vercel",
  "__pycache__",
  ".venv",
  "venv",
  "target",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".mp4",
  ".webm",
  ".mov",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".map",
]);

const LOCK_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "cargo.lock",
  "poetry.lock",
]);

/**
 * Fetch and decode base64 file content from GitHub repository using cached fetcher
 */
async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string,
  options?: CachedFetchOptions
): Promise<string | null> {
  interface GhContentResponse {
    content?: string;
    encoding?: string;
    download_url?: string | null;
  }

  const res = await fetchGitHubWithCache<GhContentResponse>(
    `/repos/${owner}/${repo}/contents/${encodeURI(filePath)}`,
    options
  );

  if (!res) return null;

  if (res.content && res.encoding === "base64") {
    try {
      return Buffer.from(res.content, "base64").toString("utf-8");
    } catch {
      return null;
    }
  }

  if (res.download_url) {
    try {
      return await fetchGitHubWithCache<string>(res.download_url, {
        ...options,
        isText: true,
      });
    } catch {}
  }

  return null;
}

/**
 * Detect boilerplate or empty README
 */
function isBoilerplateReadme(content: string | null): boolean {
  if (!content || content.trim().length < 80) return true;
  const lower = content.toLowerCase();
  return BOILERPLATE_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Whitelist matcher for high-signal architectural files
 */
function categorizeHighSignalFile(
  filePath: string
): "schema" | "routing" | "config" | "core" | null {
  const lower = filePath.toLowerCase();

  // 1. Schemas & Data Models
  if (
    lower === "prisma/schema.prisma" ||
    lower.startsWith("schematypes/") ||
    lower.startsWith("schemas/") ||
    lower.endsWith("/schema.ts") ||
    lower === "db/schema.ts" ||
    lower === "src/db/schema.ts" ||
    /^models\/[^/]+\.(ts|js|tsx)$/.test(lower)
  ) {
    return "schema";
  }

  // 2. Routing & Configs
  if (
    lower === "middleware.ts" ||
    lower === "src/middleware.ts" ||
    /^next\.config\.(js|mjs|ts)$/.test(lower) ||
    /^tailwind\.config\.(js|ts|mjs)$/.test(lower) ||
    /^vite\.config\.(ts|js)$/.test(lower)
  ) {
    return "config";
  }

  // 3. Core Logic & State Management
  if (
    lower === "lib/auth.ts" ||
    lower === "src/lib/auth.ts" ||
    lower === "auth.ts" ||
    lower.startsWith("store/") ||
    lower.startsWith("src/store/") ||
    lower === "app/page.tsx" ||
    lower === "src/app/page.tsx" ||
    lower === "src/app.tsx" ||
    lower === "pages/index.tsx"
  ) {
    return "core";
  }

  return null;
}

/**
 * Primary Heuristic Scanner: Fetches targeted, high-signal codebase context
 * Protected by ETag caching & in-memory TTL shield.
 */
export async function fetchHighSignalRepoContext(
  owner: string,
  repo: string,
  tokenOrOptions?: string | ScannerOptions,
  legacyOptions?: ScannerOptions
): Promise<HighSignalRepoContext> {
  let token: string | undefined = undefined;
  let forceRefresh = false;
  let revalidateSeconds = 3600;

  if (typeof tokenOrOptions === "string") {
    token = tokenOrOptions;
    if (legacyOptions) {
      forceRefresh = Boolean(legacyOptions.forceRefresh);
      if (legacyOptions.revalidateSeconds)
        revalidateSeconds = legacyOptions.revalidateSeconds;
    }
  } else if (tokenOrOptions && typeof tokenOrOptions === "object") {
    token = tokenOrOptions.token;
    forceRefresh = Boolean(tokenOrOptions.forceRefresh);
    if (tokenOrOptions.revalidateSeconds)
      revalidateSeconds = tokenOrOptions.revalidateSeconds;
  }

  const fetchOpts: CachedFetchOptions = {
    token,
    forceRefresh,
    revalidateSeconds,
  };

  const fullName = `${owner}/${repo}`;

  // 1. Fetch Basic Repository Details
  interface GhRepoInfo {
    name: string;
    description: string | null;
    homepage: string | null;
    language: string | null;
    topics?: string[];
    default_branch?: string;
    private?: boolean;
  }

  const repoInfo = await fetchGitHubWithCache<GhRepoInfo>(
    `/repos/${owner}/${repo}`,
    fetchOpts
  );

  const defaultBranch = repoInfo?.default_branch || "main";
  const repoMeta = {
    name: repoInfo?.name || repo,
    description: repoInfo?.description || null,
    homepage: repoInfo?.homepage || null,
    language: repoInfo?.language || null,
    topics: repoInfo?.topics || [],
    isPrivate: Boolean(repoInfo?.private),
  };

  // Fetch Language Byte Counts
  const languages = await fetchRepoLanguages(owner, repo, fetchOpts);

  // 2. Step A: Structural Topology (GET recursive git tree)
  interface GhTreeResponse {
    tree?: GitHubTreeItem[];
    truncated?: boolean;
  }

  let treeData = await fetchGitHubWithCache<GhTreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    fetchOpts
  );

  if (!treeData?.tree && defaultBranch !== "master") {
    // Fallback to master if default_branch didn't return tree
    treeData = await fetchGitHubWithCache<GhTreeResponse>(
      `/repos/${owner}/${repo}/git/trees/master?recursive=1`,
      fetchOpts
    );
  }

  const rawTree = treeData?.tree || [];

  // Filter topology: max depth 4, skip dependencies, locks, media
  const filteredTopology: string[] = [];
  const candidateHighSignalPaths: Array<{
    path: string;
    category: "schema" | "routing" | "config" | "core";
  }> = [];

  for (const item of rawTree) {
    const path = item.path;
    const parts = path.split("/");

    // Skip deeply nested directories (> 4 depth)
    if (parts.length > 4) continue;

    // Check if path contains excluded directory
    const hasExcludedDir = parts.some((p) => EXCLUDED_DIRS.has(p));
    if (hasExcludedDir) continue;

    const fileName = parts[parts.length - 1].toLowerCase();

    // Skip lock files
    if (LOCK_FILES.has(fileName)) continue;

    // Skip binary / media
    const dotIndex = fileName.lastIndexOf(".");
    const ext = dotIndex !== -1 ? fileName.slice(dotIndex) : "";
    if (EXCLUDED_EXTENSIONS.has(ext)) continue;

    // Collect topology paths up to 100
    if (filteredTopology.length < 100) {
      filteredTopology.push(path);
    }

    // Check high-signal whitelist
    const category = categorizeHighSignalFile(path);
    if (category) {
      candidateHighSignalPaths.push({ path, category });
    }
  }

  // 3. Step B: Identity & Dependencies (package.json / pyproject.toml / Cargo.toml & README)
  let manifestType: "package.json" | "pyproject.toml" | "Cargo.toml" | "none" =
    "none";
  let manifestDeps: string[] = [];
  let manifestDevDeps: string[] = [];
  let manifestScripts: Record<string, string> = {};
  let rawManifest: string | undefined = undefined;

  const pkgJsonRaw = await fetchFileContent(
    owner,
    repo,
    "package.json",
    fetchOpts
  );
  if (pkgJsonRaw) {
    manifestType = "package.json";
    try {
      const parsed = JSON.parse(pkgJsonRaw);
      manifestDeps = Object.keys(parsed.dependencies || {});
      manifestDevDeps = Object.keys(parsed.devDependencies || {});
      manifestScripts = parsed.scripts || {};
      rawManifest = JSON.stringify(
        {
          dependencies: parsed.dependencies,
          devDependencies: parsed.devDependencies,
          scripts: parsed.scripts,
        },
        null,
        2
      );
    } catch {}
  } else {
    // Check pyproject.toml or Cargo.toml
    const pyproject = await fetchFileContent(
      owner,
      repo,
      "pyproject.toml",
      fetchOpts
    );
    if (pyproject) {
      manifestType = "pyproject.toml";
      rawManifest = pyproject.slice(0, 1500);
    } else {
      const cargo = await fetchFileContent(
        owner,
        repo,
        "Cargo.toml",
        fetchOpts
      );
      if (cargo) {
        manifestType = "Cargo.toml";
        rawManifest = cargo.slice(0, 1500);
      }
    }
  }

  // Fetch README.md
  let readmeContent: string | null = null;
  const readmeCandidates = ["README.md", "readme.md", "README.markdown"];
  for (const candidate of readmeCandidates) {
    const raw = await fetchFileContent(owner, repo, candidate, fetchOpts);
    if (raw) {
      readmeContent = raw;
      break;
    }
  }

  const hasBoilerplateReadme = isBoilerplateReadme(readmeContent);

  // 4. Step C: High-Signal Files Content (Fetch up to 5 priority files)
  const highSignalFiles: HighSignalFile[] = [];
  const prioritizedCandidates = candidateHighSignalPaths
    .sort((a, b) => {
      const priority = { schema: 1, routing: 2, config: 3, core: 4 };
      return priority[a.category] - priority[b.category];
    })
    .slice(0, 5);

  for (const item of prioritizedCandidates) {
    const content = await fetchFileContent(owner, repo, item.path, fetchOpts);
    if (content && content.trim()) {
      highSignalFiles.push({
        path: item.path,
        category: item.category,
        content: content.slice(0, 2000), // bounded snippet
      });
    }
  }

  // 5. Step D: Developer Commit History (The "Challenges & Friction" Source)
  interface GhCommitResponse {
    sha: string;
    commit: {
      message: string;
      author?: { name?: string; date?: string };
      committer?: { name?: string; date?: string };
    };
  }

  const commitsData = await fetchGitHubWithCache<GhCommitResponse[]>(
    `/repos/${owner}/${repo}/commits?per_page=15`,
    fetchOpts
  );

  const recentCommits: CommitHistoryItem[] = [];
  let latestCommitSha = defaultBranch;

  if (Array.isArray(commitsData) && commitsData.length > 0) {
    latestCommitSha = commitsData[0].sha.slice(0, 7);
    for (const c of commitsData.slice(0, 15)) {
      recentCommits.push({
        sha: c.sha.slice(0, 7),
        message: (c.commit?.message || "").split("\n")[0].trim(),
        date: c.commit?.author?.date || c.commit?.committer?.date || "",
        author: c.commit?.author?.name || "Developer",
      });
    }
  }

  // 6. Assemble Curated Structured String (~6,000-8,000 tokens maximum)
  const promptParts: string[] = [];

  promptParts.push("=== REPOSITORY IDENTITY ===");
  promptParts.push(`Repository: ${fullName}`);
  promptParts.push(`Default Branch: ${defaultBranch}`);
  if (repoMeta.description)
    promptParts.push(`GitHub Description: ${repoMeta.description}`);
  if (repoMeta.homepage)
    promptParts.push(`Production Homepage/Demo: ${repoMeta.homepage}`);
  if (repoMeta.language)
    promptParts.push(`Primary Language: ${repoMeta.language}`);
  if (repoMeta.topics.length > 0)
    promptParts.push(`Repository Topics: ${repoMeta.topics.join(", ")}`);

  promptParts.push("\n=== README EVALUATION & CONTENT ===");
  if (hasBoilerplateReadme) {
    promptParts.push(
      "STATUS: Boilerplate or empty README detected (e.g. create-next-app defaults). Rely on dependencies, architecture topology, and commit history for deduction."
    );
    if (readmeContent && readmeContent.trim().length > 30) {
      promptParts.push(
        `Boilerplate Excerpt:\n${readmeContent.slice(0, 500).trim()}`
      );
    }
  } else if (readmeContent) {
    promptParts.push("STATUS: Genuine custom documentation available.");
    promptParts.push(
      `README Excerpt (First 3,000 chars):\n${readmeContent
        .slice(0, 3000)
        .trim()}`
    );
  } else {
    promptParts.push(
      "STATUS: Missing README. Rely on dependencies, architecture topology, and commit history."
    );
  }

  promptParts.push("\n=== DEPENDENCY & MANIFEST SIGNALS ===");
  promptParts.push(`Manifest Type: ${manifestType}`);
  if (manifestDeps.length > 0) {
    promptParts.push(`Production Dependencies: ${manifestDeps.join(", ")}`);
  }
  if (manifestDevDeps.length > 0) {
    promptParts.push(`Dev Dependencies: ${manifestDevDeps.join(", ")}`);
  }
  if (Object.keys(manifestScripts).length > 0) {
    promptParts.push(
      `Package Scripts: ${Object.entries(manifestScripts)
        .map(([k, v]) => `${k}: "${v}"`)
        .join(" | ")}`
    );
  }
  if (rawManifest && manifestType !== "package.json") {
    promptParts.push(`Raw Manifest Snippet:\n${rawManifest}`);
  }

  promptParts.push(
    "\n=== STRUCTURAL TOPOLOGY (Filtered Key Paths, Max Depth 4) ==="
  );
  promptParts.push(
    filteredTopology.length > 0
      ? filteredTopology.join("\n")
      : "(Empty or single-file repository)"
  );

  if (highSignalFiles.length > 0) {
    promptParts.push(
      "\n=== HIGH-SIGNAL SCHEMAS, CONFIGS & CORE ARCHITECTURE ==="
    );
    for (const hsf of highSignalFiles) {
      promptParts.push(
        `--- [${hsf.category.toUpperCase()}] ${hsf.path} ---\n${hsf.content}\n`
      );
    }
  }

  promptParts.push(
    "\n=== DEVELOPER COMMIT HISTORY (Real Challenges & Friction Source) ==="
  );
  if (recentCommits.length > 0) {
    promptParts.push(
      recentCommits
        .map(
          (c) =>
            `- [${c.date ? c.date.slice(0, 10) : "Recent"}] (${c.sha}) ${
              c.message
            }`
        )
        .join("\n")
    );
  } else {
    promptParts.push(
      "No commit history available. Deduce technical challenges from architectural patterns and dependencies."
    );
  }

  const formattedPromptDigest = promptParts.join("\n");

  return {
    owner,
    repo,
    fullName,
    defaultBranch,
    repository: repoMeta,
    topology: filteredTopology,
    hasBoilerplateReadme,
    readmeContent,
    manifest: {
      type: manifestType,
      dependencies: manifestDeps,
      devDependencies: manifestDevDeps,
      scripts: manifestScripts,
      raw: rawManifest,
    },
    highSignalFiles,
    recentCommits,
    latestCommitSha,
    languages,
    formattedPromptDigest,
  };
}

/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 * 
 * GitHub OpenGraph and Repository URL Resolution Utilities
 */

/**
 * Extracts owner and repository from a GitHub URL and returns the standard OpenGraph image URL.
 */
export function getGitHubOpenGraphUrl(
  githubUrl?: string,
  repoFullName?: string
): string | null {
  if (repoFullName && repoFullName.includes("/")) {
    return `https://opengraph.githubassets.com/1/${repoFullName.trim()}`;
  }

  if (!githubUrl) return null;

  const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "").replace(/\/$/, "");

  return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
}

/**
 * Codebase Environment Variable Extractor
 * Scans source code and configuration files for process.env and import.meta.env references.
 */

// Common standard runtime / system variables to ignore
const IGNORED_ENV_VARS = new Set([
  "NODE_ENV",
  "PORT",
  "VERCEL",
  "VERCEL_URL",
  "VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_URL",
  "NEXT_PUBLIC_VERCEL_ENV",
  "CI",
  "BASE_URL",
  "DEV",
  "PROD",
  "MODE",
  "SSR",
  "TZ",
  "HOME",
  "USER",
  "PATH",
  "SHELL",
  "PWD",
  "LANG",
  "npm_package_name",
  "npm_package_version",
]);

/**
 * Extracts environment variable names from a text code block
 */
export function extractEnvVarsFromText(content: string): string[] {
  if (!content || typeof content !== "string") return [];

  const found = new Set<string>();

  // Match process.env.VAR_NAME or process.env["VAR_NAME"] or process.env['VAR_NAME']
  const processEnvRegex = /process\.env(?:\.([A-Z0-9_]+)|\[["']([A-Z0-9_]+)["']\])/g;
  let match: RegExpExecArray | null;

  while ((match = processEnvRegex.exec(content)) !== null) {
    const key = match[1] || match[2];
    if (key && !IGNORED_ENV_VARS.has(key) && key.length > 1) {
      found.add(key);
    }
  }

  // Match import.meta.env.VITE_VAR_NAME or import.meta.env["VITE_VAR_NAME"]
  const importMetaRegex = /import\.meta\.env(?:\.([A-Z0-9_]+)|\[["']([A-Z0-9_]+)["']\])/g;
  while ((match = importMetaRegex.exec(content)) !== null) {
    const key = match[1] || match[2];
    if (key && !IGNORED_ENV_VARS.has(key) && key.length > 1) {
      found.add(key);
    }
  }

  // Match .env or .env.example lines like VAR_NAME=...
  const envFileLineRegex = /^\s*([A-Z0-9_]{2,})\s*=/gm;
  while ((match = envFileLineRegex.exec(content)) !== null) {
    const key = match[1];
    if (key && !IGNORED_ENV_VARS.has(key)) {
      found.add(key);
    }
  }

  return Array.from(found).sort();
}

/**
 * Scans multiple files and returns all unique environment variables found
 */
export function extractEnvVarsFromFiles(
  files: Array<{ path: string; content: string }>,
): string[] {
  const allFound = new Set<string>();

  for (const file of files) {
    const vars = extractEnvVarsFromText(file.content);
    for (const v of vars) {
      allFound.add(v);
    }
  }

  return Array.from(allFound).sort();
}

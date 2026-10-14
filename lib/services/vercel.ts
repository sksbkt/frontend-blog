/**
 * Vercel REST API Service Client
 * Handles programmatic project creation, git linking, environment variable provisioning,
 * deployment triggering, and live URL polling.
 */

const VERCEL_API = "https://api.vercel.com";

function getVercelToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error(
      "Missing VERCEL_TOKEN environment variable. Please configure it in .env.local to enable automated Vercel deployments."
    );
  }
  return token;
}

function getTeamIdQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type VercelProject = {
  id: string;
  name: string;
  link?: {
    type: string;
    repo: string;
    repoId?: number;
  };
};

export type VercelEnvVarInput = {
  key: string;
  value: string;
  isSecret?: boolean;
  target?: ("production" | "preview" | "development")[];
};

export type VercelDeployment = {
  id: string;
  url: string;
  readyState: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
  name: string;
};

/**
 * 1. Creates a project or retrieves an existing one and links it to a GitHub repository
 */
export async function createOrLinkProject(
  name: string,
  gitRepo: string, // e.g. "sksbkt/gaming-front-1"
  framework?: string
): Promise<VercelProject> {
  const token = getVercelToken();
  const headers = getHeaders(token);
  const teamQuery = getTeamIdQuery();

  // Sanitize project name to valid Vercel slug (max 100 lowercase alphanumeric or hyphens)
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  // First check if the project already exists
  const getRes = await fetch(`${VERCEL_API}/v9/projects/${safeName}${teamQuery}`, {
    method: "GET",
    headers,
  });

  if (getRes.ok) {
    const existing = await getRes.json();
    return {
      id: existing.id,
      name: existing.name,
      link: existing.link,
    };
  }

  // Create new project linked to GitHub repository
  const createPayload: Record<string, unknown> = {
    name: safeName,
    gitRepository: {
      type: "github",
      repo: gitRepo,
    },
  };
  if (framework) {
    createPayload.framework = framework;
  }

  const postRes = await fetch(`${VERCEL_API}/v10/projects${teamQuery}`, {
    method: "POST",
    headers,
    body: JSON.stringify(createPayload),
  });

  if (!postRes.ok) {
    const err = await postRes.json().catch(() => ({}));
    throw new Error(
      `Vercel create project failed (${postRes.status}): ${
        err.error?.message || err.message || JSON.stringify(err)
      }`
    );
  }

  const created = await postRes.json();
  return {
    id: created.id,
    name: created.name,
    link: created.link,
  };
}

/**
 * 2. Sets encrypted environment variables for a Vercel project
 */
export async function setEnvironmentVariables(
  projectId: string,
  envVars: VercelEnvVarInput[]
): Promise<boolean> {
  if (!envVars || envVars.length === 0) return true;

  const token = getVercelToken();
  const headers = getHeaders(token);
  const teamQuery = getTeamIdQuery();

  // Provision each variable across production, preview, and development targets
  for (const env of envVars) {
    const payload = {
      key: env.key.trim(),
      value: env.value.trim(),
      type: env.isSecret ? "encrypted" : "plain",
      target: env.target || ["production", "preview", "development"],
    };

    const res = await fetch(`${VERCEL_API}/v10/projects/${projectId}/env${teamQuery}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // If variable already exists (400 / ENV_ALREADY_EXISTS), attempt update or ignore
      if (err.error?.code === "ENV_ALREADY_EXISTS" || err.code === "ENV_ALREADY_EXISTS") {
        console.log(`[Vercel] Variable ${env.key} already exists on project, skipping create.`);
        continue;
      }
      console.warn(`[Vercel] Warning setting env var ${env.key}:`, err);
    }
  }

  return true;
}

/**
 * 3. Triggers a new deployment on Vercel via Git source
 */
export async function createDeployment(
  projectName: string,
  gitRepo: string, // e.g. "sksbkt/gaming-front-1"
  branch: string = "main"
): Promise<VercelDeployment> {
  const token = getVercelToken();
  const headers = getHeaders(token);
  const teamQuery = getTeamIdQuery();

  const payload = {
    name: projectName,
    gitSource: {
      type: "github",
      repo: gitRepo,
      ref: branch,
    },
    target: "production",
  };

  const res = await fetch(`${VERCEL_API}/v13/deployments${teamQuery}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Vercel create deployment failed (${res.status}): ${
        err.error?.message || err.message || JSON.stringify(err)
      }`
    );
  }

  const data = await res.json();
  return {
    id: data.id,
    url: data.url,
    readyState: data.readyState,
    name: data.name,
  };
}

/**
 * 4. Polls deployment status until READY or failed
 */
export async function waitForDeployment(
  deploymentId: string,
  maxWaitMs: number = 180000,
  pollIntervalMs: number = 4000
): Promise<{ liveUrl: string; deployment: VercelDeployment }> {
  const token = getVercelToken();
  const headers = getHeaders(token);
  const teamQuery = getTeamIdQuery();
  const startTime = Date.now();

  console.log(`[Vercel] Waiting for deployment ${deploymentId} to become ready...`);

  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}${teamQuery}`, {
      method: "GET",
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      const readyState = data.readyState;

      if (readyState === "READY") {
        const liveUrl = data.url.startsWith("http") ? data.url : `https://${data.url}`;
        console.log(`[Vercel] Deployment ${deploymentId} is READY at ${liveUrl}`);
        return {
          liveUrl,
          deployment: {
            id: data.id,
            url: data.url,
            readyState: data.readyState,
            name: data.name,
          },
        };
      }

      if (readyState === "ERROR" || readyState === "CANCELED") {
        throw new Error(
          `Vercel deployment failed with status "${readyState}". Check build logs on Vercel dashboard.`
        );
      }

      console.log(`[Vercel] Deployment ${deploymentId} state: ${readyState}...`);
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`Vercel deployment ${deploymentId} timed out after ${maxWaitMs / 1000} seconds.`);
}

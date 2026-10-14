/**
 * GitHub API Service Helper to Deploy Visual Asset Runner to Target Repositories
 * 
 * 1. Pushes scripts/capture-preview.mjs
 * 2. Pushes .github/workflows/generate-assets.yml
 * 3. Dispatches the GitHub Actions workflow run
 */

import {
  GENERIC_CAPTURE_SCRIPT_TEMPLATE,
  GENERIC_WORKFLOW_YAML_TEMPLATE,
} from "@/lib/templates/asset-runner-template";

const GITHUB_API = "https://api.github.com";

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export type DeployAssetRunnerOptions = {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  triggerRun?: boolean;
  targetUrl?: string;
};

export type DeployAssetRunnerResult = {
  success: boolean;
  owner: string;
  repo: string;
  branch: string;
  scriptCommitted: boolean;
  workflowCommitted: boolean;
  workflowDispatched: boolean;
  workflowUrl: string;
  runUrl?: string | null;
  message: string;
};

/**
 * Pushes or updates a file on GitHub via the contents API.
 */
async function pushFileToRepo(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
  token: string
) {
  const headers = getHeaders(token);

  // Check if file exists to get existing SHA
  let existingSha: string | undefined = undefined;
  const checkUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
  const checkRes = await fetch(checkUrl, { headers });

  if (checkRes.ok) {
    const fileData = await checkRes.json();
    existingSha = fileData.sha;
  }

  const base64Content = Buffer.from(content, "utf-8").toString("base64");
  const putUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;

  const payload: Record<string, unknown> = {
    message: commitMessage,
    content: base64Content,
    branch,
  };
  if (existingSha) payload.sha = existingSha;

  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  if (!putRes.ok) {
    const errorJson = await putRes.json().catch(() => ({}));
    if (filePath.startsWith(".github/workflows/") && (putRes.status === 404 || putRes.status === 403)) {
      throw new Error(
        `GitHub requires the "workflow" OAuth scope to create files in .github/workflows/. Please log out of the Admin Studio and reconnect with GitHub to authorize the workflow permission.`
      );
    }
    throw new Error(
      `Failed to write ${filePath} to ${owner}/${repo}: ${putRes.status} ${
        errorJson.message || JSON.stringify(errorJson)
      }`
    );
  }

  return true;
}

/**
 * Deploys the capture script and workflow to the target repository and triggers execution.
 */
export async function deployAssetRunnerToRepo(
  options: DeployAssetRunnerOptions
): Promise<DeployAssetRunnerResult> {
  const { owner, repo, token, branch: requestedBranch, triggerRun = true } = options;
  const headers = getHeaders(token);

  // 1. Resolve default branch
  let branch: string = requestedBranch || "main";
  if (!requestedBranch) {
    const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
    if (repoRes.ok) {
      const repoData = await repoRes.json();
      branch = repoData.default_branch || "main";
    }
  }

  // 2. Commit scripts/capture-preview.mjs
  console.log(`[Deploy Runner] Committing scripts/capture-preview.mjs to ${owner}/${repo}@${branch}...`);
  const scriptCommitted = await pushFileToRepo(
    owner,
    repo,
    "scripts/capture-preview.mjs",
    GENERIC_CAPTURE_SCRIPT_TEMPLATE,
    "ci: setup automated visual asset capture script",
    branch,
    token
  );

  // 3. Commit .github/workflows/generate-assets.yml
  console.log(`[Deploy Runner] Committing .github/workflows/generate-assets.yml to ${owner}/${repo}@${branch}...`);
  const workflowCommitted = await pushFileToRepo(
    owner,
    repo,
    ".github/workflows/generate-assets.yml",
    GENERIC_WORKFLOW_YAML_TEMPLATE,
    "ci: add automated visual asset & GIF generation workflow",
    branch,
    token
  );

  // 4. Dispatch workflow run if requested
  let workflowDispatched = false;
  let runUrl: string | null = null;
  const workflowFileName = "generate-assets.yml";
  const workflowUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflowFileName}`;

  if (triggerRun) {
    console.log(`[Deploy Runner] Dispatching workflow ${workflowFileName} on branch ${branch}...`);
    // Brief pause to allow GitHub Actions indexer to register the new workflow file
    await new Promise((r) => setTimeout(r, 1500));

    const dispatchUrl = `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/dispatches`;
    const dispatchRes = await fetch(dispatchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref: branch,
        inputs: {
          commit_assets: true,
          upload_artifacts: true,
          target_url: options.targetUrl || "",
        },
      }),
    });

    if (dispatchRes.ok || dispatchRes.status === 204) {
      workflowDispatched = true;
      console.log(`[Deploy Runner] Workflow dispatched successfully!`);

      // Try to fetch latest run
      await new Promise((r) => setTimeout(r, 2000));
      const runsRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/runs?per_page=1`,
        { headers }
      );
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
          runUrl = runsData.workflow_runs[0].html_url;
        }
      }
    } else {
      const err = await dispatchRes.json().catch(() => ({}));
      console.warn(`[Deploy Runner] Dispatch returned ${dispatchRes.status}: ${JSON.stringify(err)}`);
    }
  }

  return {
    success: true,
    owner,
    repo,
    branch,
    scriptCommitted,
    workflowCommitted,
    workflowDispatched,
    workflowUrl,
    runUrl: runUrl || workflowUrl,
    message: workflowDispatched
      ? `Successfully deployed asset capture workflow to ${owner}/${repo} and dispatched run on branch "${branch}"!`
      : `Successfully committed capture files to ${owner}/${repo} on branch "${branch}".`,
  };
}

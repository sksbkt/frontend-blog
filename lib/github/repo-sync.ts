/**
 * GitHub Reverse Sync Helper
 * Commits updated/approved README.md files directly to default branch or via a Pull Request.
 */

export type SyncMode = "direct" | "pr";

export type SyncReadmeOptions = {
  fullName: string;
  content: string;
  mode: SyncMode;
  targetBranch?: string;
  branchName?: string;
  commitMessage?: string;
  prTitle?: string;
  prBody?: string;
  token: string;
};

export type SyncReadmeResult = {
  success: boolean;
  mode: SyncMode;
  branch: string;
  readmePath: string;
  commitSha: string;
  commitUrl: string;
  pullRequest?: {
    number: number;
    title: string;
    htmlUrl: string;
    branch: string;
  } | null;
  message: string;
};

const GITHUB_API = "https://api.github.com";

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

/**
 * Commits a README file back to a GitHub repository, either directly or via Pull Request.
 */
export async function syncReadmeToRepo(options: SyncReadmeOptions): Promise<SyncReadmeResult> {
  const {
    fullName,
    content,
    mode,
    targetBranch: requestedBranch,
    branchName: customBranchName,
    commitMessage: customCommitMsg,
    prTitle: customPrTitle,
    prBody: customPrBody,
    token,
  } = options;

  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repository full name: "${fullName}". Format must be owner/repo.`);
  }

  const headers = getHeaders(token);

  // 1. Fetch repo metadata to determine default branch
  const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    const errorBody = await repoRes.text();
    throw new Error(`Failed to fetch repo ${fullName}: ${repoRes.status} ${errorBody}`);
  }
  const repoData = await repoRes.json();
  const defaultBranch = requestedBranch || repoData.default_branch || "main";

  let branchToCommit = defaultBranch;
  let createdPrData: SyncReadmeResult["pullRequest"] = null;

  // 2. If PR mode, create a new branch from default branch
  if (mode === "pr") {
    // Generate clean branch name
    const timestamp = Date.now().toString(36);
    const branchName = customBranchName?.trim()
      ? customBranchName.trim().replace(/^refs\/heads\//, "").replace(/[^a-zA-Z0-9_\-\/]/g, "-")
      : `docs/bilingual-readme-${timestamp}`;

    branchToCommit = branchName;

    // Get default branch commit SHA
    let baseSha: string | null = null;
    const refRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers });
    if (refRes.ok) {
      const refData = await refRes.json();
      baseSha = refData.object?.sha;
    } else {
      // Fallback to commits endpoint
      const commitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${defaultBranch}`, { headers });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        baseSha = commitData.sha;
      }
    }

    if (!baseSha) {
      throw new Error(`Could not determine commit SHA for base branch "${defaultBranch}".`);
    }

    // Create the new branch reference
    const createRefRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    });

    if (!createRefRes.ok) {
      // If ref already exists (422), check if it's existing or throw
      const errorJson = await createRefRes.json().catch(() => ({}));
      if (createRefRes.status !== 422 || !errorJson.message?.includes("Reference already exists")) {
        throw new Error(`Failed to create branch "${branchName}": ${createRefRes.status} ${JSON.stringify(errorJson)}`);
      }
    }
  }

  // 3. Check for existing README on the target branch to obtain its SHA (needed for update)
  let existingSha: string | undefined = undefined;
  let readmePath = "README.md";

  const readmeCheckUrl = `${GITHUB_API}/repos/${owner}/${repo}/readme?ref=${encodeURIComponent(branchToCommit)}`;
  const readmeCheckRes = await fetch(readmeCheckUrl, { headers });

  if (readmeCheckRes.ok) {
    const readmeData = await readmeCheckRes.json();
    existingSha = readmeData.sha;
    if (readmeData.path) {
      readmePath = readmeData.path;
    }
  } else if (mode === "pr") {
    // If not found on the newly created branch, check on defaultBranch
    const defaultReadmeRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/readme?ref=${encodeURIComponent(defaultBranch)}`,
      { headers }
    );
    if (defaultReadmeRes.ok) {
      const defData = await defaultReadmeRes.json();
      existingSha = defData.sha;
      if (defData.path) readmePath = defData.path;
    }
  }

  // 4. Commit README file
  const commitMessage =
    customCommitMsg?.trim() ||
    (existingSha
      ? "docs: update bilingual README.md (English & Persian) via Admin Studio"
      : "docs: add bilingual README.md (English & Persian) via Admin Studio");

  const base64Content = Buffer.from(content, "utf-8").toString("base64");

  const putUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${readmePath}`;
  const putPayload: Record<string, unknown> = {
    message: commitMessage,
    content: base64Content,
    branch: branchToCommit,
  };
  if (existingSha) {
    putPayload.sha = existingSha;
  }

  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(putPayload),
  });

  if (!putRes.ok) {
    const errorJson = await putRes.json().catch(() => ({}));
    throw new Error(
      `Failed to commit ${readmePath} to ${fullName} on branch ${branchToCommit}: ${putRes.status} ${
        errorJson.message || JSON.stringify(errorJson)
      }`
    );
  }

  const putData = await putRes.json();
  const commitSha = putData.commit?.sha || "";
  const commitUrl =
    putData.commit?.html_url || `https://github.com/${owner}/${repo}/commit/${commitSha}`;

  // 5. If PR mode, create Pull Request
  if (mode === "pr") {
    const prTitle =
      customPrTitle?.trim() || "docs: update bilingual README.md (English & Persian)";
    const prBody =
      customPrBody?.trim() ||
      `### Bilingual Documentation Update 🌐\n\nThis pull request updates **\`${readmePath}\`** with a complete bilingual (English & Persian) overview, setup instructions, and architecture highlights.\n\n*Generated and synced via Admin Studio with Google Gemini.*`;

    const prRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: prTitle,
        head: branchToCommit,
        base: defaultBranch,
        body: prBody,
      }),
    });

    if (prRes.ok) {
      const prData = await prRes.json();
      createdPrData = {
        number: prData.number,
        title: prData.title,
        htmlUrl: prData.html_url,
        branch: branchToCommit,
      };
    } else {
      const prError = await prRes.json().catch(() => ({}));
      // Check if PR already exists
      if (prRes.status === 422 && String(prError.message || "").includes("pull request already exists")) {
        // Fetch existing PR
        const listPrsRes = await fetch(
          `${GITHUB_API}/repos/${owner}/${repo}/pulls?head=${owner}:${branchToCommit}&state=open`,
          { headers }
        );
        if (listPrsRes.ok) {
          const prs = await listPrsRes.json();
          if (prs.length > 0) {
            createdPrData = {
              number: prs[0].number,
              title: prs[0].title,
              htmlUrl: prs[0].html_url,
              branch: branchToCommit,
            };
          }
        }
      }

      if (!createdPrData) {
        throw new Error(
          `Committed to branch "${branchToCommit}", but failed to open Pull Request: ${
            prError.message || JSON.stringify(prError)
          }`
        );
      }
    }
  }

  const successMessage =
    mode === "pr"
      ? `Pull request #${createdPrData?.number} created successfully on branch "${branchToCommit}"!`
      : `Successfully committed ${readmePath} directly to branch "${defaultBranch}"!`;

  return {
    success: true,
    mode,
    branch: branchToCommit,
    readmePath,
    commitSha,
    commitUrl,
    pullRequest: createdPrData,
    message: successMessage,
  };
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

type GitHubRepository = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
};

type GitHubFile = {
  content: string;
  encoding: string;
};

async function githubFetch<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Portfolio-Admin-CMS",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function githubFetchOptional<T>(url: string, token: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Portfolio-Admin-CMS",
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { fullName } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.includes("/")) {
      return NextResponse.json(
        { success: false, message: "Valid repository fullName (owner/repo) is required." },
        { status: 400 },
      );
    }

    const [owner, repo] = fullName.split("/");
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    // 1. Fetch repo data, README, and package.json with admin's GitHub token
    const [repoData, readmeData, packageJsonData] = await Promise.all([
      githubFetch<GitHubRepository>(apiBase, session.accessToken),
      githubFetch<GitHubFile>(`${apiBase}/readme`, session.accessToken),
      githubFetchOptional<GitHubFile>(`${apiBase}/contents/package.json`, session.accessToken),
    ]);

    const readme = Buffer.from(
      readmeData.content,
      readmeData.encoding as BufferEncoding,
    ).toString("utf-8");

    let packageJson: Record<string, unknown> | null = null;
    if (packageJsonData) {
      try {
        const pkgStr = Buffer.from(
          packageJsonData.content,
          packageJsonData.encoding as BufferEncoding,
        ).toString("utf-8");
        packageJson = JSON.parse(pkgStr);
      } catch (err) {
        console.warn("Failed to parse package.json from repo:", err);
      }
    }

    // 2. Call the AI project generation endpoint
    const aiApiUrl = new URL("/api/ai/project", request.url).toString();
    const aiResponse = await fetch(aiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repository: repoData,
        readme,
        packageJson,
      }),
    });

    const aiResult = await aiResponse.json();

    if (!aiResponse.ok || !aiResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: aiResult.message || "Failed to generate AI project draft.",
          error: aiResult.error || null,
        },
        { status: aiResponse.status || 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Repository successfully analyzed and draft created in Sanity!",
      project: aiResult.project,
      draft: aiResult.draft,
    });
  } catch (error) {
    console.error("Generate project draft error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to analyze repository.",
      },
      { status: 500 },
    );
  }
}

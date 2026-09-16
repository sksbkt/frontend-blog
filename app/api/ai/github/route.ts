import { NextResponse } from "next/server";

type GitHubRepository = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
};

function parseGitHubUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.hostname !== "github.com") {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, ""),
    };
  } catch {
    return null;
  }
}

async function githubFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "A GitHub repository URL is required.",
        },
        { status: 400 },
      );
    }

    const repository = parseGitHubUrl(body.url.trim());

    if (!repository) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid GitHub repository URL.",
        },
        { status: 400 },
      );
    }

    const apiBase = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;

    const [repoData, readmeData] = await Promise.all([
      githubFetch<GitHubRepository>(apiBase),
      githubFetch<{ content: string; encoding: string }>(`${apiBase}/readme`),
    ]);

    const readme = Buffer.from(
      readmeData.content,
      readmeData.encoding as BufferEncoding,
    ).toString("utf-8");

    return NextResponse.json({
      success: true,
      repository: {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        url: repoData.html_url,
        homepage: repoData.homepage,
        language: repoData.language,
        topics: repoData.topics,
      },
      readme,
    });
  } catch (error) {
    console.error("GitHub repository error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to read the GitHub repository.",
      },
      { status: 500 },
    );
  }
}

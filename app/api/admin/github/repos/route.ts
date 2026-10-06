import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writeClient } from "@/lib/sanity/write-client";

type GitHubRepoItem = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  updated_at: string;
  topics?: string[];
  default_branch: string;
};

type SanityProjectCheck = {
  _id: string;
  github?: string;
  isDraft: boolean;
};

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase().trim() || "";

  try {
    // 1. Fetch repos from GitHub using session access token
    const ghResponse = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Portfolio-Admin-CMS",
        },
        cache: "no-store",
      },
    );

    if (!ghResponse.ok) {
      const err = await ghResponse.text();
      return NextResponse.json(
        {
          success: false,
          message: `GitHub API error: ${ghResponse.status}`,
          details: err,
        },
        { status: ghResponse.status },
      );
    }

    const repos = (await ghResponse.json()) as GitHubRepoItem[];

    // 2. Fetch existing Sanity projects to cross-reference imported status
    let existingProjects: SanityProjectCheck[] = [];
    try {
      existingProjects = await writeClient.fetch<SanityProjectCheck[]>(
        `*[_type == "project"]{
          _id,
          github,
          "isDraft": _id in path("drafts.**")
        }`,
      );
    } catch (err) {
      console.warn("Failed to fetch existing Sanity projects for status check:", err);
    }

    // Build map of github url -> status
    const statusMap = new Map<string, "published" | "draft">();
    for (const proj of existingProjects) {
      if (!proj.github) continue;
      const normalizedUrl = proj.github.trim().toLowerCase().replace(/\.git$/, "");
      if (proj.isDraft) {
        if (!statusMap.has(normalizedUrl)) {
          statusMap.set(normalizedUrl, "draft");
        }
      } else {
        statusMap.set(normalizedUrl, "published");
      }
    }

    // 3. Filter and enrich repos
    const enrichedRepos = repos
      .filter((repo) => {
        if (!search) return true;
        return (
          repo.name.toLowerCase().includes(search) ||
          (repo.description && repo.description.toLowerCase().includes(search)) ||
          (repo.language && repo.language.toLowerCase().includes(search))
        );
      })
      .map((repo) => {
        const normalizedUrl = repo.html_url.toLowerCase().replace(/\.git$/, "");
        const status = statusMap.get(normalizedUrl) || "none";

        return {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          homepage: repo.homepage || "",
          language: repo.language || "Unknown",
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          isPrivate: repo.private,
          updatedAt: repo.updated_at,
          topics: repo.topics || [],
          defaultBranch: repo.default_branch,
          importStatus: status,
        };
      });

    return NextResponse.json({
      success: true,
      repos: enrichedRepos,
    });
  } catch (error) {
    console.error("Admin GitHub repos error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch repositories.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { fetchRepoLanguages, computeLanguageBreakdown } from "@/lib/github/languages";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const fullName = searchParams.get("fullName") || searchParams.get("repo");

  if (!fullName || !fullName.includes("/")) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or missing repository full name. Expected 'owner/repo'.",
      },
      { status: 400 }
    );
  }

  const [owner, repo] = fullName.split("/");
  const token = session.accessToken || process.env.GITHUB_TOKEN;

  try {
    const rawLanguages = await fetchRepoLanguages(owner, repo, { token });
    const breakdown = computeLanguageBreakdown(rawLanguages);

    return NextResponse.json({
      success: true,
      fullName,
      rawLanguages,
      breakdown,
    });
  } catch (error) {
    console.error("[GitHubLanguagesAPI] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch repository languages.",
      },
      { status: 500 }
    );
  }
}

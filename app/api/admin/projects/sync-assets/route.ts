import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { syncRepoAssetsToProject } from "@/lib/services/sync-assets";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.accessToken) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Active admin GitHub session required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { fullName, branch = "main", projectId } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.includes("/")) {
      return NextResponse.json(
        { success: false, message: "Valid repository fullName (owner/repo) is required." },
        { status: 400 }
      );
    }

    const [owner, repo] = fullName.split("/");

    const result = await syncRepoAssetsToProject({
      owner,
      repo,
      branch: typeof branch === "string" ? branch.trim() : "main",
      token: session.accessToken,
      projectId: typeof projectId === "string" ? projectId.trim() : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync assets error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to sync visual assets to Sanity.",
      },
      { status: 500 }
    );
  }
}

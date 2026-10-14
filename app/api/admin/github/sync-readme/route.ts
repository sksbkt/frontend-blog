import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { syncReadmeToRepo, type SyncMode } from "@/lib/github/repo-sync";

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
    let {
      fullName,
      content,
      mode = "direct",
      targetBranch,
      branchName,
      commitMessage,
      prTitle,
      prBody,
    } = body;

    // Defensively sanitize repository fullName
    if (typeof fullName === "string") {
      fullName = fullName
        .trim()
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\.git$/, "");
    }

    if (!fullName || typeof fullName !== "string" || !fullName.includes("/") || fullName.split("/").filter(Boolean).length !== 2) {
      console.warn("[sync-readme] 400 Bad Request - Invalid repository fullName:", fullName);
      return NextResponse.json(
        {
          success: false,
          message: `Valid repository fullName (owner/repo) is required. Received: "${fullName || ""}"`,
        },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      console.warn("[sync-readme] 400 Bad Request - Empty README content for repo:", fullName);
      return NextResponse.json(
        { success: false, message: "README markdown content cannot be empty." },
        { status: 400 }
      );
    }

    const syncMode: SyncMode = mode === "pr" ? "pr" : "direct";

    const result = await syncReadmeToRepo({
      fullName,
      content,
      mode: syncMode,
      targetBranch: typeof targetBranch === "string" ? targetBranch.trim() : undefined,
      branchName: typeof branchName === "string" ? branchName.trim() : undefined,
      commitMessage: typeof commitMessage === "string" ? commitMessage.trim() : undefined,
      prTitle: typeof prTitle === "string" ? prTitle.trim() : undefined,
      prBody: typeof prBody === "string" ? prBody.trim() : undefined,
      token: session.accessToken,
    });

    return NextResponse.json({
      ...result,
    });
  } catch (error) {
    console.error("GitHub README sync error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to sync README to GitHub.",
      },
      { status: 500 }
    );
  }
}

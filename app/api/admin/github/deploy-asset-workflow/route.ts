import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deployAssetRunnerToRepo } from "@/lib/github/asset-runner-deployer";

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
    const { fullName, branch, triggerRun = true } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.includes("/")) {
      return NextResponse.json(
        { success: false, message: "Valid repository fullName (owner/repo) is required." },
        { status: 400 }
      );
    }

    const [owner, repo] = fullName.split("/");

    const result = await deployAssetRunnerToRepo({
      owner,
      repo,
      branch: typeof branch === "string" ? branch.trim() : undefined,
      triggerRun: Boolean(triggerRun),
      token: session.accessToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Deploy asset runner error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to deploy visual asset workflow.",
      },
      { status: 500 }
    );
  }
}

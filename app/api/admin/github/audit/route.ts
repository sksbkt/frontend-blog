import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { inspectRepository } from "@/lib/github/repo-inspector";
import { generateRepoAudit } from "@/lib/ai/repo-auditor";

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

    // 1. Inspect repository context
    const context = await inspectRepository(fullName, session.accessToken);

    // 2. Generate audit report & bilingual README draft
    const audit = await generateRepoAudit(context);

    return NextResponse.json({
      success: true,
      context: {
        fullName,
        hasReadme: context.readme.exists,
        readmeSize: context.readme.size,
        totalFiles: context.structure.totalFiles,
        configFiles: context.structure.configFiles,
        entryPoint: context.structure.entryPoint.path,
        hasPackageJson: Boolean(context.packageJson),
        defaultBranch: context.repository.defaultBranch,
        detectedEnvKeys: context.detectedEnvKeys || [],
      },
      audit,
      readmeDraft: audit.bilingualReadmeDraft,
    });
  } catch (error) {
    console.error("Repository audit endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to audit repository.",
      },
      { status: 500 },
    );
  }
}

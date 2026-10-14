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

    // 1. Inspect repository context (README, file tree, package.json, entry points)
    const repoContext = await inspectRepository(fullName, session.accessToken);

    // 2. Generate audit report & bilingual README draft via Gemini
    let auditResult = null;
    try {
      auditResult = await generateRepoAudit(repoContext);
    } catch (auditErr) {
      console.warn("Failed to generate audit report:", auditErr);
    }

    // 3. Prepare README content for Sanity draft creation (existing README or generated README)
    const readmeForDraft = repoContext.readme.exists
      ? repoContext.readme.content
      : auditResult?.bilingualReadmeDraft || `# ${repoContext.repository.name}\n\n${repoContext.repository.description || "Portfolio project."}`;

    // 4. Call the AI project generation endpoint to create Sanity draft
    const aiApiUrl = new URL("/api/ai/project", request.url).toString();
    const aiResponse = await fetch(aiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repository: {
          name: repoContext.repository.name,
          full_name: repoContext.repository.fullName,
          description: repoContext.repository.description,
          html_url: repoContext.repository.htmlUrl,
          homepage: repoContext.repository.homepage,
          language: repoContext.repository.language,
          topics: repoContext.repository.topics,
        },
        readme: readmeForDraft,
        packageJson: repoContext.packageJson,
      }),
    });

    const aiResult = await aiResponse.json();

    if (!aiResponse.ok || !aiResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: aiResult.message || "Failed to generate AI project draft.",
          error: aiResult.error || null,
          audit: auditResult,
          readmeDraft: auditResult?.bilingualReadmeDraft || null,
        },
        { status: aiResponse.status || 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Repository successfully analyzed and draft created in Sanity!",
      project: aiResult.project,
      draft: aiResult.draft,
      audit: auditResult,
      readmeDraft: auditResult?.bilingualReadmeDraft || null,
      context: {
        fullName,
        hasReadme: repoContext.readme.exists,
        readmeSize: repoContext.readme.size,
        totalFiles: repoContext.structure.totalFiles,
        configFiles: repoContext.structure.configFiles,
        entryPoint: repoContext.structure.entryPoint.path,
        hasPackageJson: Boolean(repoContext.packageJson),
        defaultBranch: repoContext.repository.defaultBranch,
      },
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

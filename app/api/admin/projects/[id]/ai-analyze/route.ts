import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { fetchHighSignalRepoContext } from "@/lib/github/scanner";
import { analyzeRepositoryHeuristic } from "@/lib/gemini/analyzer";
import { isRateLimitOrCapacityError } from "@/lib/gemini/queue";
import { formatProjectLanguages } from "@/lib/github/languages";
import { writeClient } from "@/lib/sanity/write-client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const draftId = decodedId.startsWith("drafts.") ? decodedId : `drafts.${decodedId}`;

    const body = await request.json().catch(() => ({}));
    let fullName = body.fullName as string | undefined;
    const forceRefresh = Boolean(body.forceRefresh);

    // 1. Resolve project document and GitHub repo name
    const existingDocs = await writeClient.fetch<Array<{ _id: string; github?: string }>>(
      `*[_type == "project" && (_id == $id || _id == $draftId || slug.current == $id || title.en == $id)] | order(_updatedAt desc){ _id, github }`,
      { id: decodedId, draftId }
    );

    const existingDoc =
      existingDocs.find((d) => d._id.startsWith("drafts.")) || existingDocs[0];

    const targetDraftId = existingDoc
      ? existingDoc._id.startsWith("drafts.")
        ? existingDoc._id
        : `drafts.${existingDoc._id}`
      : draftId;

    if (!fullName && existingDoc?.github) {
      fullName = existingDoc.github
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\/$/, "");
    }

    // Fallback: derive from clean decoded id if it matches owner/repo pattern
    if (!fullName || !fullName.includes("/")) {
      const cleanName = decodedId.replace(/^drafts\./, "");
      if (cleanName.includes("/")) {
        fullName = cleanName;
      } else {
        fullName = `${session.user.login}/${cleanName}`;
      }
    }

    const [owner, repo] = fullName.split("/");
    if (!owner || !repo) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid repository full name format: "${fullName}". Expected "owner/repo".`,
        },
        { status: 400 }
      );
    }

    const token = session.accessToken || process.env.GITHUB_TOKEN;

    // 2. High-Signal Heuristic Scan (~6k-8k tokens total) with ETag caching
    const heuristicContext = await fetchHighSignalRepoContext(owner, repo, token, {
      forceRefresh,
    });

    // 3. Call Heuristic Deep Scan Analyzer (Gemini)
    const deepScanResult = await analyzeRepositoryHeuristic(heuristicContext);

    // 4. Save/Patch into Sanity CMS target draft document
    const formattedLanguages = heuristicContext.languages
      ? formatProjectLanguages(heuristicContext.languages)
      : undefined;

    const patchPayload = {
      title: deepScanResult.title,
      slug: { _type: "slug", current: deepScanResult.slug },
      description: deepScanResult.description,
      technologies: deepScanResult.technologies,
      github: deepScanResult.github,
      demo: deepScanResult.demo || "",
      content: deepScanResult.content,
      aiContextDigest: deepScanResult.aiContextDigest,
      rawLanguages: heuristicContext.languages
        ? JSON.stringify(heuristicContext.languages)
        : undefined,
      languages: formattedLanguages,
    };

    const existingTarget = await writeClient.getDocument(targetDraftId);
    let finalProject;

    if (!existingTarget) {
      finalProject = await writeClient.createOrReplace({
        _id: targetDraftId,
        _type: "project",
        ...patchPayload,
        isDraft: true,
      });
    } else {
      finalProject = await writeClient.patch(targetDraftId).set(patchPayload).commit();
    }

    try {
      revalidateTag("projects", "max");
      revalidateTag(`project:${targetDraftId}`, "max");
      if (existingDoc && !existingDoc._id.startsWith("drafts.")) {
        revalidateTag(`project:${existingDoc._id}`, "max");
      }
      revalidateTag(`project:${deepScanResult.slug}`, "max");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "High-Signal Heuristic Deep Scan completed and technical dossier saved.",
      project: finalProject,
      aiContextDigest: deepScanResult.aiContextDigest,
      rawLanguages: heuristicContext.languages,
      languages: formattedLanguages,
      rawResponse: deepScanResult.rawResponse,
    });
  } catch (error) {
    console.error("[HeuristicDeepScanRoute] Error:", error);
    const isRateLimited = isRateLimitOrCapacityError(error);
    return NextResponse.json(
      {
        success: false,
        message: isRateLimited
          ? "Gemini AI capacity is currently saturated. Please wait a moment and try again."
          : error instanceof Error
          ? error.message
          : "Failed to run heuristic deep scan.",
      },
      { status: isRateLimited ? 429 : 500 }
    );
  }
}

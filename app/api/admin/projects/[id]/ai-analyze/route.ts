import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { fetchHighSignalRepoContext } from "@/lib/github/scanner";
import { analyzeRepositoryHeuristic } from "@/lib/gemini/analyzer";
import { formatProjectLanguages } from "@/lib/github/languages";
import { prisma } from "@/lib/prisma";
import type { ScanStreamEvent } from "@/types/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized: Admin session required." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { id } = await params;
  const decodedId = decodeURIComponent(id).replace(/^drafts\./, "");

  const body = await req.json().catch(() => ({}));
  let fullName = body.fullName as string | undefined;
  const forceRefresh = Boolean(body.forceRefresh);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: ScanStreamEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // 1. Resolve project from PostgreSQL
        const existingProject = await prisma.project.findFirst({
          where: {
            OR: [{ id: decodedId }, { slug: decodedId }],
          },
        });

        if (!fullName && existingProject?.githubUrl) {
          fullName = existingProject.githubUrl
            .replace(/^https?:\/\/github\.com\//, "")
            .replace(/\/$/, "");
        }

        if (!fullName || !fullName.includes("/")) {
          if (decodedId.includes("/")) {
            fullName = decodedId;
          } else {
            fullName = `${session.user.login}/${decodedId}`;
          }
        }

        const [owner, repo] = fullName.split("/");
        if (!owner || !repo) {
          sendEvent({
            stage: "ERROR",
            message: `Invalid repository full name format: "${fullName}". Expected "owner/repo".`,
            progressPercent: 0,
          });
          controller.close();
          return;
        }

        const token = session.accessToken || process.env.GITHUB_TOKEN;

        // Stage 1: Inspect repository tree & topological structure
        sendEvent({
          stage: "AUDITING_REPO_TREE",
          message: "Inspecting GitHub repository tree and commit topology...",
          progressPercent: 20,
        });

        const heuristicContext = await fetchHighSignalRepoContext(owner, repo, token, {
          forceRefresh,
        });

        // Stage 2: Extract manifests and configurations
        sendEvent({
          stage: "EXTRACTING_MANIFESTS",
          message: "Extracting package.json, configs, and schema models...",
          progressPercent: 45,
        });

        const formattedLanguages = heuristicContext.languages
          ? formatProjectLanguages(heuristicContext.languages)
          : undefined;

        // Stage 3: Synthesize dossier via Gemini
        sendEvent({
          stage: "SYNTHESIZING_GEMINI",
          message: "Synthesizing technical dossier via Gemini Flash...",
          progressPercent: 75,
        });

        const deepScanResult = await analyzeRepositoryHeuristic(heuristicContext);

        // Stage 4: Persist to Supabase PostgreSQL
        sendEvent({
          stage: "PERSISTING_DATABASE",
          message: "Saving context dossier to Supabase PostgreSQL...",
          progressPercent: 90,
        });

        const targetSlug =
          deepScanResult.slug ||
          existingProject?.slug ||
          repo.toLowerCase().replace(/[^a-z0-9]/g, "-");

        const title =
          deepScanResult.title?.en ||
          deepScanResult.title?.fa ||
          existingProject?.title ||
          targetSlug;

        const taglineEn =
          deepScanResult.description?.en || existingProject?.taglineEn || "";
        const taglineFa =
          deepScanResult.description?.fa || existingProject?.taglineFa || "";
        const descriptionEn =
          deepScanResult.content?.overview?.en ||
          deepScanResult.description?.en ||
          existingProject?.descriptionEn ||
          "";
        const descriptionFa =
          deepScanResult.content?.overview?.fa ||
          deepScanResult.description?.fa ||
          existingProject?.descriptionFa ||
          "";

        const finalProject = await prisma.project.upsert({
          where: { slug: targetSlug },
          update: {
            title,
            taglineEn,
            taglineFa,
            descriptionEn,
            descriptionFa,
            technologies:
              deepScanResult.technologies || existingProject?.technologies || [],
            githubUrl:
              deepScanResult.github ||
              existingProject?.githubUrl ||
              `https://github.com/${fullName}`,
            liveUrl: deepScanResult.demo || existingProject?.liveUrl || null,
            aiContextDigest: deepScanResult.aiContextDigest as any,
            languages: (formattedLanguages || existingProject?.languages || []) as any,
          },
          create: {
            slug: targetSlug,
            title,
            taglineEn,
            taglineFa,
            descriptionEn,
            descriptionFa,
            technologies: deepScanResult.technologies || [],
            githubUrl: deepScanResult.github || `https://github.com/${fullName}`,
            liveUrl: deepScanResult.demo || null,
            aiContextDigest: deepScanResult.aiContextDigest as any,
            languages: (formattedLanguages || []) as any,
            isPublished: true,
          },
        });

        try {
          revalidateTag("projects", "max");
          revalidateTag(`project:${targetSlug}`, "max");
        } catch {}

        // Stage 5: Complete
        sendEvent({
          stage: "COMPLETE",
          message: "Analysis complete and cached.",
          progressPercent: 100,
          data: {
            project: finalProject,
            aiContextDigest: deepScanResult.aiContextDigest,
            rawLanguages: heuristicContext.languages,
            languages: formattedLanguages,
            rawResponse: deepScanResult.rawResponse,
          },
        });
      } catch (err: any) {
        console.error("[HeuristicDeepScanSSE] Error:", err);
        sendEvent({
          stage: "ERROR",
          message: err?.message || "Failed to perform heuristic deep scan.",
          progressPercent: 0,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

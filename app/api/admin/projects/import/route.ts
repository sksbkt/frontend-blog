/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 * 
 * Explicit Repository Import API
 * Imports an un-imported GitHub repository directly into PostgreSQL (Prisma) as a draft,
 * instantly resolving and ingesting its cover image through the Sovereign Asset Pipeline (Supabase Storage).
 */

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureSovereignAsset } from "@/lib/asset-pipeline";
import { mapPrismaToAdminProject } from "@/lib/services/project-service";
import { fetchRepoLanguages, computeLanguageBreakdown } from "@/lib/github/languages";

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
    const { fullName, defaultBranch = "main" } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.includes("/")) {
      return NextResponse.json(
        { success: false, message: "Valid repository fullName (owner/repo) is required." },
        { status: 400 }
      );
    }

    const [owner, repoName] = fullName.split("/");
    const normalizedFullName = `${owner}/${repoName}`;

    // 1. Fetch GitHub Repository Metadata
    const ghRes = await fetch(`https://api.github.com/repos/${normalizedFullName}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Portfolio-Admin-CMS",
      },
      cache: "no-store",
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      return NextResponse.json(
        { success: false, message: `Failed to fetch GitHub repository: ${ghRes.statusText}`, details: errText },
        { status: ghRes.status }
      );
    }

    const repoData = await ghRes.json();
    const branch = repoData.default_branch || defaultBranch || "main";

    // 2. Resolve Candidate Cover Image (Check assets/hero.png from GitHub Actions first, then GitHub OpenGraph)
    const rawAssetHeroUrl = `https://raw.githubusercontent.com/${normalizedFullName}/${encodeURIComponent(branch)}/assets/hero.png`;
    const ogFallbackUrl = `https://opengraph.githubassets.com/1/${normalizedFullName}`;

    let candidateCoverUrl = ogFallbackUrl;
    try {
      const heroHead = await fetch(rawAssetHeroUrl, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (heroHead.ok) {
        candidateCoverUrl = rawAssetHeroUrl;
      }
    } catch {
      // Fallback remains ogFallbackUrl
    }

    // 3. Ingest candidate cover through Universal Sovereign Asset Pipeline (Supabase Storage)
    console.log(`[Import to Lab] Ingesting cover for ${normalizedFullName} from ${candidateCoverUrl}...`);
    let sovereignCoverUrl: string | null = null;
    try {
      sovereignCoverUrl = await ensureSovereignAsset(candidateCoverUrl, {
        folder: "covers",
        customFileName: `${repoName.toLowerCase()}-cover-${Date.now().toString(36)}.png`,
      });
    } catch (assetErr) {
      console.warn(`[Import to Lab] Warning ingesting cover asset:`, assetErr);
    }

    // 4. Fetch Language Distribution Breakdown
    let languageBreakdown: any[] = [];
    try {
      const [repoOwner, repoShortName] = normalizedFullName.split("/");
      const rawLanguages = await fetchRepoLanguages(repoOwner, repoShortName, { token: session.accessToken });
      languageBreakdown = computeLanguageBreakdown(rawLanguages);
    } catch (langErr) {
      console.warn(`[Import to Lab] Warning fetching repo languages:`, langErr);
    }

    // 5. Generate clean canonical slug
    const baseSlug = repoName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = baseSlug || `project-${Date.now().toString(36)}`;

    // 6. Technologies from topics or primary language
    const topics = Array.isArray(repoData.topics) ? repoData.topics : [];
    const techStack = topics.length > 0
      ? topics
      : repoData.language
      ? [repoData.language]
      : [];

    // 7. Upsert Project in PostgreSQL via Prisma
    const savedProject = await prisma.project.upsert({
      where: { slug },
      create: {
        slug,
        title: repoData.name,
        taglineEn: repoData.description || repoData.name,
        taglineFa: repoData.description || repoData.name,
        descriptionEn: repoData.description || `Repository imported from ${repoData.html_url}`,
        descriptionFa: repoData.description || `پروژه ایمپورت شده از ${repoData.html_url}`,
        coverImageUrl: sovereignCoverUrl,
        githubUrl: repoData.html_url,
        liveUrl: repoData.homepage || null,
        order: 0,
        isPublished: false, // Imported as Lab draft
        featured: false,
        technologies: techStack,
        languages: languageBreakdown as any,
      },
      update: {
        title: repoData.name,
        taglineEn: repoData.description || undefined,
        descriptionEn: repoData.description || undefined,
        coverImageUrl: sovereignCoverUrl || undefined,
        githubUrl: repoData.html_url,
        liveUrl: repoData.homepage || undefined,
        technologies: techStack.length > 0 ? techStack : undefined,
        languages: languageBreakdown.length > 0 ? (languageBreakdown as any) : undefined,
      },
    });

    // 8. Revalidate Cache Tags
    try {
      revalidateTag("projects", "max");
      revalidateTag(`project:${savedProject.id}`, "max");
      revalidateTag(`project:${savedProject.slug}`, "max");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Repository "${normalizedFullName}" successfully imported into Lab with sovereign Supabase cover image!`,
      project: mapPrismaToAdminProject(savedProject),
      projectId: savedProject.id,
      slug: savedProject.slug,
      coverImageUrl: savedProject.coverImageUrl,
    });
  } catch (error) {
    console.error("[Admin Import Project] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to import repository into Lab.",
      },
      { status: 500 }
    );
  }
}

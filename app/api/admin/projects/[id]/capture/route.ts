import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { deployAssetRunnerToRepo } from "@/lib/github/asset-runner-deployer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  // Find target project
  const project = await prisma.project.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!project) {
    return NextResponse.json(
      { success: false, message: `Project not found for id/slug "${id}".` },
      { status: 404 }
    );
  }

  const repoLink = project.repoUrl || project.githubUrl;
  if (!repoLink) {
    return NextResponse.json(
      { success: false, message: "Project has no associated GitHub repository URL." },
      { status: 400 }
    );
  }

  const match = repoLink.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) {
    return NextResponse.json(
      { success: false, message: `Invalid GitHub repository URL: ${repoLink}` },
      { status: 400 }
    );
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "").replace(/\/$/, "");

  // Use session token or environment GITHUB_TOKEN
  const token = session?.accessToken || process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "GitHub authentication required. No access token available." },
      { status: 401 }
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  try {
    // 1. Try repository_dispatch with event type 'generate-assets'
    const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
    const dispatchRes = await fetch(dispatchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event_type: "generate-assets",
        client_payload: {
          projectSlug: project.slug,
          projectId: project.id,
          targetUrl: project.liveUrl || "",
        },
      }),
    });

    if (dispatchRes.ok || dispatchRes.status === 204) {
      return NextResponse.json({
        success: true,
        type: "repository_dispatch",
        event: "generate-assets",
        owner,
        repo,
        message: `Successfully dispatched "generate-assets" event to ${owner}/${repo}.`,
      });
    }

    // 2. Fallback: workflow_dispatch on generate-assets.yml
    const workflowUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/generate-assets.yml/dispatches`;
    const workflowRes = await fetch(workflowUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref: "main",
        inputs: {
          commit_assets: true,
          upload_artifacts: true,
        },
      }),
    });

    if (workflowRes.ok || workflowRes.status === 204) {
      return NextResponse.json({
        success: true,
        type: "workflow_dispatch",
        owner,
        repo,
        message: `Successfully triggered generate-assets workflow on ${owner}/${repo}.`,
      });
    }

    if (workflowRes.status === 404 || dispatchRes.status === 404) {
      try {
        console.log(`[Capture Trigger] Workflow missing on ${owner}/${repo}. Deploying asset runner...`);
        const deployResult = await deployAssetRunnerToRepo({
          owner,
          repo,
          token,
          targetUrl: project.liveUrl || "",
        });
        return NextResponse.json({
          success: true,
          type: "deployed_and_dispatched",
          owner,
          repo,
          message: deployResult.message,
        });
      } catch (deployErr: any) {
        console.warn("[Deploy Runner Fallback] Failed:", deployErr.message);
      }
    }

    const errData = await dispatchRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        success: false,
        status: dispatchRes.status,
        message: `GitHub dispatch failed: ${errData.message || dispatchRes.statusText}`,
      },
      { status: dispatchRes.status }
    );
  } catch (error: any) {
    console.error("[Capture Trigger Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to trigger capture dispatch." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createOrLinkProject,
  setEnvironmentVariables,
  createDeployment,
  waitForDeployment,
} from "@/lib/services/vercel";
import { deployAssetRunnerToRepo } from "@/lib/github/asset-runner-deployer";
import { writeClient } from "@/lib/sanity/write-client";

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
    const { fullName, branch = "main", envVars = [], triggerCapture = true } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.includes("/")) {
      return NextResponse.json(
        { success: false, message: "Valid repository fullName (owner/repo) is required." },
        { status: 400 }
      );
    }

    const [owner, repo] = fullName.split("/");

    // 1. Create or link project on Vercel
    console.log(`[Vercel Pipeline] Linking project for ${fullName}...`);
    const project = await createOrLinkProject(repo, fullName);

    // 2. Provision environment variables if provided
    if (Array.isArray(envVars) && envVars.length > 0) {
      const validEnvVars = envVars.filter(
        (v) => typeof v.key === "string" && v.key.trim().length > 0 && typeof v.value === "string"
      );
      if (validEnvVars.length > 0) {
        console.log(`[Vercel Pipeline] Provisioning ${validEnvVars.length} environment variables...`);
        await setEnvironmentVariables(project.id, validEnvVars);
      }
    }

    // 3. Trigger production deployment from Git repository
    console.log(`[Vercel Pipeline] Triggering deployment for ${project.name} on branch ${branch}...`);
    const deployment = await createDeployment(project.name, fullName, branch);

    // 4. Poll until deployment resolves to READY
    console.log(`[Vercel Pipeline] Awaiting READY status for deployment ${deployment.id}...`);
    const { liveUrl } = await waitForDeployment(deployment.id);

    // 5. Update matching Sanity project document (draft or published) with the live demo URL
    try {
      const matchingProjects = await writeClient.fetch(
        `*[_type == "project" && (github match $pattern || github match $exact)]{ _id }`,
        {
          pattern: `*${fullName}*`,
          exact: `*${repo}*`,
        }
      );

      if (matchingProjects && matchingProjects.length > 0) {
        for (const proj of matchingProjects) {
          await writeClient.patch(proj._id).set({ demo: liveUrl }).commit();
          console.log(`[Vercel Pipeline] Updated Sanity project ${proj._id} demo to ${liveUrl}`);
        }
      }
    } catch (sanityErr) {
      console.warn("[Vercel Pipeline] Non-critical warning updating Sanity demo link:", sanityErr);
    }

    // 6. Trigger automated visual capture with live URL
    let captureResult = null;
    if (triggerCapture) {
      console.log(`[Vercel Pipeline] Triggering visual asset capture pointing to ${liveUrl}...`);
      try {
        captureResult = await deployAssetRunnerToRepo({
          owner,
          repo,
          token: session.accessToken,
          branch,
          triggerRun: true,
          targetUrl: liveUrl,
        });
      } catch (captureErr) {
        console.warn("[Vercel Pipeline] Warning triggering asset runner:", captureErr);
      }
    }

    return NextResponse.json({
      success: true,
      liveUrl,
      deploymentId: deployment.id,
      projectId: project.id,
      captureResult,
      message: `Successfully deployed ${fullName} to Vercel (${liveUrl}) and launched visual asset capture runner!`,
    });
  } catch (error) {
    console.error("[Vercel Pipeline] Deployment error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to execute Vercel automated deployment pipeline.",
      },
      { status: 500 }
    );
  }
}

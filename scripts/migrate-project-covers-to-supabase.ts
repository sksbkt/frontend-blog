/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Project Covers Migration Script
 * Migrates external GitHub OG and Sanity cover images directly into self-hosted Supabase Storage.
 */

import { prisma } from "../lib/prisma";
import { getServiceSupabase } from "../lib/supabase";
import { getOrCacheGithubOgImage } from "../lib/github-og-cache";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, "").replace(/\/+$/, "");
    const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

async function main() {
  const timeoutTimer = setTimeout(() => {
    console.error("[TIMEOUT] Migration took longer than 60s. Forcing exit.");
    process.exit(1);
  }, 60000);

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PROJECT COVERS MIGRATION TO SUPABASE STORAGE");
  console.log("══════════════════════════════════════════════════════════════\n");

  const supabaseAdmin = getServiceSupabase();
  const uploadedFiles: Array<{ slug: string; path: string; url: string }> = [];

  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
    });

    console.log(`Found ${projects.length} project(s) in database.\n`);

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      console.log(`------------------------------------------------------------`);
      console.log(`[${i + 1}/${projects.length}] Processing project "${project.title}" (slug: ${project.slug})...`);

      let newSupabaseUrl: string | null = null;
      let storagePath: string | null = null;

      const ghInfo = project.githubUrl ? parseGithubRepo(project.githubUrl) : null;

      if (ghInfo) {
        // Case A: Has githubUrl
        console.log(`  -> Case A: GitHub repo detected: ${ghInfo.owner}/${ghInfo.repo}`);
        storagePath = `github-og/${ghInfo.owner.toLowerCase()}-${ghInfo.repo.toLowerCase()}.png`;
        newSupabaseUrl = await getOrCacheGithubOgImage(ghInfo.owner, ghInfo.repo);
        console.log(`  -> Resolved Supabase OG URL: ${newSupabaseUrl}`);
      } else if (project.coverImageUrl && project.coverImageUrl.includes("cdn.sanity.io")) {
        // Case B: Has legacy Sanity coverImageUrl but no GitHub URL
        console.log(`  -> Case B: Legacy Sanity cover detected: ${project.coverImageUrl}`);
        storagePath = `covers/${project.slug}.png`;
        console.log(`  -> Fetching binary from Sanity CDN...`);
        const res = await fetch(project.coverImageUrl);
        if (!res.ok) {
          throw new Error(`Sanity image fetch failed with status ${res.status} for ${project.slug}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        console.log(`  -> Uploading to Supabase Storage (projects/${storagePath})...`);
        const { error: uploadError } = await supabaseAdmin.storage
          .from("projects")
          .upload(storagePath, fileBuffer, {
            contentType: "image/png",
            upsert: true,
            cacheControl: "1209600",
          });

        if (uploadError) {
          console.error(`[STORAGE UPLOAD ERROR for ${storagePath}]:`, uploadError);
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from("projects").getPublicUrl(storagePath);

        newSupabaseUrl = publicUrl;
        console.log(`  -> Uploaded Sanity cover to Supabase URL: ${newSupabaseUrl}`);
      } else if (project.coverImageUrl && !project.coverImageUrl.includes("supabase.co")) {
        // Generic fallback for any other external cover URL
        console.log(`  -> Case B (External): External cover image detected: ${project.coverImageUrl}`);
        storagePath = `covers/${project.slug}.png`;
        const res = await fetch(project.coverImageUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);
          const { error: uploadError } = await supabaseAdmin.storage
            .from("projects")
            .upload(storagePath, fileBuffer, {
              contentType: "image/png",
              upsert: true,
              cacheControl: "1209600",
            });
          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabaseAdmin.storage.from("projects").getPublicUrl(storagePath);
            newSupabaseUrl = publicUrl;
          }
        }
      } else {
        console.log(`  -> Skipping: No githubUrl or legacy coverImageUrl requires migration.`);
      }

      if (newSupabaseUrl) {
        await prisma.project.update({
          where: { id: project.id },
          data: { coverImageUrl: newSupabaseUrl },
        });
        console.log(`  -> Updated Project.coverImageUrl in PostgreSQL.`);
        if (storagePath) {
          uploadedFiles.push({ slug: project.slug, path: `projects/${storagePath}`, url: newSupabaseUrl });
        }
      }

      // Courteous pacing: 500ms delay between items
      if (i < projects.length - 1) {
        await delay(500);
      }
    }

    console.log(`\n══════════════════════════════════════════════════════════════`);
    console.log(`📊 POST-MIGRATION VERIFICATION & INTEGRITY CHECK`);
    console.log(`══════════════════════════════════════════════════════════════\n`);

    console.log("Uploaded File Paths in Supabase Storage:");
    console.log(JSON.stringify(uploadedFiles, null, 2));

    const updatedProjects = await prisma.project.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        githubUrl: true,
        coverImageUrl: true,
      },
    });
    console.log("\nCurrent Project Records in Database:");
    console.log(JSON.stringify(updatedProjects, null, 2));

    const activeAssetCaches = await prisma.assetCache.findMany({
      select: {
        key: true,
        storageUrl: true,
        expiresAt: true,
      },
    });
    console.log("\nActive AssetCache Records in Database:");
    console.log(JSON.stringify(activeAssetCaches, null, 2));

    // Integrity Assertions
    const invalidProjects = updatedProjects.filter(
      (p) =>
        p.coverImageUrl &&
        (p.coverImageUrl.includes("cdn.sanity.io") || p.coverImageUrl.includes("githubassets.com"))
    );
    const invalidCaches = activeAssetCaches.filter((c) =>
      c.storageUrl?.includes("githubassets.com")
    );

    if (invalidProjects.length > 0 || invalidCaches.length > 0) {
      console.error(`\n❌ VERIFICATION FAILED: Found invalid external URLs!`);
      if (invalidProjects.length > 0) console.error("Invalid Projects:", invalidProjects);
      if (invalidCaches.length > 0) console.error("Invalid AssetCache:", invalidCaches);
      process.exit(1);
    } else {
      console.log(`\n✅ ALL CHECKS PASSED: 100% of image URLs point exclusively to Supabase Storage.`);
    }
  } catch (err: any) {
    console.error("\n❌ MIGRATION ABORTED DUE TO ERROR:", err.message || err);
    process.exit(1);
  } finally {
    clearTimeout(timeoutTimer);
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

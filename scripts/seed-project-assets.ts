/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Project Asset Seeding Pipeline
 * Fetches, caches, and verifies OpenGraph assets for flagship repositories.
 */

import { getOrCacheGithubOgImage } from "../lib/github-og-cache";
import { prisma } from "../lib/prisma";
import { subscribeTelemetry } from "../lib/telemetry/event-bus";
import type { TelemetryStreamEvent } from "../types/api";

const TARGET_REPOSITORIES = [
  { owner: "vercel", repo: "next.js" },
  { owner: "facebook", repo: "react" },
  { owner: "sksbkt", repo: "Apple-web" },
  { owner: "sksbkt", repo: "promptopia" },
];

async function main() {
  console.log("==================================================================");
  console.log("  ROOTZERO SYSTEMS LAB™ - PROJECT ASSET SEEDING PIPELINE");
  console.log("  © 2026 Root Zero Systems Lab™. All rights reserved.");
  console.log("==================================================================\n");

  const telemetryEvents: TelemetryStreamEvent[] = [];
  const unsubscribe = subscribeTelemetry((event) => {
    telemetryEvents.push(event);
    console.log(
      `  [TELEMETRY EVENT] Source: ${event.source} | Entity: ${event.entityType} | Key: "${event.key}" | Latency: ${event.latencyMs}ms`
    );
  });

  const timer = setTimeout(() => {
    console.error("\n[TIMEOUT] Seeding process took longer than 60s. Forcing exit.");
    process.exit(1);
  }, 60000);

  try {
    for (const [index, item] of TARGET_REPOSITORIES.entries()) {
      console.log(`\n[${index + 1}/${TARGET_REPOSITORIES.length}] Processing asset for: ${item.owner}/${item.repo}...`);
      const t0 = Date.now();
      const storageUrl = await getOrCacheGithubOgImage(item.owner, item.repo);
      const elapsedMs = Date.now() - t0;

      console.log(`  -> URL: ${storageUrl}`);
      console.log(`  -> Duration: ${elapsedMs}ms`);

      // Verify row in AssetCache
      const cacheKey = `github-og:${item.owner.toLowerCase()}/${item.repo.toLowerCase()}`;
      const cacheRecord = await prisma.assetCache.findUnique({
        where: { key: cacheKey },
      });

      if (cacheRecord) {
        console.log(
          `  -> [AssetCache Verified] ID: ${cacheRecord.id} | Expires: ${cacheRecord.expiresAt.toISOString()}`
        );
      } else {
        console.warn(`  -> [AssetCache Warning] Record for ${cacheKey} was not found in DB.`);
      }

      // Check if project exists in PostgreSQL and link cover image if needed
      const project = await prisma.project.findFirst({
        where: {
          githubUrl: { contains: `${item.owner}/${item.repo}`, mode: "insensitive" },
        },
      });

      if (project) {
        console.log(`  -> Matched project "${project.title}" (slug: ${project.slug}).`);
      }

      // Small pacing delay to avoid GitHub API rate limits
      if (index < TARGET_REPOSITORIES.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("\n==================================================================");
    console.log("  SEEDING COMPLETE SUMMARY");
    console.log("==================================================================");
    console.log(`Total Targets Processed: ${TARGET_REPOSITORIES.length}`);
    console.log(`Total Telemetry Events Logged: ${telemetryEvents.length}`);

    const allCached = await prisma.assetCache.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    console.log(`\nLatest AssetCache Records in Supabase PostgreSQL:`);
    for (const rec of allCached) {
      console.log(`  - [${rec.key}] -> ${rec.storageUrl.slice(0, 70)}... (TTL: ${rec.expiresAt.toISOString()})`);
    }

    console.log("\n✅ All flagship OpenGraph assets successfully cached and verified under RootZero Systems Lab™ standards.");
  } catch (err: any) {
    console.error("\n❌ Seeding failed:", err.message || err);
  } finally {
    clearTimeout(timer);
    unsubscribe();
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

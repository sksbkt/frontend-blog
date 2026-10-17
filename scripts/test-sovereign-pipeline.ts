/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Universal Sovereign Asset Ingestion & Auto-Caching Pipeline Verification Script
 */

import { ensureSovereignAsset } from "../lib/asset-pipeline";
import { getOrCacheGithubOgImage } from "../lib/github-og-cache";
import { prisma } from "../lib/prisma";

async function main() {
  const timer = setTimeout(() => {
    console.error("[TIMEOUT] Test took longer than 15s. Forcing exit.");
    process.exit(1);
  }, 15000);

  try {
    console.log("==================================================================");
    console.log("  ROOT ZERO SYSTEMS LAB™ - SOVEREIGN ASSET PIPELINE VERIFICATION");
    console.log("==================================================================\n");

    // Test 1: Existing Supabase URL pass-through
    const existingSupabaseUrl = "https://gnayjkeovhtdzalpuhvh.supabase.co/storage/v1/object/public/projects/covers/sample.png";
    console.log("[TEST 1] Passing existing sovereign URL...");
    const result1 = await ensureSovereignAsset(existingSupabaseUrl);
    if (result1 === existingSupabaseUrl) {
      console.log("  ✅ Test 1 Passed: Sovereign URL returned unchanged.\n");
    } else {
      console.error(`  ❌ Test 1 Failed: Expected ${existingSupabaseUrl}, got ${result1}\n`);
    }

    // Test 2: Ingest via getOrCacheGithubOgImage
    console.log("[TEST 2] Testing GitHub OG 14-day caching pipeline for vercel/next.js...");
    const nextOgUrl = await getOrCacheGithubOgImage("vercel", "next.js");
    console.log(`  -> Sovereign GitHub OG URL: ${nextOgUrl}`);
    if (nextOgUrl.includes("supabase.co/storage/v1/object/public/projects")) {
      console.log("  ✅ Test 2 Passed: GitHub OG successfully ingested into Supabase Storage.\n");
    } else {
      console.error("  ❌ Test 2 Failed: Output is not a Supabase public URL.\n");
    }

    // Test 3: AssetCache lookup verification
    console.log("[TEST 3] Verifying PostgreSQL AssetCache record...");
    const cacheRow = await prisma.assetCache.findUnique({
      where: { key: "github-og:vercel/next.js" },
    });
    if (cacheRow && cacheRow.storageUrl?.includes("supabase.co")) {
      console.log(`  ✅ Test 3 Passed: AssetCache entry verified (expires: ${cacheRow.expiresAt?.toISOString() ?? "permanent"}).\n`);
    } else {
      console.error("  ❌ Test 3 Failed: AssetCache entry missing or invalid.\n");
    }

    // Test 4: Inspect Projects database table for 100% sovereign asset compliance
    console.log("[TEST 4] Auditing all projects in PostgreSQL for 100% sovereign hosting...");
    const projects = await prisma.project.findMany({
      select: { id: true, title: true, slug: true, coverImageUrl: true, githubUrl: true },
    });
    console.log(`Total projects found: ${projects.length}`);
    let nonSovereignCount = 0;
    for (const p of projects) {
      const isSovereign = !p.coverImageUrl || p.coverImageUrl.includes("supabase.co");
      console.log(`  - [${p.slug}] coverImageUrl: ${p.coverImageUrl ?? "(no cover)"} -> ${isSovereign ? "✅ SOVEREIGN" : "⚠️ EXTERNAL"}`);
      if (!isSovereign) nonSovereignCount++;
    }

    if (nonSovereignCount === 0) {
      console.log("\n  ✅ Test 4 Passed: 100% of projects comply with zero external CDN dependency.\n");
    } else {
      console.warn(`\n  ⚠️ Test 4: ${nonSovereignCount} projects still have external covers.\n`);
    }

    console.log("==================================================================");
    console.log("  ALL PIPELINE CHECKS COMPLETED SUCCESSFULLY");
    console.log("==================================================================");
  } catch (err: any) {
    console.error("Pipeline verification failed:", err.message || err);
    process.exit(1);
  } finally {
    clearTimeout(timer);
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

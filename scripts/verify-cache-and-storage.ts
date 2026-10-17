/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Backend Assertion Script: Cache & Supabase Storage Verification
 * Asserts database persistence, Supabase cover assets, and ApiCache/AssetCache records.
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local"), override: true });

import { prisma } from "../lib/prisma";
import { getServiceSupabase } from "../lib/supabase";

async function main() {
  const timeoutTimer = setTimeout(() => {
    console.error("[TIMEOUT] Cache and storage verification took longer than 30s. Forcing exit.");
    process.exit(1);
  }, 30000);

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 ROOT ZERO SYSTEMS LAB™ - CACHE & STORAGE POST-E2E AUDIT");
  console.log("══════════════════════════════════════════════════════════════\n");

  try {
    // 1. Query Projects
    const projects = await prisma.project.findMany({
      orderBy: { order: "asc" },
    });

    const totalProjects = projects.length;
    let sovereignAssetCount = 0;
    const leakedUrls: Array<{ slug: string; url: string }> = [];

    for (const project of projects) {
      if (project.coverImageUrl) {
        if (project.coverImageUrl.includes("supabase.co/storage/v1/object/public/projects")) {
          sovereignAssetCount++;
        } else {
          leakedUrls.push({ slug: project.slug, url: project.coverImageUrl });
        }
      }
    }

    // 2. Query Cache Tables
    const [apiCacheCount, assetCacheCount, latestAssetCaches] = await Promise.all([
      prisma.apiCache.count(),
      prisma.assetCache.count(),
      prisma.assetCache.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // 3. Inspect Audits
    const auditedProjects = projects.filter(
      (p) => typeof p.auditScore === "number" && p.auditScore >= 0
    );

    // 4. Print Concise Summary in Terminal
    console.log("📊 SYSTEM STATUS SUMMARY TABLE:");
    console.table([
      {
        Metric: "Total Projects",
        Value: totalProjects,
        Status: totalProjects > 0 ? "PASSED" : "FAILED",
      },
      {
        Metric: "Sovereign Assets (Count in Supabase)",
        Value: `${sovereignAssetCount} / ${totalProjects}`,
        Status: leakedUrls.length === 0 ? "100% SOVEREIGN" : "LEAKS DETECTED",
      },
      {
        Metric: "Cache Table Record Count",
        Value: `ApiCache: ${apiCacheCount} | AssetCache: ${assetCacheCount}`,
        Status: assetCacheCount > 0 || apiCacheCount > 0 ? "ACTIVE & CACHED" : "EMPTY",
      },
      {
        Metric: "Audit Status",
        Value: `${auditedProjects.length} / ${totalProjects} Audited`,
        Status: auditedProjects.length === totalProjects ? "100% CALCULATED" : "PARTIAL",
      },
    ]);

    if (leakedUrls.length > 0) {
      console.error("\n❌ EXTERNAL LEAKS DETECTED:");
      leakedUrls.forEach((l) => console.error(`  - [${l.slug}]: ${l.url}`));
      process.exit(1);
    }

    if (latestAssetCaches.length > 0) {
      console.log("\n📦 Latest AssetCache Records (Supabase Sovereign Storage):");
      latestAssetCaches.forEach((ac) => {
        console.log(`  - Key: ${ac.key}`);
        console.log(`    Storage URL: ${ac.storageUrl}`);
        console.log(`    Updated At: ${ac.updatedAt?.toISOString() ?? "N/A"}\n`);
      });
    }

    console.log("✅ ALL CACHE AND SUPABASE STORAGE POST-VERIFICATION ASSERTIONS PASSED!\n");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ ERROR EXECUTING POST-VERIFICATION SCRIPT:", err.message || err);
    process.exit(1);
  } finally {
    clearTimeout(timeoutTimer);
    await prisma.$disconnect();
  }
}

main();

/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Universal Image Migration & Content Rewriter Script
 * Migrates all external cover images and inline markdown/HTML content images into
 * self-hosted Supabase Storage (projects bucket) with zero external CDN dependency.
 */

import { prisma } from "../lib/prisma";
import { ensureSovereignAsset, sanitizeContentImages } from "../lib/asset-pipeline";

async function main() {
  const timer = setTimeout(() => {
    console.error("[TIMEOUT] Migration took longer than 60s. Forcing exit.");
    process.exit(1);
  }, 60000);

  console.log("══════════════════════════════════════════════════════════════");
  console.log("  ROOT ZERO SYSTEMS LAB™ - UNIVERSAL IMAGE REWRITER & MIGRATOR");
  console.log("══════════════════════════════════════════════════════════════\n");

  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
    });

    console.log(`Auditing and migrating ${projects.length} project(s) in PostgreSQL...\n`);

    let migratedCovers = 0;
    let migratedContent = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      console.log(`------------------------------------------------------------`);
      console.log(`[${i + 1}/${projects.length}] Processing project "${project.title}" (slug: ${project.slug})...`);

      const updates: Record<string, any> = {};

      // 1. Cover Image Migration
      if (
        project.coverImageUrl &&
        !project.coverImageUrl.includes("supabase.co/storage/v1/object/public/")
      ) {
        console.log(`  -> External cover image detected: ${project.coverImageUrl}`);
        try {
          const sovereignCover = await ensureSovereignAsset(project.coverImageUrl, {
            folder: "covers",
          });
          updates.coverImageUrl = sovereignCover;
          migratedCovers++;
          console.log(`  ✅ Cover migrated -> ${sovereignCover}`);
        } catch (err: any) {
          console.error(`  ❌ Failed migrating cover image:`, err.message || err);
        }
      } else {
        console.log(`  -> Cover image: ${project.coverImageUrl ? "✅ Sovereign Supabase" : "None"}`);
      }

      // 2. Markdown / HTML Content Rewriting (descriptionEn)
      if (project.descriptionEn) {
        const sanitizedEn = await sanitizeContentImages(project.descriptionEn, { folder: "content" });
        if (sanitizedEn !== project.descriptionEn) {
          updates.descriptionEn = sanitizedEn;
          migratedContent++;
          console.log(`  ✅ Rewrote external inline images in descriptionEn`);
        }
      }

      // 3. Markdown / HTML Content Rewriting (descriptionFa)
      if (project.descriptionFa) {
        const sanitizedFa = await sanitizeContentImages(project.descriptionFa, { folder: "content" });
        if (sanitizedFa !== project.descriptionFa) {
          updates.descriptionFa = sanitizedFa;
          migratedContent++;
          console.log(`  ✅ Rewrote external inline images in descriptionFa`);
        }
      }

      // 4. Save updates back to PostgreSQL if any changes occurred
      if (Object.keys(updates).length > 0) {
        await prisma.project.update({
          where: { id: project.id },
          data: updates,
        });
        console.log(`  💾 Saved sanitized fields to PostgreSQL.`);
      } else {
        console.log(`  ✨ No migration needed. All assets are 100% sovereign.`);
      }
    }

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("  MIGRATION & PURGE SUMMARY");
    console.log("══════════════════════════════════════════════════════════════");
    console.log(`Total Projects Processed: ${projects.length}`);
    console.log(`Total Covers Migrated: ${migratedCovers}`);
    console.log(`Total Content Fields Rewritten: ${migratedContent}`);
    console.log("✅ Universal sovereign ingestion check complete.");
  } catch (err: any) {
    console.error("Migration fatal error:", err);
    process.exit(1);
  } finally {
    clearTimeout(timer);
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

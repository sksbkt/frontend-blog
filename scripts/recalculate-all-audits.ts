/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * One-time Database Backfill: Recalculate All Project Audits
 * Computes deterministic audit scores and breakdowns for all projects in PostgreSQL.
 */

import { prisma } from "../lib/prisma";
import { generateProjectAuditReport } from "../lib/sca/audit-engine";

async function main() {
  const timeoutTimer = setTimeout(() => {
    console.error("[TIMEOUT] Recalculate audits took longer than 30s. Forcing exit.");
    process.exit(1);
  }, 30000);

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING AUDIT SCORE RECALCULATION & BACKFILL");
  console.log("══════════════════════════════════════════════════════════════\n");

  try {
    // 1. Fetch all Canonical Tech Slugs and Aliases
    console.log("Fetching Canonical Tech Definitions & Aliases...");
    const techDefs = await prisma.techDefinition.findMany({
      select: { slug: true, aliases: true },
    });

    const canonicalTechSlugs = new Set<string>();
    techDefs.forEach((t) => {
      canonicalTechSlugs.add(t.slug.toLowerCase().trim());
      if (Array.isArray(t.aliases)) {
        t.aliases.forEach((a) => canonicalTechSlugs.add(a.toLowerCase().trim()));
      }
    });
    console.log(`Loaded ${canonicalTechSlugs.size} recognized taxonomy entries.\n`);

    // 2. Fetch all Projects
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
    });
    console.log(`Auditing ${projects.length} project(s)...\n`);

    const results: Array<{
      id: string;
      slug: string;
      title: string;
      score: number;
      breakdown: any;
      strengths: string[];
      weaknesses: string[];
    }> = [];

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      console.log(`[${i + 1}/${projects.length}] Auditing "${project.title}" (${project.slug})...`);

      const report = generateProjectAuditReport(project, canonicalTechSlugs);

      await prisma.project.update({
        where: { id: project.id },
        data: {
          auditScore: report.score,
          auditBreakdown: report as any,
          auditedAt: new Date(),
        },
      });

      console.log(`  -> Final Score: ${report.score}/100`);
      console.log(
        `  -> Breakdown: Lang: ${report.breakdown.languages}% | Assets: ${report.breakdown.assets}% | Arch: ${report.breakdown.architecture}% | Techs: ${report.breakdown.technologies}%`
      );
      if (report.strengths.length > 0) {
        console.log(`  -> Strengths: ${report.strengths.join(" | ")}`);
      }
      if (report.weaknesses.length > 0) {
        console.log(`  -> Gaps: ${report.weaknesses.join(" | ")}`);
      }
      console.log("");

      results.push({
        id: project.id,
        slug: project.slug,
        title: project.title,
        score: report.score,
        breakdown: report.breakdown,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
      });
    }

    console.log("══════════════════════════════════════════════════════════════");
    console.log("📊 RECALCULATION COMPLETE: SUMMARY TABLE");
    console.log("══════════════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(results, null, 2));

    console.log("\n✅ ALL PROJECTS AUDITED & PERSISTED TO POSTGRESQL.");
  } catch (err: any) {
    console.error("❌ ERROR RECALCULATING AUDITS:", err.message || err);
    process.exit(1);
  } finally {
    clearTimeout(timeoutTimer);
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

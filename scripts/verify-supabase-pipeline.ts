/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Supabase Storage & Database Pipeline Verification Script
 * Asserts bucket existence, sovereign Supabase asset URLs, and SCA audit structures.
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local"), override: true });

import { prisma } from "../lib/prisma";
import { getServiceSupabase } from "../lib/supabase";

async function main() {
  const timeoutTimer = setTimeout(() => {
    console.error("[TIMEOUT] Pipeline verification took longer than 30s. Forcing exit.");
    process.exit(1);
  }, 30000);

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🔍 RUNNING SUPABASE STORAGE & DATABASE PIPELINE VERIFICATION");
  console.log("══════════════════════════════════════════════════════════════\n");

  let hasErrors = false;

  try {
    // 1. Bucket Verification
    console.log("▶ [1/4] Checking Supabase Storage Bucket 'projects'...");
    const supabase = getServiceSupabase();
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      throw new Error(`Failed to list storage buckets: ${bucketError.message}`);
    }

    const projectsBucket = buckets.find((b) => b.name === "projects");
    if (!projectsBucket) {
      console.error("❌ Bucket 'projects' NOT FOUND in Supabase Storage!");
      hasErrors = true;
    } else {
      console.log(`✅ Bucket 'projects' verified (Public: ${projectsBucket.public}).`);
    }

    // List objects in covers/ and github-og/
    const { data: coverObjects, error: coverError } = await supabase.storage
      .from("projects")
      .list("covers", { limit: 100 });
    if (coverError) {
      console.warn("⚠️ Warning listing covers/:", coverError.message);
    } else {
      console.log(`📁 Found ${coverObjects?.length || 0} objects in 'covers/'`);
    }

    const { data: ogObjects, error: ogError } = await supabase.storage
      .from("projects")
      .list("github-og", { limit: 100 });
    if (ogError) {
      console.warn("⚠️ Warning listing github-og/:", ogError.message);
    } else {
      console.log(`📁 Found ${ogObjects?.length || 0} objects in 'github-og/'`);
    }

    // 2. Database URL Assertion
    console.log("\n▶ [2/4] Querying PostgreSQL Projects via Prisma...");
    const projects = await prisma.project.findMany({
      orderBy: { order: "asc" },
    });
    console.log(`Found ${projects.length} project(s) in PostgreSQL.\n`);

    const leakedUrls: Array<{ slug: string; url: string }> = [];
    const validSovereignUrls: Array<{ slug: string; url: string }> = [];
    const missingUrls: string[] = [];

    const expectedStoragePrefix = "supabase.co/storage/v1/object/public/projects";

    for (const project of projects) {
      if (!project.coverImageUrl) {
        missingUrls.push(project.slug);
        continue;
      }

      if (project.coverImageUrl.includes(expectedStoragePrefix)) {
        validSovereignUrls.push({ slug: project.slug, url: project.coverImageUrl });
      } else {
        leakedUrls.push({ slug: project.slug, url: project.coverImageUrl });
      }
    }

    console.log(`✅ Sovereign Supabase Asset URLs: ${validSovereignUrls.length}/${projects.length}`);
    if (missingUrls.length > 0) {
      console.log(`ℹ️ Projects without coverImageUrl: ${missingUrls.join(", ")}`);
    }

    if (leakedUrls.length > 0) {
      console.error("❌ LEAK DETECTED: The following projects have external or un-ingested cover URLs:");
      leakedUrls.forEach((l) => console.error(`   - [${l.slug}]: ${l.url}`));
      hasErrors = true;
    } else {
      console.log("✅ 100% of non-null coverImageUrl records point to sovereign Supabase Storage!");
    }

    // 3. Audit Record Assertion
    console.log("\n▶ [3/4] Asserting SCA Audit Scores and Breakdowns...");
    const auditDeficiencies: string[] = [];
    const tableData: Array<{
      Slug: string;
      Title: string;
      "Audit Score": string;
      "Strengths Count": number;
      "Weaknesses Count": number;
      "Storage URL (truncated)": string;
    }> = [];

    for (const project of projects) {
      const breakdown = project.auditBreakdown as any;
      const hasValidScore =
        typeof project.auditScore === "number" &&
        project.auditScore >= 0 &&
        project.auditScore <= 100;

      const hasValidBreakdown =
        breakdown &&
        typeof breakdown === "object" &&
        Array.isArray(breakdown.strengths) &&
        Array.isArray(breakdown.weaknesses);

      if (!hasValidScore) {
        auditDeficiencies.push(`${project.slug}: missing or invalid auditScore (${project.auditScore})`);
      }
      if (!hasValidBreakdown) {
        auditDeficiencies.push(`${project.slug}: missing or malformed auditBreakdown`);
      }

      const coverDisplay = project.coverImageUrl
        ? project.coverImageUrl.replace(/.*\/projects\//, ".../projects/")
        : "(null)";

      tableData.push({
        Slug: project.slug,
        Title: project.title.slice(0, 24),
        "Audit Score": hasValidScore ? `${project.auditScore}/100` : "MISSING",
        "Strengths Count": Array.isArray(breakdown?.strengths) ? breakdown.strengths.length : 0,
        "Weaknesses Count": Array.isArray(breakdown?.weaknesses) ? breakdown.weaknesses.length : 0,
        "Storage URL (truncated)": coverDisplay,
      });
    }

    if (auditDeficiencies.length > 0) {
      console.error("❌ AUDIT RECORD DEFICIENCIES DETECTED:");
      auditDeficiencies.forEach((d) => console.error(`   - ${d}`));
      hasErrors = true;
    } else {
      console.log("✅ 100% of projects possess valid audit scores and populated strengths/weaknesses.");
    }

    // 4. Print Summary Table
    console.log("\n▶ [4/4] Project Pipeline Status Summary Table:");
    console.table(tableData);

    if (hasErrors) {
      console.error("\n❌ PIPELINE VERIFICATION FAILED: See details above.");
      process.exit(1);
    } else {
      console.log("\n🎉 ALL SUPABASE PIPELINE & AUDIT ASSERTIONS PASSED PERFECTLY!");
      process.exit(0);
    }
  } catch (err: any) {
    console.error("❌ UNHANDLED EXCEPTION DURING PIPELINE VERIFICATION:", err.message || err);
    process.exit(1);
  } finally {
    clearTimeout(timeoutTimer);
    await prisma.$disconnect();
  }
}

main();

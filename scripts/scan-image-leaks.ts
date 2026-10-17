/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Image Leak Scanner
 * Scans all Project records in PostgreSQL for external images in:
 * - coverImageUrl
 * - descriptionEn / descriptionFa
 * - taglineEn / taglineFa
 * - aiContextDigest (if containing markdown/html image links)
 */

import { prisma } from "../lib/prisma";

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g;
const HTML_IMAGE_REGEX = /<img\s+[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/gi;

function findExternalUrls(text: string | null | undefined): string[] {
  if (!text || typeof text !== "string") return [];
  const matches: string[] = [];

  // Markdown images
  let mdMatch;
  while ((mdMatch = MD_IMAGE_REGEX.exec(text)) !== null) {
    const url = mdMatch[2];
    if (!url.includes("supabase.co/storage/v1/object/public/")) {
      matches.push(url);
    }
  }

  // HTML images
  let htmlMatch;
  while ((htmlMatch = HTML_IMAGE_REGEX.exec(text)) !== null) {
    const url = htmlMatch[1];
    if (!url.includes("supabase.co/storage/v1/object/public/")) {
      matches.push(url);
    }
  }

  return matches;
}

async function main() {
  const timer = setTimeout(() => {
    console.error("[TIMEOUT] Scan took longer than 15s. Forcing exit.");
    process.exit(1);
  }, 15000);

  try {
    console.log("==================================================================");
    console.log("  ROOT ZERO SYSTEMS LAB™ - SCANNING FOR EXTERNAL IMAGE LEAKS");
    console.log("==================================================================\n");

    const projects = await prisma.project.findMany();
    console.log(`Auditing ${projects.length} project(s) in PostgreSQL...\n`);

    let totalLeaks = 0;
    const leakedProjects: Array<{
      slug: string;
      title: string;
      leaks: { field: string; url: string }[];
    }> = [];

    for (const project of projects) {
      const projectLeaks: { field: string; url: string }[] = [];

      // 1. Check coverImageUrl
      if (
        project.coverImageUrl &&
        !project.coverImageUrl.includes("supabase.co/storage/v1/object/public/")
      ) {
        projectLeaks.push({ field: "coverImageUrl", url: project.coverImageUrl });
      }

      // 2. Check descriptionEn
      const descEnLeaks = findExternalUrls(project.descriptionEn);
      descEnLeaks.forEach((url) => projectLeaks.push({ field: "descriptionEn", url }));

      // 3. Check descriptionFa
      const descFaLeaks = findExternalUrls(project.descriptionFa);
      descFaLeaks.forEach((url) => projectLeaks.push({ field: "descriptionFa", url }));

      // 4. Check taglineEn / taglineFa
      findExternalUrls(project.taglineEn).forEach((url) =>
        projectLeaks.push({ field: "taglineEn", url })
      );
      findExternalUrls(project.taglineFa).forEach((url) =>
        projectLeaks.push({ field: "taglineFa", url })
      );

      // 5. Check aiContextDigest if stringified
      if (project.aiContextDigest) {
        const digestStr = JSON.stringify(project.aiContextDigest);
        findExternalUrls(digestStr).forEach((url) =>
          projectLeaks.push({ field: "aiContextDigest", url })
        );
      }

      if (projectLeaks.length > 0) {
        totalLeaks += projectLeaks.length;
        leakedProjects.push({
          slug: project.slug,
          title: project.title,
          leaks: projectLeaks,
        });
      }
    }

    if (leakedProjects.length === 0) {
      console.log("✅ ZERO EXTERNAL IMAGE LEAKS FOUND! All project assets are 100% sovereign.");
    } else {
      console.log(`⚠️ FOUND ${totalLeaks} EXTERNAL IMAGE LEAK(S) across ${leakedProjects.length} project(s):\n`);
      for (const p of leakedProjects) {
        console.log(`• Project: "${p.title}" (slug: ${p.slug})`);
        for (const leak of p.leaks) {
          console.log(`    - [${leak.field}]: ${leak.url}`);
        }
      }
    }

    console.log("\n==================================================================");
    console.log("  SCAN COMPLETE");
    console.log("==================================================================");
  } catch (err: any) {
    console.error("Scan error:", err.message || err);
    process.exit(1);
  } finally {
    clearTimeout(timer);
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

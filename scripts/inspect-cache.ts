import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== INSPECTING SUPABASE CACHE TABLES ===");

  const techs = await prisma.techDefinition.findMany({
    orderBy: { slug: "asc" },
  });

  console.log(`\n1. TechDefinition Table (${techs.length} rows):`);
  for (const t of techs) {
    console.log(
      `  • slug: "${t.slug}" | name: "${t.name}" | category: "${t.category}" | summaryEn: ${
        t.summaryEn ? t.summaryEn.slice(0, 45) + "..." : "MISSING"
      } | summaryFa: ${t.summaryFa ? t.summaryFa.slice(0, 30) + "..." : "MISSING"}`
    );
  }

  const apiCaches = await prisma.apiCache.findMany();
  console.log(`\n2. ApiCache Table (${apiCaches.length} rows):`);
  for (const c of apiCaches) {
    console.log(`  • key: "${c.key}" | etag: "${c.etag}" | updatedAt: ${c.updatedAt}`);
  }

  const projects = await prisma.project.findMany({
    select: {
      slug: true,
      title: true,
      aiContextDigest: true,
      languages: true,
    },
  });

  console.log(`\n3. Project AI Digest Status (${projects.length} projects):`);
  for (const p of projects) {
    const hasDigest = Boolean(
      p.aiContextDigest &&
      typeof p.aiContextDigest === "object" &&
      Object.keys(p.aiContextDigest as object).length > 0
    );
    console.log(`  • [${p.slug}] "${p.title}" -> aiContextDigest: ${hasDigest ? "POPULATED" : "NULL"}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

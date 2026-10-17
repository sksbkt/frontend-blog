import { ensureSovereignAsset } from "../lib/asset-pipeline";
import { getServiceSupabase } from "../lib/supabase";
import { prisma } from "../lib/prisma";

async function ingestGamingFrontAsset() {
  console.log("🚀 Ingesting 'gaming front' asset into Supabase Storage 'projects/covers/'...");
  
  const githubOgUrl = "https://opengraph.githubassets.com/1/sksbkt/gaming-front-1";
  
  const sovereignUrl = await ensureSovereignAsset(githubOgUrl, {
    folder: "covers",
    customFileName: "gaming-front.png",
    forceRefresh: true,
  });

  console.log("✅ Sovereign Supabase Asset URL:", sovereignUrl);

  // Check if project exists in database, or create it if missing
  let project = await prisma.project.findFirst({
    where: {
      OR: [
        { slug: "gaming-front-1" },
        { slug: "gaming-front" },
        { title: { contains: "gaming", mode: "insensitive" } },
      ],
    },
  });

  if (project) {
    console.log(`Updating existing project [${project.id}] with sovereign coverImageUrl...`);
    project = await prisma.project.update({
      where: { id: project.id },
      data: { coverImageUrl: sovereignUrl },
    });
    console.log("✅ Project updated successfully!");
  } else {
    console.log("ℹ️ Project 'gaming front' does not yet exist in PostgreSQL. Checking Supabase file existence...");
  }

  // Verify object exists in bucket
  const supabase = getServiceSupabase();
  const { data: coversFiles } = await supabase.storage.from("projects").list("covers");
  console.log("\n📦 Supabase 'projects/covers/' contents now:");
  coversFiles?.forEach((f) => console.log(`   * ${f.name} (${f.metadata?.size || 0} bytes)`));
}

ingestGamingFrontAsset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

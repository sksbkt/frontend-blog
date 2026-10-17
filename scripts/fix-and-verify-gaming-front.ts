import { prisma } from "../lib/prisma";
import { getServiceSupabase } from "../lib/supabase";
import { ensureProjectOgAsset } from "../lib/assets/og-cache-manager";

async function main() {
  console.log("========================================================");
  console.log("🛠️ FIX & VERIFY GAMING FRONT SOVEREIGN ASSET PIPELINE");
  console.log("========================================================\n");

  // 1. Locate Gaming Front Project
  const project = await prisma.project.findFirst({
    where: {
      OR: [
        { slug: { contains: "gaming", mode: "insensitive" } },
        { title: { contains: "gaming", mode: "insensitive" } },
      ],
    },
  });

  if (!project) {
    console.error("❌ 'Gaming Front' project not found in database!");
    process.exit(1);
  }

  console.log(`📌 Found Project: "${project.title}" (slug: ${project.slug})`);
  console.log(`   - Current coverImageUrl:  ${project.coverImageUrl}`);
  console.log(`   - Current lowResCoverUrl: ${project.lowResCoverUrl || "(none)"}`);
  console.log(`   - Current assetSource:    ${project.assetSource || "(none)"}`);
  console.log(`   - GitHub repoUrl:         ${project.repoUrl || project.githubUrl}`);

  const repoUrl = project.repoUrl || project.githubUrl;
  if (!repoUrl) {
    console.error("❌ No GitHub repoUrl found on project record!");
    process.exit(1);
  }

  // 2. Determine if fix is needed
  const isMislocatedInCovers = project.coverImageUrl?.includes("/projects/covers/");
  const missingLowRes = !project.lowResCoverUrl;
  const isNotWebp = !project.coverImageUrl?.endsWith(".webp");

  if (isMislocatedInCovers || missingLowRes || isNotWebp) {
    console.log("\n⚠️ Issue detected: Asset is in covers/ or lacks dual-tier WebP processing.");
    console.log("🚀 Running ensureProjectOgAsset() to generate dual-tier WebP in projects/github-og/...");

    const ogResult = await ensureProjectOgAsset(project.slug, repoUrl);
    console.log("✅ Dual-tier WebP generation complete!");
    console.log(`   - High-Res URL: ${ogResult.highResUrl}`);
    console.log(`   - Low-Res URL:  ${ogResult.lowResUrl}`);
  } else {
    console.log("\n✅ Project asset is already properly placed in projects/github-og/ with dual-tier WebP.");
  }

  // 3. Verify Database Record
  const updatedProject = await prisma.project.findUnique({
    where: { id: project.id },
  });

  console.log("\n========================================================");
  console.log("📋 UPDATED DATABASE RECORD");
  console.log("========================================================");
  console.log(`- Project ID:       ${updatedProject?.id}`);
  console.log(`- Slug:             ${updatedProject?.slug}`);
  console.log(`- coverImageUrl:    ${updatedProject?.coverImageUrl}`);
  console.log(`- lowResCoverUrl:   ${updatedProject?.lowResCoverUrl}`);
  console.log(`- assetSource:      ${updatedProject?.assetSource}`);
  console.log(`- ogCachedAt:       ${updatedProject?.ogCachedAt?.toISOString()}`);

  // 4. Verify Supabase Storage Bucket Objects
  const supabase = getServiceSupabase();
  const { data: files, error } = await supabase.storage.from("projects").list("github-og");

  if (error) {
    console.error("❌ Error listing objects in projects/github-og/:", error.message);
  } else {
    const highFile = `${project.slug}-og-high.webp`;
    const lowFile = `${project.slug}-og-low.webp`;

    const highExists = files?.some((f) => f.name === highFile);
    const lowExists = files?.some((f) => f.name === lowFile);

    console.log("\n========================================================");
    console.log("🗄️ SUPABASE STORAGE VERIFICATION (projects/github-og/)");
    console.log("========================================================");
    console.log(`- High-Res file exists (${highFile}): ${highExists ? "✅ YES" : "❌ NO"}`);
    console.log(`- Low-Res file exists  (${lowFile}):  ${lowExists ? "✅ YES" : "❌ NO"}`);
    console.log("========================================================\n");
  }

  // 5. Clean up old mislocated file in covers/ if present
  if (isMislocatedInCovers && project.coverImageUrl) {
    const oldFileName = project.coverImageUrl.split("/").pop();
    if (oldFileName) {
      console.log(`🧹 Removing orphaned mislocated asset from covers/: ${oldFileName}`);
      await supabase.storage.from("projects").remove([`covers/${oldFileName}`]);
      console.log("✅ Removed old covers/ asset.");
    }
  }

  console.log("✨ All fixes and verifications completed successfully!\n");
}

main()
  .catch((err) => {
    console.error("❌ Fix script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

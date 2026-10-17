import { prisma } from "../lib/prisma";
import { getServiceSupabase } from "../lib/supabase";
import { ensureSovereignAsset } from "../lib/asset-pipeline";

async function inspectProject() {
  console.log("🔍 Looking for 'Gaming Front' project in PostgreSQL...");
  
  const project = await prisma.project.findFirst({
    where: {
      OR: [
        { title: { contains: "gaming", mode: "insensitive" } },
        { slug: { contains: "gaming", mode: "insensitive" } }
      ]
    }
  });

  if (!project) {
    console.error("❌ No project found matching 'gaming' in database!");
    return;
  }

  console.log(`\n📌 Project Record:`);
  console.log(`- ID: ${project.id}`);
  console.log(`- Title: "${project.title}"`);
  console.log(`- Slug: "${project.slug}"`);
  console.log(`- coverImageUrl: ${project.coverImageUrl}`);
  console.log(`- blurDataUrl exists?: ${Boolean((project as any).blurDataUrl)}`);

  const supabase = getServiceSupabase();

  // 1. List all buckets
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error("Error listing buckets:", bucketError.message);
  } else {
    console.log(`\n🗄️ Available Supabase Buckets:`, buckets?.map(b => b.name));
  }

  // 2. List objects in 'projects' bucket under folders
  const { data: covers } = await supabase.storage.from("projects").list("covers");
  const { data: githubOg } = await supabase.storage.from("projects").list("github-og");
  const { data: rootFiles } = await supabase.storage.from("projects").list("");

  console.log(`\n📦 Objects in 'projects/covers/':`, covers?.map(f => f.name));
  console.log(`📦 Objects in 'projects/github-og/':`, githubOg?.map(f => f.name));
  console.log(`📦 Objects in 'projects/' (root):`, rootFiles?.filter(f => f.id).map(f => f.name));

  // Step 2: Ingest Asset into Supabase (If External or Uncached)
  const isSupabaseHosted = project.coverImageUrl?.includes("supabase.co/storage/v1/object/public/projects");

  if (!project.coverImageUrl || !isSupabaseHosted) {
    console.log("\n⚠️ Image is NOT hosted in Supabase. Ingesting into Supabase 'projects/covers/'...");
    const fallbackUrl = project.coverImageUrl || `https://opengraph.githubassets.com/1/sksbkt/${project.slug}`;
    
    const sovereignUrl = await ensureSovereignAsset(fallbackUrl, {
      folder: "covers",
      customFileName: `${project.slug}.png`,
      forceRefresh: true,
    });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { coverImageUrl: sovereignUrl },
    });

    console.log("✅ Ingested and Updated Project coverImageUrl:", updated.coverImageUrl);
  } else {
    console.log("\n✅ coverImageUrl is already sovereignly stored in Supabase Storage:", project.coverImageUrl);
    // Verify file actually exists in storage bucket
    const fileName = project.coverImageUrl.split("/").pop();
    const folder = project.coverImageUrl.includes("/covers/") ? "covers" : "github-og";
    const exists = (folder === "covers" ? covers : githubOg)?.some(f => f.name === fileName);
    console.log(`🔍 Verified object '${fileName}' exists in bucket '${folder}':`, exists);
  }
}

inspectProject()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

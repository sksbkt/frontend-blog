import "dotenv/config";
import { prisma } from "../lib/prisma";
import { normalizeTechSlug } from "../lib/tech/service";

async function main() {
  console.log("Normalizing all TechDefinition slugs in Supabase to match canonical normalizeTechSlug...");

  const allTechs = await prisma.techDefinition.findMany();
  console.log(`Checking ${allTechs.length} existing records...`);

  let addedCount = 0;

  for (const t of allTechs) {
    const canonicalSlug = normalizeTechSlug(t.name);
    if (canonicalSlug !== t.slug) {
      console.log(`  🔄 Non-canonical slug found for "${t.name}": current="${t.slug}" -> canonical="${canonicalSlug}"`);

      // Ensure the canonical slug exists in the database
      await prisma.techDefinition.upsert({
        where: { slug: canonicalSlug },
        update: {
          name: t.name,
          summaryEn: t.summaryEn,
          summaryFa: t.summaryFa,
          category: t.category,
        },
        create: {
          slug: canonicalSlug,
          name: t.name,
          summaryEn: t.summaryEn,
          summaryFa: t.summaryFa,
          category: t.category,
        },
      });
      addedCount++;
    }
  }

  // Also check project technologies
  const projects = await prisma.project.findMany({ select: { technologies: true } });
  const projectTechNames = Array.from(new Set(projects.flatMap(p => p.technologies || [])));

  for (const name of projectTechNames) {
    const slug = normalizeTechSlug(name);
    const exists = await prisma.techDefinition.findUnique({ where: { slug } });
    if (!exists) {
      console.log(`  ⚠️ Project tech tag "${name}" missing canonical slug "${slug}".`);
    } else {
      console.log(`  ✓ Project tech tag "${name}" [${slug}] confirmed in Supabase.`);
    }
  }

  const finalCount = await prisma.techDefinition.count();
  console.log(`\nDone! Added/synchronized ${addedCount} canonical slug(s). Total rows in Supabase: ${finalCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

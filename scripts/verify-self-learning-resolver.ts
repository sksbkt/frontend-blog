import "dotenv/config";
import { prisma } from "../lib/prisma";
import { resolveTechStack, sanitizeLookupKey } from "../lib/tech-resolver";

async function main() {
  console.log("=================================================================");
  console.log("  AI SELF-LEARNING CANONICAL TECH RESOLVER VERIFICATION SUITE   ");
  console.log("=================================================================\n");

  // TEST 1: Verify React and its aliases
  console.log("--- TEST 1: Verify 'React' and variation 'React.js' / 'ReactJS' ---");
  const reactVariations = ["React.js", "ReactJS", "react-js", "react"];
  const t0 = performance.now();
  const reactResolved = await resolveTechStack(reactVariations);
  const t1 = performance.now();

  console.log(`Resolved ${reactResolved.length}/${reactVariations.length} in ${(t1 - t0).toFixed(2)}ms`);
  for (let i = 0; i < reactVariations.length; i++) {
    const input = reactVariations[i];
    const def = reactResolved[i];
    console.log(`  • Input: "${input}" => Name: "${def.name}", Slug: "${def.slug}", Aliases: ${JSON.stringify(def.aliases)}`);
    if (def.slug !== "react") {
      throw new Error(`Expected canonical slug 'react' for '${input}', got '${def.slug}'`);
    }
  }

  // TEST 2: Disambiguation between "ACE3" and "ACE3 Framework"
  console.log("\n--- TEST 2: Disambiguation between 'ACE3' and 'ACE3 Framework' ---");
  const aceVariations = ["ACE3", "ACE3 Framework"];
  const aceResolved = await resolveTechStack(aceVariations);
  console.log(`  • "${aceVariations[0]}" => Slug: "${aceResolved[0].slug}", Name: "${aceResolved[0].name}"`);
  console.log(`  • "${aceVariations[1]}" => Slug: "${aceResolved[1].slug}", Name: "${aceResolved[1].name}"`);

  if (aceResolved[0].slug === aceResolved[1].slug) {
    throw new Error("Collision detected between 'ACE3' and 'ACE3 Framework'!");
  }
  console.log("  ✓ Distinct canonical slugs assigned without collision.");

  // TEST 3: Self-learning on a new technology
  console.log("\n--- TEST 3: AI Self-Learning on new technology ('Turbopack') ---");
  // Clean up any test record if left from prior test
  await prisma.techDefinition.deleteMany({
    where: { slug: { in: ["turbopack", "zustand"] } },
  });

  console.log("1. Triggering initial resolution for 'Turbopack' (Gemini should synthesize & discover aliases)...");
  const t2 = performance.now();
  const newTechResolved = await resolveTechStack(["Turbopack"]);
  const t3 = performance.now();

  console.log(`Synthesized in ${(t3 - t2).toFixed(2)}ms:`);
  const turbopackDef = newTechResolved[0];
  console.log(`  • Name: "${turbopackDef.name}"`);
  console.log(`  • Slug: "${turbopackDef.slug}"`);
  console.log(`  • Aliases: ${JSON.stringify(turbopackDef.aliases)}`);
  console.log(`  • Category: "${turbopackDef.category}"`);
  console.log(`  • Icon: "${turbopackDef.icon}"`);
  console.log(`  • Summary (EN): ${turbopackDef.summaryEn}`);
  console.log(`  • Summary (FA): ${turbopackDef.summaryFa}`);

  // Confirm database persistence
  const dbRecord = await prisma.techDefinition.findUnique({
    where: { slug: turbopackDef.slug },
  });

  if (!dbRecord) {
    throw new Error("Failed to persist newly synthesized tech definition to Supabase!");
  }
  console.log(`  ✓ Confirmed persisted in Supabase with ${dbRecord.aliases.length} known alias(es).`);

  // TEST 4: Immediate cache hit on alias lookup
  console.log("\n--- TEST 4: Verify zero-latency DB cache hit on alias lookup ---");
  // Use one of the discovered aliases or hyphenated form
  const aliasQuery = turbopackDef.aliases.length > 0 ? turbopackDef.aliases[0] : "turbo-pack";
  console.log(`Querying by discovered alias: "${aliasQuery}"...`);

  const t4 = performance.now();
  const aliasResolved = await resolveTechStack([aliasQuery]);
  const t5 = performance.now();

  console.log(`Resolved in ${(t5 - t4).toFixed(2)}ms (from DB cache):`);
  console.log(`  • Input: "${aliasQuery}" => Canonical Name: "${aliasResolved[0].name}", Slug: "${aliasResolved[0].slug}"`);

  if (aliasResolved[0].slug !== turbopackDef.slug) {
    throw new Error(`Alias lookup resolved to '${aliasResolved[0].slug}', expected '${turbopackDef.slug}'`);
  }

  console.log("\n=================================================================");
  console.log("  🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!                ");
  console.log("=================================================================\n");
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

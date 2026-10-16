import { getOrCacheGithubOgImage } from "@/lib/github-og-cache";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("=== STARTING GITHUB OPENGRAPH CACHE TELEMETRY TEST ===");
  const owner = "vercel";
  const repo = "next.js";
  const startTotal = Date.now();

  try {
    console.log("\n--- TEST RUN 1: Cold Cache (Fetch, Store, & Persist) ---");
    const t0 = Date.now();
    const url1 = await getOrCacheGithubOgImage(owner, repo);
    console.log(`[Result 1] URL: ${url1} (Took ${Date.now() - t0}ms)`);

    console.log("\n--- TEST RUN 2: [5/5] Re-querying to verify instant DB cache hit ---");
    const t1 = Date.now();
    const url2 = await getOrCacheGithubOgImage(owner, repo);
    console.log(`[Result 2] URL: ${url2} (Took ${Date.now() - t1}ms)`);

    if (url1 === url2) {
      console.log("\n✅ SUCCESS: Cache hit URL matches stored public storage URL!");
    } else {
      console.warn("\n⚠️ WARNING: URLs differed between runs.");
    }

    console.log(`\nTotal test execution time: ${Date.now() - startTotal}ms`);
  } catch (err) {
    console.error("❌ Test encountered an error:", err);
  } finally {
    console.log("Cleaning up Prisma connection pool and exiting cleanly...");
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();

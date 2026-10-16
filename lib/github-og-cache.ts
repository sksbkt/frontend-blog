/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * GitHub OpenGraph Asset Caching Pipeline
 * 14-day TTL CDN caching with Supabase Storage and PostgreSQL AssetCache.
 */

import { prisma } from "@/lib/prisma";
import { getServiceSupabase } from "@/lib/supabase";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function getOrCacheGithubOgImage(
  repoOwner: string,
  repoName: string
): Promise<string> {
  const cleanOwner = repoOwner.toLowerCase().trim();
  const cleanRepo = repoName.toLowerCase().trim();
  const cacheKey = `github-og:${cleanOwner}/${cleanRepo}`;
  const now = new Date();

  // [1/5] Checking Prisma AssetCache
  console.log(`[1/5] Checking Prisma AssetCache for "${cacheKey}"...`);
  try {
    const cached = await prisma.assetCache.findUnique({
      where: { key: cacheKey },
    });

    if (
      cached &&
      cached.expiresAt > now &&
      !cached.storageUrl.includes("githubassets.com")
    ) {
      console.log(`[1/5] Cache HIT: Valid until ${cached.expiresAt.toISOString()}`);
      try {
        const { emitTelemetryEvent } = await import("@/lib/telemetry/event-bus");
        emitTelemetryEvent({
          entityType: "og-image",
          key: `${cleanOwner}/${cleanRepo}`,
          source: "DB_CACHE",
          latencyMs: Date.now() - now.getTime(),
          status: "SUCCESS",
          details: { storageUrl: cached.storageUrl, cachedUntil: cached.expiresAt.toISOString() },
        });
      } catch {}
      return cached.storageUrl;
    }
    console.log(`[1/5] Cache MISS, expired, or invalid external URL.`);
  } catch (err) {
    console.warn(`[1/5] Warning reading AssetCache for ${cacheKey}:`, err);
  }

  // [2/5] Fetching OpenGraph binary from GitHub
  const githubOgUrl = `https://opengraph.githubassets.com/1/${repoOwner}/${repoName}`;
  console.log(`[2/5] Fetching OpenGraph binary from GitHub: ${githubOgUrl}...`);
  const response = await fetch(githubOgUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PortfolioBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub OG fetch failed with status ${response.status} (${response.statusText}) for ${repoOwner}/${repoName}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const storagePath = `github-og/${cleanOwner}-${cleanRepo}.png`;
  console.log(`[2/5] Binary received: ${fileBuffer.length} bytes.`);

  // [3/5] Uploading binary to Supabase Storage (projects bucket) via Admin Client
  console.log(`[3/5] Uploading binary to Supabase Storage (projects/${storagePath})...`);
  const supabaseAdmin = getServiceSupabase();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("projects")
    .upload(storagePath, fileBuffer, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "1209600", // 14 days browser cache
    });

  if (uploadError) {
    console.error(`[STORAGE UPLOAD ERROR for ${storagePath}]:`, uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("projects").getPublicUrl(storagePath);

  if (!publicUrl || publicUrl.includes("githubassets.com")) {
    throw new Error(`Invalid publicUrl generated for ${storagePath}: ${publicUrl}`);
  }

  console.log(`[3/5] Upload complete. Public URL: ${publicUrl}`);

  const expiresAt = new Date(Date.now() + FOURTEEN_DAYS_MS);

  // [4/5] Writing 14-day TTL record to AssetCache
  console.log(
    `[4/5] Writing 14-day TTL record to AssetCache (source: Supabase Storage, expires: ${expiresAt.toISOString()})...`
  );
  await prisma.assetCache.upsert({
    where: { key: cacheKey },
    update: {
      storageUrl: publicUrl,
      contentType: "image/png",
      expiresAt,
      updatedAt: new Date(),
    },
    create: {
      key: cacheKey,
      storageUrl: publicUrl,
      contentType: "image/png",
      expiresAt,
    },
  });
  console.log(`[4/5] AssetCache upserted successfully into PostgreSQL.`);

  // [5/5] Emitting live telemetry
  try {
    const { emitTelemetryEvent } = await import("@/lib/telemetry/event-bus");
    emitTelemetryEvent({
      entityType: "og-image",
      key: `${cleanOwner}/${cleanRepo}`,
      source: "GITHUB_API",
      latencyMs: Date.now() - now.getTime(),
      status: "SUCCESS",
      details: {
        storageUrl: publicUrl,
        storagePath,
      },
    });
  } catch {}

  return publicUrl;
}

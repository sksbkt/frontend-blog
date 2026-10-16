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

    if (cached && cached.expiresAt > now) {
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
    console.log(`[1/5] Cache MISS or expired.`);
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

  let storageUrl = githubOgUrl;
  let isStorageUploaded = false;

  if (!response.ok) {
    console.warn(`[2/5] GitHub fetch rate-limited or failed (${response.status} ${response.statusText}).`);
    try {
      const stale = await prisma.assetCache.findUnique({ where: { key: cacheKey } });
      if (stale?.storageUrl) {
        console.log(`[2/5] Serving stale fallback cache.`);
        return stale.storageUrl;
      }
    } catch {}
    console.log(`[2/5] Using fallback CDN URL directly.`);
    storageUrl = githubOgUrl;
  } else {
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const storagePath = `github-og/${cleanOwner}-${cleanRepo}.png`;
    console.log(`[2/5] Binary received: ${fileBuffer.length} bytes.`);

    // [3/5] Uploading binary to Supabase Storage (projects bucket)
    console.log(`[3/5] Uploading binary to Supabase Storage (projects/${storagePath})...`);
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey || serviceRoleKey.includes("your-service-ro")) {
        console.warn(
          "[3/5] Notice: SUPABASE_SERVICE_ROLE_KEY is using a placeholder. Skipping Supabase Storage upload and caching GitHub OG CDN URL directly."
        );
      } else {
        const serviceClient = getServiceSupabase();
        const { error: uploadError } = await serviceClient.storage
          .from("projects")
          .upload(storagePath, fileBuffer, {
            contentType: "image/png",
            upsert: true,
            cacheControl: "1209600", // 14 days browser cache
          });

        if (uploadError) {
          console.error("[3/5] Supabase Storage upload error:", uploadError.message || uploadError);
        } else {
          const { data: publicUrlData } = serviceClient.storage
            .from("projects")
            .getPublicUrl(storagePath);

          storageUrl = publicUrlData.publicUrl;
          isStorageUploaded = true;
          console.log(`[3/5] Upload complete. Public URL: ${storageUrl}`);
        }
      }
    } catch (storageErr: any) {
      console.error("[3/5] Supabase upload exception:", storageErr?.message || storageErr);
    }
  }

  const expiresAt = new Date(Date.now() + FOURTEEN_DAYS_MS);

  // [4/5] Writing 14-day TTL record to AssetCache
  console.log(
    `[4/5] Writing 14-day TTL record to AssetCache (source: ${
      isStorageUploaded ? "Supabase Storage" : "GitHub OG CDN"
    }, expires: ${expiresAt.toISOString()})...`
  );
  try {
    await prisma.assetCache.upsert({
      where: { key: cacheKey },
      update: {
        storageUrl,
        contentType: "image/png",
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        key: cacheKey,
        storageUrl,
        contentType: "image/png",
        expiresAt,
      },
    });
    console.log(`[4/5] AssetCache upserted successfully into PostgreSQL.`);
  } catch (dbErr) {
    console.error(`[4/5] Failed updating AssetCache in DB for ${cacheKey}:`, dbErr);
  }

  try {
    const { emitTelemetryEvent } = await import("@/lib/telemetry/event-bus");
    emitTelemetryEvent({
      entityType: "og-image",
      key: `${cleanOwner}/${cleanRepo}`,
      source: isStorageUploaded ? "GITHUB_API" : "GITHUB_API",
      latencyMs: Date.now() - now.getTime(),
      status: "SUCCESS",
      details: {
        storageUrl,
        uploadedToSupabase: isStorageUploaded,
      },
    });
  } catch {}

  return storageUrl;
}

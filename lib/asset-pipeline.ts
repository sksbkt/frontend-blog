/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * Universal Sovereign Asset Ingestion & Auto-Caching Pipeline
 * Ensures 100% of site imagery is ingested, buffered, and persisted to Supabase Storage
 * with zero external CDN dependencies.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getServiceSupabase } from "@/lib/supabase";
import { processAndStoreDualTier } from "@/lib/images/process-progressive";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface SovereignAssetOptions {
  folder?: string;
  ttlMs?: number;
  forceRefresh?: boolean;
  customKey?: string;
  customFileName?: string;
  contentType?: string;
  dualTier?: boolean;
  projectSlug?: string;
}

/**
 * Ensures any image URL (remote CDN, GitHub OG, external blog asset) is
 * self-hosted within the Supabase Storage 'projects' bucket.
 */
export async function ensureSovereignAsset(
  rawUrl: string | null | undefined,
  options: SovereignAssetOptions = {}
): Promise<string> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return rawUrl || "";
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  // 1. If it's a local static asset (/images/...), keep as-is
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  // 2. Check if already hosted on our Supabase Storage domain
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gnayjkeovhtdzalpuhvh.supabase.co";
  const isAlreadySovereign =
    trimmed.includes("supabase.co/storage/v1/object/public/") ||
    trimmed.startsWith(`${supabaseUrl}/storage/v1/object/public/`);

  if (isAlreadySovereign && !options.forceRefresh) {
    return trimmed;
  }

  // Enforce strict sovereign storage hierarchy:
  // - opengraph.githubassets.com -> github-og
  // - captures / automated runners -> captures
  // - user uploads / custom covers -> covers
  let folder = options.folder;
  if (trimmed.includes("opengraph.githubassets.com") || options.customKey?.startsWith("github-og:")) {
    folder = "github-og";
  } else if (!folder) {
    folder = "covers";
  }
  const sha256 = createHash("sha256").update(trimmed).digest("hex");
  const cacheKey = options.customKey || `asset-sha256:${sha256}`;
  const now = new Date();

  // 3. Check PostgreSQL AssetCache
  if (!options.forceRefresh) {
    try {
      const cached = await prisma.assetCache.findUnique({
        where: { key: cacheKey },
      });

      if (
        cached &&
        cached.storageUrl &&
        (!cached.expiresAt || cached.expiresAt > now) &&
        cached.storageUrl.includes("supabase.co")
      ) {
        try {
          const { emitTelemetryEvent } = await import("@/lib/telemetry/event-bus");
          emitTelemetryEvent({
            entityType: "og-image",
            key: cacheKey,
            source: "DB_CACHE",
            latencyMs: 1,
            status: "SUCCESS",
            details: {
              storageUrl: cached.storageUrl,
              cachedUntil: cached.expiresAt ? cached.expiresAt.toISOString() : "permanent",
            },
          });
        } catch {}
        return cached.storageUrl;
      }
    } catch (err) {
      console.warn(`[AssetPipeline] Warning querying AssetCache for key ${cacheKey}:`, err);
    }
  }

  // 4. Ingest and Buffer Remote Binary
  console.log(`[AssetPipeline] Ingesting external asset to Supabase Storage: ${trimmed}`);
  let fileBuffer: Buffer;
  let detectedContentType = options.contentType || "image/png";

  // Handle Base64 Data URLs
  if (trimmed.startsWith("data:")) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid data URL format");
    }
    detectedContentType = options.contentType || match[1];
    fileBuffer = Buffer.from(match[2], "base64");
  } else {
    // Remote HTTP / HTTPS Fetch
    const startTime = Date.now();
    const response = await fetch(trimmed, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RootZeroSovereignAssetBot/1.0)",
      },
    });

    if (!response.ok) {
      // If remote origin is down or rate-limiting, try serving stale cache before throwing
      try {
        const stale = await prisma.assetCache.findUnique({ where: { key: cacheKey } });
        if (stale?.storageUrl?.includes("supabase.co")) {
          console.warn(`[AssetPipeline] Origin returned ${response.status}. Serving stale cache: ${stale.storageUrl}`);
          return stale.storageUrl;
        }
      } catch {}

      throw new Error(
        `Failed to fetch asset from origin (${response.status} ${response.statusText}): ${trimmed}`
      );
    }

    const headerType = response.headers.get("content-type");
    if (headerType && headerType.includes("image/")) {
      detectedContentType = options.contentType || headerType.split(";")[0].trim();
    }

    const arrayBuffer = await response.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
    console.log(`[AssetPipeline] Binary downloaded (${fileBuffer.length} bytes in ${Date.now() - startTime}ms)`);
  }

  // Resolve File Extension
  let ext = "png";
  if (detectedContentType.includes("webp")) ext = "webp";
  else if (detectedContentType.includes("jpeg") || detectedContentType.includes("jpg")) ext = "jpg";
  else if (detectedContentType.includes("svg")) ext = "svg";
  else if (detectedContentType.includes("gif")) ext = "gif";

  const fileName = options.customFileName || `${sha256.substring(0, 32)}.${ext}`;
  const storagePath = `${folder}/${fileName}`;

  // 5. Upload into Supabase Storage 'projects' bucket
  const supabaseAdmin = getServiceSupabase();
  const { error: uploadError } = await supabaseAdmin.storage
    .from("projects")
    .upload(storagePath, fileBuffer, {
      contentType: detectedContentType,
      upsert: true,
      cacheControl: "1209600", // 14-day browser cache
    });

  if (uploadError) {
    console.error(`[AssetPipeline] Storage upload failed for ${storagePath}:`, uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("projects").getPublicUrl(storagePath);

  if (!publicUrl || !publicUrl.includes("supabase.co")) {
    throw new Error(`Failed to generate sovereign public URL for ${storagePath}: ${publicUrl}`);
  }

  // 5. Dual-Tier WebP Processing or Direct Upload
  let finalHighResUrl = publicUrl;
  let finalLowResUrl: string | null = null;

  const isStaticImage = !detectedContentType.includes("gif") && !detectedContentType.includes("svg");
  if ((options.dualTier || folder === "github-og") && isStaticImage) {
    try {
      const baseName = (options.customFileName || `${sha256.substring(0, 32)}`).replace(/\.[^/.]+$/, "");
      const dualResult = await processAndStoreDualTier(fileBuffer, folder as any, baseName);
      finalHighResUrl = dualResult.highResUrl;
      finalLowResUrl = dualResult.lowResUrl;
    } catch (dualErr) {
      console.warn(`[AssetPipeline] Warning in dual-tier processing, falling back to standard upload:`, dualErr);
    }
  }

  // 6. Record in AssetCache (Date.now() + ttlMs, or null for permanent manual assets)
  const expiresAt = options.ttlMs !== undefined
    ? (options.ttlMs === null ? null : new Date(Date.now() + options.ttlMs))
    : (folder === "covers" ? null : new Date(Date.now() + FOURTEEN_DAYS_MS));

  try {
    const slugDerived = options.projectSlug || options.customFileName?.replace(/\.[^/.]+$/, "") || cacheKey;
    const determinedExpiresAt = expiresAt || new Date(Date.now() + FOURTEEN_DAYS_MS);
    await prisma.assetCache.upsert({
      where: { key: cacheKey },
      update: {
        highResUrl: finalHighResUrl,
        lowResUrl: finalLowResUrl,
        storageUrl: finalHighResUrl,
        contentType: "image/webp",
        expiresAt: determinedExpiresAt,
        updatedAt: new Date(),
      },
      create: {
        projectSlug: slugDerived,
        assetType: folder === "github-og" ? "GITHUB_OG" : folder === "captures" ? "SCREENSHOT" : "USER_UPLOAD",
        highResUrl: finalHighResUrl,
        lowResUrl: finalLowResUrl,
        key: cacheKey,
        storageUrl: finalHighResUrl,
        contentType: "image/webp",
        expiresAt: determinedExpiresAt,
      },
    });

    if (options.projectSlug) {
      await prisma.project.updateMany({
        where: { slug: options.projectSlug },
        data: {
          coverImageUrl: finalHighResUrl,
          ...(finalLowResUrl ? { lowResCoverUrl: finalLowResUrl } : {}),
          assetSource: folder === "github-og" ? "GITHUB_OG" : folder === "captures" ? "GITHUB_ACTION_CAPTURE" : "USER_UPLOAD",
          ogCachedAt: new Date(),
        },
      });
    }

    console.log(
      `[AssetPipeline] Successfully persisted ${cacheKey} -> ${finalHighResUrl} (expires: ${
        expiresAt ? expiresAt.toISOString() : "permanent"
      })`
    );
  } catch (dbErr) {
    console.error(`[AssetPipeline] Failed updating AssetCache for ${cacheKey}:`, dbErr);
  }

  // 7. Emit Live Telemetry
  try {
    const { emitTelemetryEvent } = await import("@/lib/telemetry/event-bus");
    emitTelemetryEvent({
      entityType: "og-image",
      key: cacheKey,
      source: "GITHUB_API",
      latencyMs: 10,
      status: "SUCCESS",
      details: {
        storageUrl: publicUrl,
        storagePath,
        ingestedFrom: trimmed,
      },
    });
  } catch {}

  return publicUrl;
}

/**
 * Ingests all external markdown/HTML images inside a string (such as project overview or description)
 * and replaces them with sovereign Supabase Storage URLs.
 */
export async function sanitizeContentImages(
  content: string | null | undefined,
  options: { folder?: string } = { folder: "content" }
): Promise<string> {
  if (!content || typeof content !== "string") return content || "";

  let updatedContent = content;

  // 1. Markdown image syntax: ![alt](url)
  const mdRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g;
  const mdMatches = Array.from(content.matchAll(mdRegex));

  for (const match of mdMatches) {
    const [fullMatch, alt, rawUrl] = match;
    if (!rawUrl.includes("supabase.co/storage/v1/object/public/")) {
      try {
        const sovereignUrl = await ensureSovereignAsset(rawUrl, {
          folder: options.folder || "content",
        });
        if (sovereignUrl && sovereignUrl !== rawUrl) {
          updatedContent = updatedContent.replace(fullMatch, `![${alt}](${sovereignUrl})`);
        }
      } catch (err) {
        console.warn(`[AssetPipeline] Failed to ingest markdown image: ${rawUrl}`, err);
      }
    }
  }

  // 2. HTML image syntax: <img ... src="url" ... />
  const htmlRegex = /<img\s+([^>]*?)src=["'](https?:\/\/[^"']+)["']([^>]*?)>/gi;
  const htmlMatches = Array.from(content.matchAll(htmlRegex));

  for (const match of htmlMatches) {
    const [fullMatch, beforeSrc, rawUrl, afterSrc] = match;
    if (!rawUrl.includes("supabase.co/storage/v1/object/public/")) {
      try {
        const sovereignUrl = await ensureSovereignAsset(rawUrl, {
          folder: options.folder || "content",
        });
        if (sovereignUrl && sovereignUrl !== rawUrl) {
          updatedContent = updatedContent.replace(
            fullMatch,
            `<img ${beforeSrc}src="${sovereignUrl}"${afterSrc}>`
          );
        }
      } catch (err) {
        console.warn(`[AssetPipeline] Failed to ingest HTML img src: ${rawUrl}`, err);
      }
    }
  }

  return updatedContent;
}

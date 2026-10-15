import { createClient } from "next-sanity";

export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
});

export interface SanityImageAssetReference {
  _type: "image";
  alt?: string;
  asset: {
    _type: "reference";
    _ref: string;
  };
}

/**
 * Format a strict Sanity Image Reference Object matching schemaTypes/project.ts
 */
export function formatImageAssetReference(assetId: string, alt?: string): SanityImageAssetReference {
  return {
    _type: "image",
    alt: alt || "Cover Image",
    asset: {
      _type: "reference",
      _ref: assetId,
    },
  };
}

/**
 * Ingest remote / GitHub raw image buffer into Sanity Assets
 */
export async function uploadRemoteImageBuffer(url: string, filename?: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PortfolioAdmin/1.0)",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download remote asset from: ${url}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const finalFilename = filename || url.split("/").pop()?.split("?")[0] || `upload-${Date.now()}.png`;

  return writeClient.assets.upload("image", buffer, {
    filename: finalFilename,
  });
}

/**
 * Commit atomic patch to update coverImage and legacy image references
 */
export async function updateProjectCoverImage(
  projectId: string,
  imageAssetId: string,
  alt?: string
) {
  const ref = formatImageAssetReference(imageAssetId, alt);
  return writeClient
    .patch(projectId)
    .set({
      coverImage: ref,
      image: ref,
    })
    .commit();
}

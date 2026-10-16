import { supabaseAdmin } from "./server";
import { supabase } from "./client";

export const DEFAULT_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "portfolio-assets";

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  fileName?: string;
  contentType?: string;
  upsert?: boolean;
  useServiceRole?: boolean;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
  bucket: string;
  error?: string;
}

/**
 * Sanitizes a filename to avoid path traversal and invalid characters.
 */
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Ensures the target Supabase storage bucket exists.
 */
export async function ensureBucketExists(
  bucketName: string = DEFAULT_STORAGE_BUCKET,
  isPublic: boolean = true
): Promise<boolean> {
  try {
    const { data: buckets, error: listError } =
      await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error("[Supabase Storage] Failed to list buckets:", listError.message);
      return false;
    }

    const exists = buckets?.some((b) => b.name === bucketName);
    if (!exists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(
        bucketName,
        {
          public: isPublic,
          fileSizeLimit: 10485760, // 10MB limit
        }
      );

      if (createError) {
        console.error(
          `[Supabase Storage] Failed to create bucket '${bucketName}':`,
          createError.message
        );
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error("[Supabase Storage] Error checking bucket:", err);
    return false;
  }
}

/**
 * Uploads a file (Buffer, Blob, File, or ArrayBuffer) to Supabase Storage.
 */
export async function uploadFileToStorage(
  file: Blob | Buffer | ArrayBuffer | Uint8Array,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    bucket = DEFAULT_STORAGE_BUCKET,
    folder = "uploads",
    fileName = `asset-${Date.now()}`,
    contentType,
    upsert = true,
    useServiceRole = true,
  } = options;

  const client = useServiceRole ? supabaseAdmin : supabase;
  const cleanName = sanitizeFileName(fileName);
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const filePath = cleanFolder ? `${cleanFolder}/${cleanName}` : cleanName;

  const uploadOptions: {
    contentType?: string;
    upsert?: boolean;
  } = { upsert };

  if (contentType) {
    uploadOptions.contentType = contentType;
  }

  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, file, uploadOptions);

  if (error) {
    console.error(
      `[Supabase Storage] Upload error for path '${filePath}':`,
      error.message
    );
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  const { data: urlData } = client.storage.from(bucket).getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: urlData.publicUrl,
    bucket,
  };
}

/**
 * Retrieves the public URL for a given file path in a bucket.
 */
export function getStoragePublicUrl(
  path: string,
  bucket: string = DEFAULT_STORAGE_BUCKET
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Deletes a file from Supabase Storage.
 */
export async function deleteStorageFile(
  path: string,
  bucket: string = DEFAULT_STORAGE_BUCKET
): Promise<boolean> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`[Supabase Storage] Failed to delete '${path}':`, error.message);
    return false;
  }
  return true;
}

/**
 * Helper to upload project hero / cover images.
 */
export async function uploadProjectCoverImage(
  file: Blob | Buffer | ArrayBuffer,
  projectSlug: string,
  fileExtension: string = "webp"
): Promise<UploadResult> {
  const fileName = `cover-${Date.now()}.${fileExtension}`;
  return uploadFileToStorage(file, {
    bucket: DEFAULT_STORAGE_BUCKET,
    folder: `projects/${projectSlug}`,
    fileName,
    upsert: true,
  });
}

/**
 * Helper to upload project gallery media items.
 */
export async function uploadProjectGalleryImage(
  file: Blob | Buffer | ArrayBuffer,
  projectSlug: string,
  originalName: string
): Promise<UploadResult> {
  const fileName = `gallery-${Date.now()}-${sanitizeFileName(originalName)}`;
  return uploadFileToStorage(file, {
    bucket: DEFAULT_STORAGE_BUCKET,
    folder: `projects/${projectSlug}/gallery`,
    fileName,
    upsert: true,
  });
}

/**
 * Helper to upload blog post cover images.
 */
export async function uploadBlogPostCover(
  file: Blob | Buffer | ArrayBuffer,
  postSlug: string,
  fileExtension: string = "webp"
): Promise<UploadResult> {
  const fileName = `cover-${Date.now()}.${fileExtension}`;
  return uploadFileToStorage(file, {
    bucket: DEFAULT_STORAGE_BUCKET,
    folder: `posts/${postSlug}`,
    fileName,
    upsert: true,
  });
}

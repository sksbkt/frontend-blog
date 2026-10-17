import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gnayjkeovhtdzalpuhvh.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your-anon-key"
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";

// Client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with admin privileges (for protected API routes)
export function getServiceSupabase() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your-anon-key"
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : null);
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required on server');
  return createClient(supabaseUrl, serviceKey);
}

/**
 * Uploads a file to the Supabase "projects" bucket and returns its permanent public URL.
 */
export async function uploadProjectImage(file: File, path?: string): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${path || 'cover'}-${Date.now()}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  const adminClient = getServiceSupabase();
  const { error: uploadError } = await adminClient.storage
    .from('projects')
    .upload(filePath, file, {
      cacheControl: '1209600',
      upsert: true,
      contentType: file.type || 'image/png',
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = adminClient.storage.from('projects').getPublicUrl(filePath);
  return data.publicUrl;
}

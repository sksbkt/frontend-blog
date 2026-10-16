import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with admin privileges (for protected API routes)
export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required on server');
  return createClient(supabaseUrl, serviceKey);
}

/**
 * Uploads a file to the Supabase "projects" bucket and returns its permanent public URL.
 */
export async function uploadProjectImage(file: File, path?: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path || 'cover'}-${Date.now()}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('projects')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('projects').getPublicUrl(filePath);
  return data.publicUrl;
}

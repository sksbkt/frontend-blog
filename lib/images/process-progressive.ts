import sharp from 'sharp';
import { getServiceSupabase } from '@/lib/supabase';

export interface ProcessedTierResult {
  highResUrl: string;
  lowResUrl: string;
}

export async function processAndStoreDualTier(
  imageBuffer: Buffer,
  folder: 'covers' | 'github-og' | 'captures',
  baseName: string
): Promise<ProcessedTierResult> {
  const supabase = getServiceSupabase();

  // 1. High-Res: max width 1280px, WebP q80
  const highResBuffer = await sharp(imageBuffer)
    .resize(1280, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // 2. Low-Res Placeholder: width 32px, WebP q30 with blur
  const lowResBuffer = await sharp(imageBuffer)
    .resize(32, null, { withoutEnlargement: true })
    .webp({ quality: 30 })
    .blur(1.5)
    .toBuffer();

  const highPath = `${folder}/${baseName}-high.webp`;
  const lowPath = `${folder}/${baseName}-low.webp`;

  const { error: errHigh } = await supabase.storage
    .from('projects')
    .upload(highPath, highResBuffer, { contentType: 'image/webp', upsert: true });
  if (errHigh) throw errHigh;

  const { error: errLow } = await supabase.storage
    .from('projects')
    .upload(lowPath, lowResBuffer, { contentType: 'image/webp', upsert: true });
  if (errLow) throw errLow;

  const { data: highData } = supabase.storage.from('projects').getPublicUrl(highPath);
  const { data: lowData } = supabase.storage.from('projects').getPublicUrl(lowPath);

  return {
    highResUrl: highData.publicUrl,
    lowResUrl: lowData.publicUrl,
  };
}

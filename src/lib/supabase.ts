import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    !supabaseUrl.includes('placeholder')
  );
};

// Create a single supabase client for interacting with your database and storage
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Storage bucket names
export const BUCKET_PDFS = 'lectures-pdfs';
export const BUCKET_VIDEOS = 'lectures-videos';
export const BUCKET_THUMBNAILS = 'thumbnails';
export const BUCKET_FRENCH_AUDIO = 'french-audio';
export const BUCKET_THEME_ASSETS = 'theme-assets';

/**
 * Upload a custom character PNG/WebP to theme-assets bucket
 */
export async function uploadCustomCharacter(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  if (!isSupabaseConfigured()) {
    throw new Error('إعدادات Supabase غير متصلة. يرجى ضبط مفاتيح الربط في ملف .env.local');
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const filePath = `characters/${Date.now()}_${uniqueId}_${cleanFileName}`;

  onProgress?.(20);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_THEME_ASSETS)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  onProgress?.(80);
  const { data } = supabase.storage.from(BUCKET_THEME_ASSETS).getPublicUrl(filePath);
  onProgress?.(100);

  return {
    publicUrl: data.publicUrl,
    storagePath: `${BUCKET_THEME_ASSETS}/${filePath}`,
  };
}

/**
 * Upload a thumbnail image for a lecture bundle
 */
export async function uploadThumbnail(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  if (!isSupabaseConfigured()) {
    throw new Error('إعدادات Supabase غير متصلة. يرجى ضبط مفاتيح الربط في ملف .env.local');
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const filePath = `covers/${Date.now()}_${uniqueId}_${cleanFileName}`;

  onProgress?.(20);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_THUMBNAILS)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  onProgress?.(80);
  const { data } = supabase.storage.from(BUCKET_THUMBNAILS).getPublicUrl(filePath);
  onProgress?.(100);

  return {
    publicUrl: data.publicUrl,
    storagePath: `${BUCKET_THUMBNAILS}/${filePath}`,
  };
}

/**
 * Upload an announcement / news image to Supabase Storage
 */
export async function uploadNewsImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  if (!isSupabaseConfigured()) {
    throw new Error('إعدادات Supabase غير متصلة. يرجى ضبط مفاتيح الربط في ملف .env.local');
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const filePath = `news/${Date.now()}_${uniqueId}_${cleanFileName}`;

  onProgress?.(20);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_THUMBNAILS)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  onProgress?.(80);
  const { data } = supabase.storage.from(BUCKET_THUMBNAILS).getPublicUrl(filePath);
  onProgress?.(100);

  return {
    publicUrl: data.publicUrl,
    storagePath: `${BUCKET_THUMBNAILS}/${filePath}`,
  };
}

/**
 * Upload a French pronunciation audio file
 */
export async function uploadFrenchAudio(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  if (!isSupabaseConfigured()) {
    throw new Error('إعدادات Supabase غير متصلة. يرجى ضبط مفاتيح الربط في ملف .env.local');
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const filePath = `pronunciations/${Date.now()}_${uniqueId}_${cleanFileName}`;

  onProgress?.(20);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_FRENCH_AUDIO)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  onProgress?.(80);
  const { data } = supabase.storage.from(BUCKET_FRENCH_AUDIO).getPublicUrl(filePath);
  onProgress?.(100);

  return {
    publicUrl: data.publicUrl,
    storagePath: `${BUCKET_FRENCH_AUDIO}/${filePath}`,
  };
}

/**
 * Upload a file directly to Supabase Storage with unique filename
 */
export async function uploadMaterialFile(
  file: File,
  fileType: 'pdf' | 'video',
  year: number,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  if (!isSupabaseConfigured()) {
    throw new Error('إعدادات Supabase غير متصلة. يرجى ضبط مفاتيح الربط في ملف .env.local');
  }

  const bucket = fileType === 'pdf' ? BUCKET_PDFS : BUCKET_VIDEOS;
  
  // Clean file name and add unique timestamp prefix
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const filePath = `year-${year}/${Date.now()}_${uniqueId}_${cleanFileName}`;

  onProgress?.(15);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  onProgress?.(85);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  onProgress?.(100);

  return {
    publicUrl: data.publicUrl,
    storagePath: `${bucket}/${filePath}`,
  };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteStorageFile(storagePath: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !storagePath) return false;

  try {
    const parts = storagePath.split('/');
    if (parts.length < 2) return false;
    const bucket = parts[0];
    const path = parts.slice(1).join('/');

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.warn('Could not delete storage file:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Storage delete exception:', err);
    return false;
  }
}

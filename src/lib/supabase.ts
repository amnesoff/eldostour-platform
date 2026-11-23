import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { uploadToCloudStorage } from '@/lib/cloudUpload';

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

// Create a client for read-only public queries
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

// Storage bucket constants (kept for reference)
export const BUCKET_PDFS = 'lectures-pdfs';
export const BUCKET_VIDEOS = 'lectures-videos';
export const BUCKET_THUMBNAILS = 'thumbnails';
export const BUCKET_FRENCH_AUDIO = 'french-audio';
export const BUCKET_THEME_ASSETS = 'theme-assets';

/**
 * Upload a custom character to Cloudinary Storage
 */
export async function uploadCustomCharacter(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const url = await uploadToCloudStorage(file, 'theme-assets', onProgress);
  return { publicUrl: url, storagePath: url };
}

/**
 * Upload a thumbnail image to Cloudinary Storage
 */
export async function uploadThumbnail(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const url = await uploadToCloudStorage(file, 'thumbnails', onProgress);
  return { publicUrl: url, storagePath: url };
}

/**
 * Upload an announcement / news image to Cloudinary Storage
 */
export async function uploadNewsImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const url = await uploadToCloudStorage(file, 'news', onProgress);
  return { publicUrl: url, storagePath: url };
}

/**
 * Upload a French pronunciation audio file to Cloudinary Storage
 */
export async function uploadFrenchAudio(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const url = await uploadToCloudStorage(file, 'french-audio', onProgress);
  return { publicUrl: url, storagePath: url };
}

/**
 * Upload a material file (PDF or video) exclusively to Cloudinary
 */
export async function uploadMaterialFile(
  file: File,
  fileType: 'pdf' | 'video',
  year: number,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const url = await uploadToCloudStorage(file, `year-${year}/${fileType}s`, onProgress);
  return { publicUrl: url, storagePath: url };
}

/**
 * Upload a Subject Cover Image (Thumbnail) to Cloudinary
 */
export async function uploadSubjectCoverImage(
  file: File,
  year: number,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string }> {
  const url = await uploadToCloudStorage(file, `year-${year}/covers`, onProgress);
  return { publicUrl: url, storagePath: url };
}

/**
 * Upload a Subject Animated Preview Video to Cloudinary
 */
export async function uploadSubjectPreviewVideo(
  file: File,
  year: number,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; storagePath: string }> {
  const url = await uploadToCloudStorage(file, `year-${year}/previews`, onProgress);
  return { publicUrl: url, storagePath: url };
}

/**
 * Delete a file (Cloudinary asset URL reference)
 */
export async function deleteStorageFile(storagePath: string): Promise<boolean> {
  return true;
}

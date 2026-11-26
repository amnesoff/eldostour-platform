/**
 * Cloudinary Storage Lockdown Utility
 * منصة الدستور التعليمية (Al-Dustour Platform)
 * 
 * Strict file type validation (jpg, png, webp, pdf, mp4 only)
 * Strict size limits (Images: 10MB, PDFs: 50MB, Videos: 100MB)
 * Uploads exclusively to Cloudinary (cloud_name: "wn9a8xca", upload_preset: "immt8szg")
 */

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'wn9a8xca';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'immt8szg';

export interface CloudUploadOptions {
  folder?: string;
  onProgress?: (progressPercent: number) => void;
  tags?: string[];
}

// Permissive Media Allowlist (supports .jfif, .gif, .avif, .svg, .mov, .mkv, .webm, etc.)
const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico', 'heic', 'heif', 'tif', 'tiff',
]);
const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', '3gp', 'ogv', 'flv', 'wmv', 'mpeg', 'mpg',
]);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac']);
const BLOCKED_EXTENSIONS = new Set(['exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'mjs', 'cjs', 'php', 'asp', 'aspx', 'jsp', 'html', 'htm']);

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PDF_SIZE = 50 * 1024 * 1024;   // 50MB
const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150MB

/**
 * Validates file type permissively across all image, video, audio, and PDF formats
 */
export function validateUploadFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'لم يتم تحديد أي ملف للرفع.' };
  }

  const parts = file.name.split('.');
  const ext = (parts.length > 1 ? parts.pop() : '')?.toLowerCase() || '';
  const mime = (file.type || '').toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `نوع الملف (.${ext}) غير مسموح به لأسباب أمنية.`,
    };
  }

  const isImage = mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext);
  const isVideo = mime.startsWith('video/') || VIDEO_EXTENSIONS.has(ext);
  const isAudio = mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(ext);
  const isPdf = mime === 'application/pdf' || ext === 'pdf';

  if (!isImage && !isVideo && !isAudio && !isPdf) {
    return {
      isValid: false,
      error: `صيغة الملف (.${ext || mime || 'غير معروفة'}) غير مدعومة. يرجى اختيار صورة أو فيديو أو ملف PDF.`,
    };
  }

  // Validate File Size
  if (isPdf) {
    if (file.size > MAX_PDF_SIZE) {
      return { isValid: false, error: 'حجم ملف PDF يتجاوز الحد الأقصى المسموح به (50 ميجابايت).' };
    }
  } else if (isVideo) {
    if (file.size > MAX_VIDEO_SIZE) {
      return { isValid: false, error: 'حجم ملف الفيديو يتجاوز الحد الأقصى المسموح به (150 ميجابايت).' };
    }
  } else {
    if (file.size > MAX_IMAGE_SIZE) {
      return { isValid: false, error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (20 ميجابايت).' };
    }
  }

  return { isValid: true };
}

/**
 * Upload an image, PDF, or video file exclusively to Cloudinary
 *
 * @param file - The HTML5 File to upload
 * @param folder - Destination folder (e.g. 'materials', 'avatars', 'stories')
 * @param onProgress - Optional upload progress callback
 * @returns The secure HTTPS URL of the uploaded asset
 */
export async function uploadToCloudStorage(
  file: File,
  folder: string = 'general',
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  // 1. Strict Validation
  const validation = validateUploadFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  onProgress?.(15);

  const cloudName = CLOUDINARY_CLOUD_NAME.trim();
  const preset = CLOUDINARY_UPLOAD_PRESET.trim();
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  if (folder) {
    formData.append('folder', `eldostour/${folder}`);
  }

  onProgress?.(40);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  onProgress?.(80);

  if (!response.ok) {
    const errText = await response.text();
    console.error('[Cloudinary Upload Error]', response.status, errText);
    let parsedMsg = '';
    try {
      const errJson = JSON.parse(errText);
      parsedMsg = errJson?.error?.message || '';
    } catch {
      parsedMsg = errText;
    }
    throw new Error(
      parsedMsg
        ? `فشل رفع الملف (${response.status}): ${parsedMsg}`
        : `فشل رفع الملف إلى التخزين السحابي (كود ${response.status}). يرجى مراجعة الاتصال وإعادة المحاولة.`
    );
  }

  const result = await response.json();
  if (!result.secure_url) {
    throw new Error('لم يتم استلام رابط التخزين الآمن من الخادم.');
  }

  onProgress?.(100);
  return result.secure_url;
}

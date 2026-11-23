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

// Strict Allowed Extensions and MIME types
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'mp4']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 50 * 1024 * 1024;   // 50MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Validates file type and size to prevent script injection and malicious uploads
 */
export function validateUploadFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'لم يتم تحديد أي ملف للرفع.' };
  }

  // 1. Validate File Extension
  const parts = file.name.split('.');
  const ext = (parts.length > 1 ? parts.pop() : '')?.toLowerCase() || '';

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `نوع الملف (.${ext}) غير مصرح به أمنياً. يُسمح فقط بالصور (JPG, PNG, WEBP) ومستندات (PDF) وفيديوهات (MP4).`,
    };
  }

  // 2. Validate MIME Type
  const mime = file.type.toLowerCase();
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    return {
      isValid: false,
      error: 'نوع محتوى الملف (MIME Type) غير مطابق للمواصفات الأمنية المصرح بها.',
    };
  }

  // 3. Validate File Size
  if (ext === 'pdf' || mime === 'application/pdf') {
    if (file.size > MAX_PDF_SIZE) {
      return { isValid: false, error: 'حجم ملف PDF يتجاوز الحد الأقصى المسموح به (50 ميجابايت).' };
    }
  } else if (ext === 'mp4' || mime === 'video/mp4') {
    if (file.size > MAX_VIDEO_SIZE) {
      return { isValid: false, error: 'حجم ملف الفيديو يتجاوز الحد الأقصى المسموح به (100 ميجابايت).' };
    }
  } else {
    // Images
    if (file.size > MAX_IMAGE_SIZE) {
      return { isValid: false, error: 'حجم الصورة يتجاوز الحد الأقصى المسموح به (10 ميجابايت).' };
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
    throw new Error('فشل رفع الملف إلى التخزين السحابي الآمن. يرجى مراجعة الاتصال وإعادة المحاولة.');
  }

  const result = await response.json();
  if (!result.secure_url) {
    throw new Error('لم يتم استلام رابط التخزين الآمن من الخادم.');
  }

  onProgress?.(100);
  return result.secure_url;
}

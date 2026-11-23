import { supabase } from '@/lib/supabase';

/**
 * Standard SHA-256 hashing using Web Crypto API
 */
export async function hashSha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Secure client/server password hashing using Web Crypto API SHA-256 with platform salt
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_eldostour_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a student name contains reserved / impersonation words
 */
export function isReservedName(name: string): boolean {
  const reservedWords = [
    'المؤسس',
    'مؤسس',
    'ادمن',
    'أدمن',
    'admin',
    'founder',
    'مدير',
    'الدستور',
    'test',
    'hacker',
    'mazen',
    'مازن',
    'rahma',
    'رحمة',
    'walid',
    'وليد',
  ];

  const clean = name.toLowerCase().trim();
  return reservedWords.some((w) => clean.includes(w));
}

/**
 * Normalize Arabic text for duplicate detection (removes diacritics, unifies alef, taa marbuta)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/diacritics
    .replace(/[أإآٱ]/g, 'ا') // Unify alefs
    .replace(/ة/g, 'ه') // Unify taa marbuta
    .replace(/ى/g, 'ي') // Unify yaa
    .replace(/ـ/g, '') // Remove tatweel
    .replace(/\s+/g, ' '); // Collapse spaces
}

/**
 * Validate Vault Password 1 (Strictly digits only, 4 to 12 digits)
 */
export function validateVaultNumericPassword(pwd: string): { isValid: boolean; error?: string } {
  const trimmed = pwd.trim();
  if (!/^[0-9]{4,12}$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'باسورد الأرقام يجب أن يتكون من 4 إلى 12 رقماً فقط بدون أي حروف أو مسافات',
    };
  }
  return { isValid: true };
}

/**
 * Validate Vault Password 2 (Letters + Special Symbols, min 6 chars)
 */
export function validateVaultComplexPassword(pwd: string): { isValid: boolean; error?: string } {
  const trimmed = pwd.trim();
  if (!/^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{6,}$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'باسورد الحروف والرموز يجب أن يحتوي على حروف ورموز خاصة (!@#$%...) ولا يقل عن 6 خانات',
    };
  }
  return { isValid: true };
}

/**
 * Log admin security events to public.admin_security_logs
 */
export async function logAdminSecurityEvent(
  eventType: string,
  username = '',
  details = ''
): Promise<void> {
  try {
    await supabase.from('admin_security_logs').insert({
      event_type: eventType,
      username: username || 'System',
      details,
    });
  } catch (err) {
    console.warn('Could not record admin security log:', err);
  }
}

/**
 * Validate Egyptian Mobile Phone Number
 * Strictly must start with 010, 011, 012, or 015 and have exactly 11 digits
 * Rejects repetitive or fake sequences
 */
export function validateEgyptianPhone(phone: string): { isValid: boolean; error?: string } {
  const cleanPhone = phone.trim().replace(/[\s-]/g, '');

  if (!cleanPhone) {
    return { isValid: false, error: 'يرجى إدخال رقم الهاتف المحمول' };
  }

  // Regex: 01 followed by 0, 1, 2, or 5, then exactly 8 digits = 11 digits total
  const regex = /^01[0125][0-9]{8}$/;
  if (!regex.test(cleanPhone)) {
    return {
      isValid: false,
      error: 'يجب أن يبدأ رقم الهاتف بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً صحيحاً',
    };
  }

  // Reject repetitive/fake sequences (e.g., 01000000000, 01111111111, 01222222222, 01555555555)
  const last8Digits = cleanPhone.slice(3);
  if (/^(\d)\1{7}$/.test(last8Digits)) {
    return { isValid: false, error: 'الرجاء إدخال رقم هاتف محمول حقيقي غير مكرر الأرقام' };
  }

  // Reject sequential fake digits
  if (
    cleanPhone === '01234567890' ||
    cleanPhone === '01234567891' ||
    cleanPhone === '01012345678' ||
    cleanPhone === '01112345678' ||
    cleanPhone === '01212345678'
  ) {
    return { isValid: false, error: 'الرجاء إدخال رقم هاتف شخصي حقيقي' };
  }

  return { isValid: true };
}

/**
 * Validate Student Full Name (at least 2 words)
 */
export function validateStudentName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length < 2) {
    return { isValid: false, error: 'يرجى كتابة الاسم ثنائياً أو ثلاثياً على الأقل' };
  }

  if (trimmed.length < 5) {
    return { isValid: false, error: 'الاسم المدخل قصير جداً، يرجى كتابة اسمك الحقيقي' };
  }

  return { isValid: true };
}

/**
 * Generate sequential Student ID starting from 1001 (e.g., DST-1001, DST-1002...)
 */
export function generateSequentialStudentCode(orderNumber = 1001): string {
  const codeNum = Math.max(1001, orderNumber);
  return `DST-${codeNum}`;
}

/**
 * Generate sequential Guest ID (e.g. G-101, G-102...)
 */
export function generateGuestCode(orderNumber = 101): string {
  const codeNum = Math.max(101, orderNumber);
  return `G-${codeNum}`;
}

/**
 * Fallback student code generator
 */
export function generateStudentCode(): string {
  return generateSequentialStudentCode(Math.floor(1001 + Math.random() * 900));
}

/**
 * Client-side profile image compressor for zero-dependency instant avatars
 */
export function compressImageFile(file: File, maxDim = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

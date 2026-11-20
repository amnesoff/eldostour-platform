import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a created_at ISO string is within the specified hours (default 72h / 3 days)
 */
export function isNewItem(createdAt: string, hours = 72): boolean {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const diffInMs = now - createdTime;
  const maxDiffMs = hours * 60 * 60 * 1000;
  return diffInMs >= 0 && diffInMs <= maxDiffMs;
}

/**
 * Formats bytes to readable Arabic KB/MB string
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] || ''}`;
}

/**
 * Formats ISO date into a localized Arabic string
 */
export function formatDateArabic(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Calculates remaining time components
 */
export function calculateTimeRemaining(targetIso: string) {
  const total = Date.parse(targetIso) - Date.now();
  if (total <= 0 || isNaN(total)) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds, isPast: false };
}

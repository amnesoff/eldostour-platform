import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { StudentAuthProvider } from '@/context/StudentAuthContext';
import { StudentAuthModal } from '@/components/auth/StudentAuthModal';
import { StudentIdFloatingButton } from '@/components/tools/StudentIdFloatingButton';
import { PrivacyBanner } from '@/components/legal/PrivacyBanner';
import { PlatformLockEnforcer } from '@/components/emergency/PlatformLockEnforcer';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'منصة الدستور التعليمية | المنصة الأكاديمية المستقلة للعلوم القانونية',
  description: 'البوابة الأكاديمية المستقلة الشاملة لطلاب القانون والعلوم الحقوقية - محاضرات، ملخصات واختبارات تفاعلية للفرق الدراسية الأربعة',
  keywords: [
    'العلوم القانونية',
    'منصة الدستور',
    'منصة الدستور التعليمية',
    'محاضرات قانونية',
    'ملخصات قانونية',
    'الفرقة الأولى',
    'الفرقة الثانية',
    'الفرقة الثالثة',
    'الفرقة الرابعة',
  ],
  authors: [
    { name: 'مازن شكري' },
    { name: 'رحمة علاء' },
    { name: 'وليد محرم' },
    { name: 'جواد' },
    { name: 'ندى زيد' },
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0B132B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-[#070c18] text-slate-900 dark:text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-300 overflow-x-hidden">
        <ThemeProvider>
          <StudentAuthProvider>
            <PlatformLockEnforcer />
            {children}
            <StudentAuthModal />
            <StudentIdFloatingButton />
            <PrivacyBanner />
          </StudentAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

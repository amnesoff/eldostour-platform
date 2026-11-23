import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

// Disable Next.js static caching for instant cloud sync
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'لوحة التحكم | منصة الدستور التعليمية',
  description: 'لوحة تحكم المشرفين لمنصة الدستور التعليمية',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminDashboardClient isDirectAdminRoute={true} />;
}

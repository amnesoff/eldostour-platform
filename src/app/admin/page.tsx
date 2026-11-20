import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'لوحة التحكم المركزية | منصة الدستور التعليمية',
  description: 'لوحة تحكم المشرفين لمنصة الدستور التعليمية - كلية الحقوق جامعة مدينة السادات',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}

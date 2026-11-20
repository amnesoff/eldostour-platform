import StudentPortalClient from '@/components/home/StudentPortalClient';

// Disable Next.js static caching for instant cloud sync
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return <StudentPortalClient />;
}

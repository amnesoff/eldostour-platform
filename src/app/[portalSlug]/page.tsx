import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PortalPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SecretPortalPage({ params, searchParams }: PortalPageProps) {
  const { portalSlug } = await params;
  const sParams = await searchParams;
  const keyParam = typeof sParams.key === 'string' ? sParams.key.trim() : '';

  // Fetch configured secret portal slugs & keys from admin_security
  const { data: secRow } = await supabaseAdmin
    .from('admin_security')
    .select('super_admin_slug, super_admin_key, staff_portal_slug, staff_portal_key')
    .eq('id', 'primary')
    .maybeSingle();

  const superSlug = secRow?.super_admin_slug || 'command-mazen';
  const superKey = secRow?.super_admin_key || 'dustour2006';
  const staffSlug = secRow?.staff_portal_slug || 'staff-portal';
  const staffKey = secRow?.staff_portal_key || 'team2026';

  let gateType: 'super_admin' | 'staff' | null = null;

  if (portalSlug === superSlug && keyParam === superKey) {
    gateType = 'super_admin';
  } else if (portalSlug === staffSlug && keyParam === staffKey) {
    gateType = 'staff';
  } else {
    // Slug or key invalid -> standard 404
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminDashboardClient gateType={gateType} isDirectAdminRoute={false} />
    </Suspense>
  );
}

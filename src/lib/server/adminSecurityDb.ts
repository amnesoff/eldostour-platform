import { supabaseAdmin } from './supabaseAdmin';

export interface AdminSecurityRow {
  id: number;
  admin_username?: string;
  password_hash?: string;
  pin_hash?: string;
  session_version?: number;
  manual_approval_enabled?: boolean;
  registration_paused?: boolean;
  platform_lockdown?: boolean;
  vault_enabled?: boolean;
  vault_numeric_hash?: string;
  vault_complex_hash?: string;
  recovery_code_hashes?: string[];
  super_admin_slug?: string;
  super_admin_key?: string;
  staff_portal_slug?: string;
  staff_portal_key?: string;
  staff_visible_tabs?: Record<string, boolean>;
  updated_at?: string;
}

/**
 * Fetches the existing row (or first row) from admin_security.
 * Since the primary key id is an integer (e.g. 1), we fetch via .limit(1).maybeSingle().
 */
export async function getAdminSecurityRow(): Promise<AdminSecurityRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_security')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as AdminSecurityRow;
    }
  } catch (err) {
    console.warn('[adminSecurityDb] Could not query admin_security:', err);
  }
  return null;
}

/**
 * Updates the existing admin_security row by numeric id, or creates one with id: 1 if empty.
 */
export async function updateAdminSecurityRow(
  updates: Partial<Omit<AdminSecurityRow, 'id'>>
): Promise<{ data: AdminSecurityRow | null; error: any }> {
  const existing = await getAdminSecurityRow();
  const targetId = existing?.id !== undefined && existing?.id !== null ? Number(existing.id) : 1;

  // Filter out any unknown keys that might cause PostgREST errors
  const allowedKeys = new Set([
    'admin_username',
    'password_hash',
    'pin_hash',
    'session_version',
    'manual_approval_enabled',
    'registration_paused',
    'platform_lockdown',
    'vault_enabled',
    'vault_numeric_hash',
    'vault_complex_hash',
    'recovery_code_hashes',
    'super_admin_slug',
    'super_admin_key',
    'staff_portal_slug',
    'staff_portal_key',
    'staff_visible_tabs',
    'updated_at',
  ]);

  const cleanUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  for (const [k, v] of Object.entries(updates)) {
    if (allowedKeys.has(k) && v !== undefined) {
      cleanUpdates[k] = v;
    }
  }

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('admin_security')
      .update(cleanUpdates)
      .eq('id', targetId)
      .select()
      .maybeSingle();

    return { data: data as AdminSecurityRow | null, error };
  } else {
    const { data, error } = await supabaseAdmin
      .from('admin_security')
      .upsert({
        id: targetId,
        admin_username: 'Dr. Mazen 2006',
        vault_enabled: true,
        session_version: 1,
        manual_approval_enabled: false,
        registration_paused: false,
        platform_lockdown: false,
        super_admin_slug: 'command-mazen',
        staff_portal_slug: 'staff-portal',
        ...cleanUpdates,
      })
      .select()
      .maybeSingle();

    return { data: data as AdminSecurityRow | null, error };
  }
}

/**
 * Mirrors emergency switches into site_settings using its actual primary key 'key'
 * and the specific columns 'registration_paused', 'maintenance_mode', 'platform_locked', 'require_student_approval'
 */
export async function syncEmergencySwitchesToSiteSettings(switches: {
  registration_paused: boolean;
  platform_locked: boolean;
  require_student_approval: boolean;
}) {
  try {
    // 1. Update/upsert the 'emergency_switches' key
    await supabaseAdmin.from('site_settings').upsert({
      key: 'emergency_switches',
      value: {
        registration_paused: switches.registration_paused,
        platform_locked: switches.platform_locked,
        maintenance_mode: switches.platform_locked,
        platform_lockdown: switches.platform_locked,
        require_student_approval: switches.require_student_approval,
        manual_approval_enabled: switches.require_student_approval,
        updated_at: new Date().toISOString(),
      },
      registration_paused: switches.registration_paused,
      maintenance_mode: switches.platform_locked,
      platform_locked: switches.platform_locked,
      require_student_approval: switches.require_student_approval,
      updated_at: new Date().toISOString(),
    });

    // 2. Also update 'general' key columns if present so components reading general get instant sync
    await supabaseAdmin
      .from('site_settings')
      .update({
        registration_paused: switches.registration_paused,
        maintenance_mode: switches.platform_locked,
        platform_locked: switches.platform_locked,
        require_student_approval: switches.require_student_approval,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'general');
  } catch (err) {
    console.warn('[adminSecurityDb] Could not mirror switches to site_settings:', err);
  }
}

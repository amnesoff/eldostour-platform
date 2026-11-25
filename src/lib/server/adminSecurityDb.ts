import { supabaseAdmin } from './supabaseAdmin';
import { DEFAULT_GRANULAR_PERMISSIONS, DEFAULT_SUPERVISOR_WHATSAPP_LIST } from '@/lib/constants';
import { GranularPermissions, SupervisorWhatsAppEntry } from '@/types';

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
  staff_visible_tabs?: Record<string, any>;
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

/**
 * Retrieve granular permissions map for all sub-admins stored safely in admin_security.staff_visible_tabs._granular_by_user
 */
export async function getAllGranularPermissionsMap(): Promise<Record<string, GranularPermissions>> {
  const row = await getAdminSecurityRow();
  const raw = row?.staff_visible_tabs?._granular_by_user;
  if (raw && typeof raw === 'object') {
    return raw as Record<string, GranularPermissions>;
  }
  return {};
}

export async function getSupervisorGranularPermissions(
  username: string,
  legacySubAdmin?: any
): Promise<GranularPermissions> {
  const map = await getAllGranularPermissionsMap();
  const key = username.trim().toLowerCase();
  const found = Object.entries(map).find(([k]) => k.toLowerCase() === key)?.[1];
  if (found) return found;

  if (legacySubAdmin?.granular_permissions) {
    return legacySubAdmin.granular_permissions as GranularPermissions;
  }

  // Fallback to legacy booleans if granular not yet configured
  return {
    ...DEFAULT_GRANULAR_PERMISSIONS,
    materials: {
      view: legacySubAdmin?.can_manage_content !== false,
      add: Boolean(legacySubAdmin?.can_manage_content ?? true),
      edit: Boolean(legacySubAdmin?.can_manage_content ?? true),
      delete: Boolean(legacySubAdmin?.can_delete_content),
      bundles: Boolean(legacySubAdmin?.can_manage_content ?? true),
    },
    quizzes: {
      view: legacySubAdmin?.can_manage_content !== false,
      create: Boolean(legacySubAdmin?.can_manage_content ?? true),
      edit: Boolean(legacySubAdmin?.can_manage_content ?? true),
      delete: Boolean(legacySubAdmin?.can_delete_content),
      results: true,
    },
    stories: {
      view: legacySubAdmin?.can_manage_content !== false,
      add: Boolean(legacySubAdmin?.can_manage_content ?? true),
      edit: Boolean(legacySubAdmin?.can_manage_content ?? true),
      delete: Boolean(legacySubAdmin?.can_delete_content),
    },
    students: {
      view: Boolean(legacySubAdmin?.can_manage_students),
      approve: Boolean(legacySubAdmin?.can_manage_students),
      edit_password: Boolean(legacySubAdmin?.can_manage_students),
      delete_ban: Boolean(legacySubAdmin?.can_manage_students && legacySubAdmin?.can_delete_content),
    },
    security_backups: {
      view: false,
      manage_security: false,
      download_backup: false,
    },
  };
}

export async function saveSupervisorGranularPermissions(
  username: string,
  perms: GranularPermissions
) {
  const row = await getAdminSecurityRow();
  const currentTabs = { ...(row?.staff_visible_tabs || {}) };
  const byUser = { ...(currentTabs._granular_by_user || {}) };
  byUser[username.trim()] = perms;
  currentTabs._granular_by_user = byUser;

  await updateAdminSecurityRow({ staff_visible_tabs: currentTabs });

  // Also try updating admin_users.granular_permissions if column exists
  try {
    await supabaseAdmin
      .from('admin_users')
      .update({ granular_permissions: perms })
      .ilike('username', username.trim());
  } catch {
    // Column may not exist yet; stored safely in admin_security
  }
}

/**
 * Store and retrieve student plain passwords in admin-only fallback store
 * when public.students.plain_password column is not yet migrated.
 */
export async function getStudentPlainPasswordsMap(): Promise<Record<string, string>> {
  const row = await getAdminSecurityRow();
  const map = row?.staff_visible_tabs?._student_passwords;
  return map && typeof map === 'object' ? (map as Record<string, string>) : {};
}

export async function saveStudentPlainPassword(studentId: string, plainPassword: string) {
  if (!studentId || !plainPassword) return;
  try {
    const row = await getAdminSecurityRow();
    const currentTabs = { ...(row?.staff_visible_tabs || {}) };
    const pwdMap = { ...(currentTabs._student_passwords || {}) };
    pwdMap[studentId] = plainPassword;
    currentTabs._student_passwords = pwdMap;
    await updateAdminSecurityRow({ staff_visible_tabs: currentTabs });
  } catch (err) {
    console.warn('[adminSecurityDb] Could not save student plain password fallback:', err);
  }
}

/**
 * Supervisor WhatsApp Round-Robin Rotation
 */
export async function getSupervisorWhatsAppList(): Promise<SupervisorWhatsAppEntry[]> {
  const row = await getAdminSecurityRow();
  const list = row?.staff_visible_tabs?._whatsapp_supervisors;
  if (Array.isArray(list) && list.length > 0) {
    return list as SupervisorWhatsAppEntry[];
  }
  return DEFAULT_SUPERVISOR_WHATSAPP_LIST;
}

export async function saveSupervisorWhatsAppList(list: SupervisorWhatsAppEntry[]) {
  const row = await getAdminSecurityRow();
  const currentTabs = { ...(row?.staff_visible_tabs || {}) };
  currentTabs._whatsapp_supervisors = list;
  await updateAdminSecurityRow({ staff_visible_tabs: currentTabs });
}

export async function getNextRoundRobinWhatsApp(): Promise<SupervisorWhatsAppEntry> {
  try {
    const row = await getAdminSecurityRow();
    const currentTabs = { ...(row?.staff_visible_tabs || {}) };
    const list: SupervisorWhatsAppEntry[] =
      Array.isArray(currentTabs._whatsapp_supervisors) && currentTabs._whatsapp_supervisors.length > 0
        ? currentTabs._whatsapp_supervisors
        : DEFAULT_SUPERVISOR_WHATSAPP_LIST;

    const activeList = list.filter(
      (item) => item.enabled !== false && item.phone && item.phone.replace(/\D/g, '').length >= 10
    );

    const pool = activeList.length > 0 ? activeList : [DEFAULT_SUPERVISOR_WHATSAPP_LIST[0]];
    const currentIndex = Number(currentTabs._whatsapp_rr_index) || 0;
    const selected = pool[currentIndex % pool.length];
    const nextIndex = (currentIndex + 1) % pool.length;

    currentTabs._whatsapp_rr_index = nextIndex;
    await updateAdminSecurityRow({ staff_visible_tabs: currentTabs });

    return {
      ...selected,
      phone: selected.phone.replace(/\D/g, ''),
    };
  } catch {
    return DEFAULT_SUPERVISOR_WHATSAPP_LIST[0];
  }
}

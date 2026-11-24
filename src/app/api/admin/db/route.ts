import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import {
  getClientIp,
  sanitizeInput,
  stripSensitiveFields,
  verifyToken,
  generateRandomSalt,
  hashPasswordWithSalt,
  UNIFIED_RESET_PASSWORD,
} from '@/lib/server/security';
import { AdminSession } from '@/types';
import {
  getAdminSecurityRow,
  updateAdminSecurityRow,
  syncEmergencySwitchesToSiteSettings,
} from '@/lib/server/adminSecurityDb';

function hashSha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Robust helper to authenticate admin from cookies, bearer tokens, or custom headers
export async function authenticateAdmin(req: NextRequest): Promise<AdminSession | null> {
  const candidateValues: string[] = [];

  // 1. Direct known cookie names (supporting v2 signed cookie and admin login sessions)
  const cookieNames = [
    'eldostour_admin_token',
    'v2_admin_token',
    'eldostour_v2_admin',
    'eldostour_admin_session',
    'admin_token',
    'admin_session',
  ];

  for (const name of cookieNames) {
    const val = req.cookies.get(name)?.value;
    if (val && !candidateValues.includes(val)) {
      candidateValues.push(val);
    }
  }

  // Also scan all incoming cookies for any admin or v2 session cookie
  for (const c of req.cookies.getAll()) {
    if (
      !candidateValues.includes(c.value) &&
      (c.name.toLowerCase().includes('admin') || c.name.toLowerCase().includes('v2'))
    ) {
      candidateValues.push(c.value);
    }
  }

  // 2. Authorization and Custom Session Headers
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && !candidateValues.includes(bearer)) candidateValues.push(bearer);
  }

  const xAdminToken = req.headers.get('x-admin-token');
  if (xAdminToken && !candidateValues.includes(xAdminToken.trim())) {
    candidateValues.push(xAdminToken.trim());
  }

  const xAdminSession = req.headers.get('x-admin-session');
  if (xAdminSession && !candidateValues.includes(xAdminSession.trim())) {
    candidateValues.push(xAdminSession.trim());
  }

  if (candidateValues.length === 0) return null;

  // Retrieve primary admin record to verify session version & super admin username
  let secRow: any = null;
  try {
    secRow = await getAdminSecurityRow();
  } catch (err) {
    console.warn('Could not read admin_security during admin auth:', err);
  }

  const defaultSuperUsername = secRow?.admin_username || 'Dr. Mazen 2006';

  for (const raw of candidateValues) {
    if (!raw) continue;
    let decodedStr = raw;
    try {
      decodedStr = decodeURIComponent(raw);
    } catch {
      decodedStr = raw;
    }

    // A) Try verifying as signed HMAC-SHA256 Token (v2 or standard admin token)
    const tokenPayload = verifyToken<any>(raw) || verifyToken<any>(decodedStr);
    if (tokenPayload) {
      const isSuper =
        Boolean(tokenPayload.is_super_admin) ||
        tokenPayload.role === 'super_admin' ||
        (typeof tokenPayload.username === 'string' &&
          tokenPayload.username.toLowerCase() === defaultSuperUsername.toLowerCase());

      const isAdmin =
        isSuper ||
        tokenPayload.role === 'admin' ||
        Boolean(tokenPayload.permissions?.can_manage_students) ||
        Boolean(tokenPayload.permissions?.can_manage_content);

      if (isAdmin) {
        // Enforce session version invalidation for Super Admin
        if (
          isSuper &&
          secRow?.session_version &&
          tokenPayload.session_version &&
          secRow.session_version > tokenPayload.session_version
        ) {
          // Token session has been revoked by emergency panic
          continue;
        }

        return {
          username: tokenPayload.username || defaultSuperUsername,
          is_super_admin: isSuper,
          session_version: tokenPayload.session_version || secRow?.session_version || 1,
          permissions: tokenPayload.permissions || {
            can_manage_students: true,
            can_manage_content: true,
            can_delete_content: true,
            can_access_student_vault: true,
          },
        };
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error: 'غير مصرح: يجب تسجيل الدخول كمسؤول أولاً. لم يتم العثور على جلسة أدمن صالحة.',
        unauthorized: true,
      },
      { status: 401 }
    );
  }

  const ip = getClientIp(req);

  try {
    const body = await req.json();
    const action = body.action;

    // -------------------------------------------------------------
    // 1. GET SECURITY CONFIG (Safe for display in SecurityCenter)
    // -------------------------------------------------------------
    if (action === 'get_security_data') {
      let secRow = await getAdminSecurityRow();

      // If admin_security row does not exist, check site_settings or upsert defaults
      if (!secRow) {
        const { data: siteSwitches } = await supabaseAdmin
          .from('site_settings')
          .select('value, registration_paused, maintenance_mode, platform_locked, require_student_approval')
          .eq('key', 'emergency_switches')
          .maybeSingle();

        const defaultSettings = {
          admin_username: 'Dr. Mazen 2006',
          vault_enabled: true,
          session_version: 1,
          manual_approval_enabled: Boolean(
            siteSwitches?.value?.manual_approval_enabled ?? siteSwitches?.require_student_approval
          ),
          registration_paused: Boolean(
            siteSwitches?.value?.registration_paused ?? siteSwitches?.registration_paused
          ),
          platform_lockdown: Boolean(
            siteSwitches?.value?.platform_locked ??
              siteSwitches?.value?.platform_lockdown ??
              siteSwitches?.value?.maintenance_mode ??
              siteSwitches?.platform_locked ??
              siteSwitches?.maintenance_mode
          ),
          super_admin_slug: 'command-mazen',
          staff_portal_slug: 'staff-portal',
          staff_visible_tabs: {
            materials: true,
            quizzes: true,
            covers: true,
            students: false,
            vault: false,
            security: false,
            settings: false,
          },
          updated_at: new Date().toISOString(),
        };

        const { data: createdSec } = await updateAdminSecurityRow(defaultSettings);
        secRow = createdSec || ({ id: 1, ...defaultSettings } as any);
      }

      const { data: subAdmins } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: logs } = await supabaseAdmin
        .from('admin_security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // Strip sensitive hashes before returning and include convenient alias keys
      const safeSecRow = secRow
        ? {
            id: secRow.id,
            admin_username: secRow.admin_username,
            vault_enabled: Boolean(secRow.vault_enabled),
            has_vault_passwords: Boolean(secRow.vault_numeric_hash && secRow.vault_complex_hash),
            session_version: secRow.session_version || 1,
            manual_approval_enabled: Boolean(secRow.manual_approval_enabled),
            require_student_approval: Boolean(secRow.manual_approval_enabled),
            super_admin_slug: secRow.super_admin_slug || 'command-mazen',
            staff_portal_slug: secRow.staff_portal_slug || 'staff-portal',
            whatsapp_approval_number: '201122144007',
            staff_visible_tabs: secRow.staff_visible_tabs,
            registration_paused: Boolean(secRow.registration_paused),
            platform_lockdown: Boolean(secRow.platform_lockdown),
            platform_locked: Boolean(secRow.platform_lockdown),
            maintenance_mode: Boolean(secRow.platform_lockdown),
            has_recovery_codes:
              Array.isArray(secRow.recovery_code_hashes) && secRow.recovery_code_hashes.length > 0,
            remaining_recovery_codes_count: Array.isArray(secRow.recovery_code_hashes)
              ? secRow.recovery_code_hashes.length
              : 0,
            updated_at: secRow.updated_at,
          }
        : null;

      const safeSubAdmins = (subAdmins || []).map((sa) => stripSensitiveFields(sa));

      return NextResponse.json({
        success: true,
        securitySettings: safeSecRow,
        subAdmins: safeSubAdmins,
        logs: logs || [],
      });
    }

    // -------------------------------------------------------------
    // 2. UPDATE SECURITY SETTINGS & EMERGENCY SWITCHES
    // -------------------------------------------------------------
    if (action === 'update_security_settings') {
      if (!admin.is_super_admin) {
        return NextResponse.json({ success: false, error: 'غير مصرح: للمشرف العام فقط' }, { status: 403 });
      }

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (body.admin_username !== undefined) updates.admin_username = sanitizeInput(body.admin_username);
      if (body.super_admin_slug !== undefined) updates.super_admin_slug = sanitizeInput(body.super_admin_slug);
      if (body.super_admin_key !== undefined) updates.super_admin_key = body.super_admin_key.trim();
      if (body.staff_portal_slug !== undefined) updates.staff_portal_slug = sanitizeInput(body.staff_portal_slug);
      if (body.staff_portal_key !== undefined) updates.staff_portal_key = body.staff_portal_key.trim();
      if (body.whatsapp_approval_number !== undefined)
        updates.whatsapp_approval_number = sanitizeInput(body.whatsapp_approval_number);

      // Support both manual_approval_enabled and require_student_approval
      if (body.manual_approval_enabled !== undefined) {
        updates.manual_approval_enabled = Boolean(body.manual_approval_enabled);
      } else if (body.require_student_approval !== undefined) {
        updates.manual_approval_enabled = Boolean(body.require_student_approval);
      }

      // Support registration_paused
      if (body.registration_paused !== undefined) {
        updates.registration_paused = Boolean(body.registration_paused);
      }

      // Support platform_lockdown, platform_locked, and maintenance_mode
      if (body.platform_lockdown !== undefined) {
        updates.platform_lockdown = Boolean(body.platform_lockdown);
      } else if (body.platform_locked !== undefined) {
        updates.platform_lockdown = Boolean(body.platform_locked);
      } else if (body.maintenance_mode !== undefined) {
        updates.platform_lockdown = Boolean(body.maintenance_mode);
      }

      if (body.staff_visible_tabs !== undefined) updates.staff_visible_tabs = body.staff_visible_tabs;
      if (body.session_version !== undefined) updates.session_version = Number(body.session_version);

      // Update admin_security by numeric id (or insert id: 1)
      const { data: updatedSec, error: secErr } = await updateAdminSecurityRow(updates);

      if (secErr) {
        console.error('Error updating admin_security:', secErr);
        // Fallback: If admin_security table update fails, don't halt the request if we can sync to site_settings
      }

      // Save/mirror switches directly into site_settings columns and emergency_switches key
      const finalRegPaused = Boolean(updatedSec?.registration_paused ?? updates.registration_paused);
      const finalPlatformLocked = Boolean(updatedSec?.platform_lockdown ?? updates.platform_lockdown);
      const finalRequireApproval = Boolean(updatedSec?.manual_approval_enabled ?? updates.manual_approval_enabled);

      await syncEmergencySwitchesToSiteSettings({
        registration_paused: finalRegPaused,
        platform_locked: finalPlatformLocked,
        require_student_approval: finalRequireApproval,
      });

      await logAdminAudit(admin.username, 'update_security_settings', 'تم تعديل الإعدادات ومفاتيح الطوارئ الأمنية', ip);

      return NextResponse.json({
        success: true,
        settings: {
          ...(updatedSec ? stripSensitiveFields(updatedSec) : {}),
          registration_paused: finalRegPaused,
          manual_approval_enabled: finalRequireApproval,
          require_student_approval: finalRequireApproval,
          platform_locked: finalPlatformLocked,
          platform_lockdown: finalPlatformLocked,
          maintenance_mode: finalPlatformLocked,
        },
      });
    }

    // -------------------------------------------------------------
    // 3. CHANGE SUPER ADMIN CREDENTIALS (Super Admin Only)
    // -------------------------------------------------------------
    if (action === 'change_super_credentials') {
      if (!admin.is_super_admin) {
        return NextResponse.json({ success: false, error: 'غير مصرح: للمشرف العام فقط' }, { status: 403 });
      }

      const { newPassword, newPin } = body;
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      if (newPassword) {
        updates.password_hash = hashSha256(newPassword);
      }
      if (newPin && newPin.length === 6) {
        updates.pin_hash = hashSha256(newPin);
      }

      await updateAdminSecurityRow(updates);
      await logAdminAudit(admin.username, 'change_super_credentials', 'تم تغيير كلمة مرور أو رمز PIN الإدارة العليا', ip);

      return NextResponse.json({ success: true });
    }

    // -------------------------------------------------------------
    // 4. VAULT SETTINGS & UNLOCK (Super Admin or Authorized)
    // -------------------------------------------------------------
    if (action === 'update_vault') {
      if (!admin.is_super_admin && !admin.permissions?.can_access_student_vault) {
        return NextResponse.json({ success: false, error: 'غير مصرح بالوصول للخزينة' }, { status: 403 });
      }

      const updates: Record<string, any> = {
        vault_enabled: Boolean(body.vault_enabled),
        updated_at: new Date().toISOString(),
      };

      const singlePass = body.vault_password || body.password || body.single_password;
      if (singlePass) {
        updates.vault_complex_hash = hashSha256(String(singlePass).trim());
      }
      if (body.numeric_password) {
        updates.vault_numeric_hash = hashSha256(body.numeric_password.trim());
      }
      if (body.complex_password) {
        updates.vault_complex_hash = hashSha256(body.complex_password.trim());
      }

      await updateAdminSecurityRow(updates);
      await logAdminAudit(admin.username, 'update_vault', 'تم تحديث إعدادات وكلمة مرور الخزينة المشفرة', ip);

      return NextResponse.json({ success: true });
    }

    if (action === 'unlock_vault') {
      const { vaultPassword, password, numericPassword, complexPassword } = body;
      const enteredPassword = (vaultPassword || password || '').trim();

      const secRow = await getAdminSecurityRow();

      if (secRow && !secRow.vault_enabled) {
        return NextResponse.json({ success: true, unlocked: true });
      }

      const defaultVaultPassword = 'AlDostour@2006';
      const defaultVaultHash = hashSha256(defaultVaultPassword);
      const enteredHash = enteredPassword ? hashSha256(enteredPassword) : '';

      let isMatch = false;

      // 1. Check single password match
      if (enteredPassword) {
        if (secRow?.vault_complex_hash) {
          isMatch = enteredHash === secRow.vault_complex_hash || enteredPassword === defaultVaultPassword;
        } else {
          // Default vault password when no custom hash is stored
          isMatch = enteredPassword === defaultVaultPassword || enteredHash === defaultVaultHash;
        }
      }

      // 2. Fallback to dual passwords if provided
      if (!isMatch && (numericPassword || complexPassword)) {
        const numHash = hashSha256((numericPassword || '').trim());
        const compHash = hashSha256((complexPassword || '').trim());
        isMatch = numHash === secRow?.vault_numeric_hash && compHash === secRow?.vault_complex_hash;
      }

      if (isMatch) {
        await logAdminAudit(admin.username, 'unlock_vault', 'تم فك تشفير خزنة بيانات الطلاب بنجاح', ip);
        return NextResponse.json({ success: true, unlocked: true });
      } else {
        await logAdminAudit(admin.username, 'failed_vault_unlock', 'محاولة فك تشفير فاشلة لخزنة الطلاب', ip);
        return NextResponse.json(
          { success: false, error: 'كلمة مرور الخزنة غير صحيحة (الافتراضية: AlDostour@2006)' },
          { status: 401 }
        );
      }
    }

    // -------------------------------------------------------------
    // 5. GENERATE MASTER RECOVERY CODES (Super Admin Only)
    // -------------------------------------------------------------
    if (action === 'generate_recovery_codes') {
      if (!admin.is_super_admin) {
        return NextResponse.json({ success: false, error: 'غير مصرح: للمشرف العام فقط' }, { status: 403 });
      }

      const rawCodes: string[] = [];
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 5; i++) {
        let part1 = '';
        let part2 = '';
        for (let j = 0; j < 4; j++) {
          part1 += chars.charAt(Math.floor(Math.random() * chars.length));
          part2 += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        rawCodes.push(`DST-REC-${part1}-${part2}`);
      }

      const hashedCodes = rawCodes.map((code) => hashSha256(code.trim().toUpperCase()));

      await updateAdminSecurityRow({
        recovery_code_hashes: hashedCodes,
      });

      await logAdminAudit(admin.username, 'generate_recovery_codes', 'تم توليد 5 أكواد استرداد طوارئ جديدة للمشرف العام', ip);

      return NextResponse.json({ success: true, rawCodes });
    }

    // -------------------------------------------------------------
    // 6. SUB-ADMIN MANAGEMENT (Super Admin Only)
    // -------------------------------------------------------------
    if (action === 'manage_sub_admin') {
      if (!admin.is_super_admin) {
        return NextResponse.json({ success: false, error: 'غير مصرح: للمشرف العام فقط' }, { status: 403 });
      }

      const subAction = body.subAction;

      if (subAction === 'create') {
        const username = sanitizeInput(body.username || '');
        const password = body.password || '';
        const pin = (body.pin || '').trim();

        if (!username || !password || pin.length !== 6) {
          return NextResponse.json({ success: false, error: 'بيانات المشرف غير مكتملة' }, { status: 400 });
        }

        const passwordHash = hashSha256(password);
        const pinHash = hashSha256(pin);

        const { data: created, error } = await supabaseAdmin
          .from('admin_users')
          .insert({
            username,
            password_hash: passwordHash,
            pin_hash: pinHash,
            can_manage_students: Boolean(body.can_manage_students),
            can_manage_content: body.can_manage_content !== false,
            can_delete_content: Boolean(body.can_delete_content),
            can_access_student_vault: Boolean(body.can_access_student_vault),
          })
          .select()
          .single();

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        await logAdminAudit(admin.username, 'create_sub_admin', `تم إنشاء حساب مشرف فرعي: ${username}`, ip);
        return NextResponse.json({ success: true, subAdmin: stripSensitiveFields(created) });
      }

      if (subAction === 'update') {
        const id = body.id;
        const updates: Record<string, any> = {
          can_manage_students: Boolean(body.can_manage_students),
          can_manage_content: Boolean(body.can_manage_content),
          can_delete_content: Boolean(body.can_delete_content),
          can_access_student_vault: Boolean(body.can_access_student_vault),
          updated_at: new Date().toISOString(),
        };

        if (body.password) {
          updates.password_hash = hashSha256(body.password);
        }
        if (body.pin && body.pin.length === 6) {
          updates.pin_hash = hashSha256(body.pin);
        }

        const { data: updated, error } = await supabaseAdmin
          .from('admin_users')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        await logAdminAudit(admin.username, 'update_sub_admin', `تم تعديل صلاحيات المشرف ID: ${id}`, ip);
        return NextResponse.json({ success: true, subAdmin: stripSensitiveFields(updated) });
      }

      if (subAction === 'delete') {
        const id = body.id;
        await supabaseAdmin.from('admin_users').delete().eq('id', id);
        await logAdminAudit(admin.username, 'delete_sub_admin', `تم حذف حساب مشرف فرعي ID: ${id}`, ip);
        return NextResponse.json({ success: true });
      }
    }

    // -------------------------------------------------------------
    // 7. PANIC REVOKE (Super Admin Only)
    // -------------------------------------------------------------
    if (action === 'panic_revoke') {
      if (!admin.is_super_admin) {
        return NextResponse.json({ success: false, error: 'غير مصرح: للمشرف العام فقط' }, { status: 403 });
      }

      const currentSec = await getAdminSecurityRow();
      const newVersion = (currentSec?.session_version || 1) + 1;

      await updateAdminSecurityRow({
        session_version: newVersion,
      });

      await logAdminAudit(
        admin.username,
        'panic_revoke',
        `تم تفعيل إغلاق الطوارئ المركزي وإبطال كافة الجلسات النشطة (الإصدار الجديد: ${newVersion})`,
        ip
      );

      const response = NextResponse.json({ success: true, newVersion });
      response.cookies.delete('eldostour_admin_token');
      response.cookies.delete('v2_admin_token');
      response.cookies.delete('eldostour_admin_session');
      return response;
    }

    // -------------------------------------------------------------
    // 8. EMERGENCY RESET ALL STUDENT PASSWORDS TO UNIFIED PASSWORD
    // -------------------------------------------------------------
    if (action === 'reset_all_student_passwords') {
      if (!admin.is_super_admin && !admin.permissions?.can_manage_students) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح: يتطلب صلاحية إدارة الطلاب' },
          { status: 403 }
        );
      }

      const salt = generateRandomSalt(16);
      const unifiedHash = hashPasswordWithSalt(UNIFIED_RESET_PASSWORD, salt);

      const { data: students, error: fetchErr } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('is_guest', false);

      if (fetchErr) {
        return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
      }

      const studentCount = students?.length || 0;

      const { error: updErr } = await supabaseAdmin
        .from('students')
        .update({
          password_hash: unifiedHash,
          password_salt: salt,
          must_change_password: true,
          last_active_at: new Date().toISOString(),
        })
        .eq('is_guest', false);

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      const currentSec = await getAdminSecurityRow();
      const newVersion = (currentSec?.session_version || 1) + 1;
      await updateAdminSecurityRow({ session_version: newVersion });

      await logAdminAudit(
        admin.username,
        'emergency_password_reset',
        `تم تنفيذ إعادة تعيين جماعية طارئة لكلمات مرور كافة الطلاب (${studentCount} طالب) للباسورد الموحد وإلزامهم بالتغيير الفوري`,
        ip
      );

      return NextResponse.json({
        success: true,
        resetCount: studentCount,
        unifiedPassword: UNIFIED_RESET_PASSWORD,
      });
    }

    // -------------------------------------------------------------
    // 9. STUDENTS DIRECTORY QUERIES & MUTATIONS
    // -------------------------------------------------------------
    if (action === 'get_students') {
      if (!admin.is_super_admin && !admin.permissions?.can_manage_students) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح: حسابك لا يملك صلاحية إدارة سجل الطلاب' },
          { status: 403 }
        );
      }

      // Fetch all rows from students table via supabaseAdmin (bypassing RLS)
      const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students with supabaseAdmin:', error);
        return NextResponse.json(
          {
            success: false,
            error: `فشل استعلام الطلاب من قاعدة البيانات: ${error.message}. يرجى التأكد من ضبط SUPABASE_SERVICE_ROLE_KEY على الخادم لتجاوز قيود RLS.`,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        count: students?.length || 0,
        students: (students || []).map((s) => stripSensitiveFields(s)),
      });
    }

    if (action === 'update_student') {
      if (!admin.is_super_admin && !admin.permissions?.can_manage_students) {
        return NextResponse.json({ success: false, error: 'غير مصرح بتعديل بيانات الطلاب' }, { status: 403 });
      }

      const { studentId, updates } = body;
      if (!studentId || !updates) {
        return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 });
      }

      // Whitelist update fields
      const safeUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.is_approved !== undefined) safeUpdates.is_approved = Boolean(updates.is_approved);
      if (updates.is_verified !== undefined) safeUpdates.is_verified = Boolean(updates.is_verified);
      if (updates.is_banned !== undefined) safeUpdates.is_banned = Boolean(updates.is_banned);
      if (updates.study_type !== undefined) safeUpdates.study_type = updates.study_type;
      if (updates.academic_year !== undefined) safeUpdates.academic_year = Number(updates.academic_year);
      if (updates.full_name !== undefined) safeUpdates.full_name = sanitizeInput(updates.full_name);
      if (updates.phone !== undefined) safeUpdates.phone = sanitizeInput(updates.phone);
      if (updates.student_code !== undefined)
        safeUpdates.student_code = sanitizeInput(updates.student_code).toUpperCase();
      if (updates.device_fingerprint !== undefined) safeUpdates.device_fingerprint = updates.device_fingerprint;
      if (updates.must_change_password !== undefined)
        safeUpdates.must_change_password = Boolean(updates.must_change_password);

      // Support individual student password change / reset
      if (updates.password) {
        const salt = generateRandomSalt(16);
        safeUpdates.password_salt = salt;
        safeUpdates.password_hash = hashPasswordWithSalt(updates.password, salt);
        safeUpdates.must_change_password = true;
      }

      const { data: updated, error } = await supabaseAdmin
        .from('students')
        .update(safeUpdates)
        .eq('id', studentId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      await logAdminAudit(admin.username, 'update_student', `تعديل بيانات الطالب ${studentId}`, ip);
      return NextResponse.json({ success: true, student: stripSensitiveFields(updated) });
    }

    if (action === 'bulk_approve_students') {
      if (!admin.is_super_admin && !admin.permissions?.can_manage_students) {
        return NextResponse.json({ success: false, error: 'غير مصرح بالاعتماد الجماعي' }, { status: 403 });
      }

      const { studentIds } = body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return NextResponse.json({ success: false, error: 'قائمة المعرفات فارغة' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('students')
        .update({
          is_approved: true,
          is_verified: true,
          verification_status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .in('id', studentIds);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      await logAdminAudit(admin.username, 'bulk_approve_students', `اعتماد جماعي وتفعيل لـ ${studentIds.length} طالب`, ip);
      return NextResponse.json({ success: true, count: studentIds.length });
    }

    if (action === 'get_full_backup') {
      if (!admin.is_super_admin && !admin.permissions?.can_manage_students) {
        return NextResponse.json({ success: false, error: 'غير مصرح بتحميل النسخ الاحتياطية' }, { status: 403 });
      }

      try {
        const [studentsRes, subjectsRes, materialsRes, bundlesRes, quizzesRes, questionsRes, storiesRes] = await Promise.all([
          supabaseAdmin.from('students').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('subjects').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('materials').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('lecture_bundles').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('quizzes').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('quiz_questions').select('*').order('order_index', { ascending: true }),
          supabaseAdmin.from('legal_stories').select('*').order('created_at', { ascending: false }),
        ]);

        const sanitizedStudents = (studentsRes.data || []).map((s) => stripSensitiveFields(s));
        const backupPayload = {
          platform: 'منصة الدستور التعليمية (Al-Dustour)',
          college: 'كلية الحقوق - جامعة مدينة السادات',
          exported_at: new Date().toISOString(),
          exported_by: admin.username,
          data: {
            students: sanitizedStudents,
            subjects: subjectsRes.data || [],
            materials: materialsRes.data || [],
            lecture_bundles: bundlesRes.data || [],
            quizzes: quizzesRes.data || [],
            quiz_questions: questionsRes.data || [],
            legal_stories: storiesRes.data || [],
          },
          counts: {
            students: sanitizedStudents.length,
            subjects: (subjectsRes.data || []).length,
            materials: (materialsRes.data || []).length,
            lecture_bundles: (bundlesRes.data || []).length,
            quizzes: (quizzesRes.data || []).length,
            quiz_questions: (questionsRes.data || []).length,
            legal_stories: (storiesRes.data || []).length,
          },
        };

        await logAdminAudit(admin.username, 'full_backup_download', 'تم تحميل نسخة احتياطية كاملة من قاعدة بيانات المنصة', ip);
        return NextResponse.json({ success: true, backup: backupPayload });
      } catch (bkErr: any) {
        return NextResponse.json({ success: false, error: bkErr?.message || 'فشل توليد النسخة الاحتياطية' }, { status: 500 });
      }
    }

    if (action === 'delete_student') {
      if (!admin.is_super_admin && !admin.permissions?.can_manage_students) {
        return NextResponse.json({ success: false, error: 'غير مصرح بحذف الطلاب' }, { status: 403 });
      }

      const { studentId } = body;
      const { error } = await supabaseAdmin.from('students').delete().eq('id', studentId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      await logAdminAudit(admin.username, 'delete_student', `حذف الطالب نهائياً: ${studentId}`, ip);
      return NextResponse.json({ success: true });
    }

    // -------------------------------------------------------------
    // 10. GENERIC SECURE MUTATIONS FOR ADMIN CONTENT TABLES
    // -------------------------------------------------------------
    if (action === 'mutate') {
      const { table, mutation, data, id, ids, filter } = body;

      const allowedTables = new Set([
        'materials',
        'subjects',
        'quizzes',
        'quiz_questions',
        'lecture_bundles',
        'urgent_news',
        'site_settings',
        'site_sections',
        'grade_covers',
        'french_terms',
        'legal_stories',
        'settings',
        'subject_covers',
        'student_requests',
        'bug_reports',
        'active_presence',
      ]);

      if (!allowedTables.has(table)) {
        return NextResponse.json({ success: false, error: 'جدول غير مصرح به' }, { status: 403 });
      }

      if (mutation === 'delete') {
        if (!admin.is_super_admin && !admin.permissions?.can_delete_content) {
          return NextResponse.json({ success: false, error: 'غير مصرح بحذف المحتوى' }, { status: 403 });
        }
      } else {
        if (!admin.is_super_admin && !admin.permissions?.can_manage_content) {
          return NextResponse.json({ success: false, error: 'غير مصرح بإدارة المحتوى' }, { status: 403 });
        }
      }

      if (mutation === 'insert') {
        const { data: created, error } = await supabaseAdmin
          .from(table)
          .insert(data)
          .select();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({
          success: true,
          data: Array.isArray(data) ? stripSensitiveFields(created) : stripSensitiveFields(created?.[0]),
        });
      }

      if (mutation === 'upsert') {
        const { data: upserted, error } = await supabaseAdmin
          .from(table)
          .upsert(data)
          .select();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({
          success: true,
          data: Array.isArray(data) ? stripSensitiveFields(upserted) : stripSensitiveFields(upserted?.[0]),
        });
      }

      if (mutation === 'update') {
        let query = supabaseAdmin.from(table).update(data);
        if (ids && Array.isArray(ids) && ids.length > 0) {
          query = query.in('id', ids);
        } else if (id) {
          query = query.eq('id', id);
        } else if (filter && typeof filter === 'object') {
          for (const [k, v] of Object.entries(filter)) {
            if (Array.isArray(v)) {
              query = query.in(k, v);
            } else {
              query = query.eq(k, v);
            }
          }
        }
        const { data: updated, error } = await query.select();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, data: stripSensitiveFields(updated) });
      }

      if (mutation === 'delete') {
        let query = supabaseAdmin.from(table).delete();
        if (ids && Array.isArray(ids) && ids.length > 0) {
          query = query.in('id', ids);
        } else if (id) {
          query = query.eq('id', id);
        } else if (filter && typeof filter === 'object') {
          for (const [k, v] of Object.entries(filter)) {
            if (Array.isArray(v)) {
              query = query.in(k, v);
            } else {
              query = query.eq(k, v);
            }
          }
        }
        const { error } = await query;

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ success: false, error: 'نوع العملية غير معروف' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin DB API Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'خطأ في الخادم' }, { status: 500 });
  }
}

async function logAdminAudit(username: string, eventType: string, details: string, ip: string) {
  try {
    await supabaseAdmin.from('admin_security_logs').insert({
      event_type: eventType,
      username: username || 'Admin',
      details,
      ip_address: ip,
    });
  } catch (err) {
    console.warn('Could not record admin audit log:', err);
  }
}

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

function hashSha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Helper to authenticate admin from cookie or authorization header
function authenticateAdmin(req: NextRequest): AdminSession | null {
  const cookieToken = req.cookies.get('eldostour_admin_token')?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = cookieToken || bearerToken;

  if (!token) return null;

  const session = verifyToken<AdminSession & { role: string }>(token);
  if (!session || session.role !== 'admin') return null;

  return session;
}

export async function POST(req: NextRequest) {
  const admin = authenticateAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'غير مصرح: يجب تسجيل الدخول كمسؤول أولاً' },
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
      const { data: secRow } = await supabaseAdmin
        .from('admin_security')
        .select('*')
        .eq('id', 'primary')
        .maybeSingle();

      const { data: subAdmins } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: logs } = await supabaseAdmin
        .from('admin_security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // Strip sensitive hashes before returning
      const safeSecRow = secRow
        ? {
            id: secRow.id,
            admin_username: secRow.admin_username,
            vault_enabled: Boolean(secRow.vault_enabled),
            has_vault_passwords: Boolean(secRow.vault_numeric_hash && secRow.vault_complex_hash),
            session_version: secRow.session_version,
            manual_approval_enabled: Boolean(secRow.manual_approval_enabled),
            super_admin_slug: secRow.super_admin_slug || 'command-mazen',
            staff_portal_slug: secRow.staff_portal_slug || 'staff-portal',
            whatsapp_approval_number: secRow.whatsapp_approval_number || '201000000000',
            staff_visible_tabs: secRow.staff_visible_tabs,
            registration_paused: Boolean(secRow.registration_paused),
            platform_lockdown: Boolean(secRow.platform_lockdown),
            has_recovery_codes: Array.isArray(secRow.recovery_code_hashes) && secRow.recovery_code_hashes.length > 0,
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
    // 2. UPDATE SECURITY SETTINGS (Super Admin Only)
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
      if (body.whatsapp_approval_number !== undefined) updates.whatsapp_approval_number = sanitizeInput(body.whatsapp_approval_number);
      if (body.manual_approval_enabled !== undefined) updates.manual_approval_enabled = Boolean(body.manual_approval_enabled);
      if (body.registration_paused !== undefined) updates.registration_paused = Boolean(body.registration_paused);
      if (body.platform_lockdown !== undefined) updates.platform_lockdown = Boolean(body.platform_lockdown);
      if (body.staff_visible_tabs !== undefined) updates.staff_visible_tabs = body.staff_visible_tabs;

      const { data, error } = await supabaseAdmin
        .from('admin_security')
        .update(updates)
        .eq('id', 'primary')
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      await logAdminAudit(admin.username, 'update_security_settings', 'تم تعديل الإعدادات الأمنية للمنصة', ip);

      return NextResponse.json({ success: true, settings: stripSensitiveFields(data) });
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

      await supabaseAdmin.from('admin_security').update(updates).eq('id', 'primary');
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

      if (body.numeric_password) {
        updates.vault_numeric_hash = hashSha256(body.numeric_password.trim());
      }
      if (body.complex_password) {
        updates.vault_complex_hash = hashSha256(body.complex_password.trim());
      }

      await supabaseAdmin.from('admin_security').update(updates).eq('id', 'primary');
      await logAdminAudit(admin.username, 'update_vault', 'تم تحديث إعدادات وكلمات مرور الخزينة المشفرة', ip);

      return NextResponse.json({ success: true });
    }

    if (action === 'unlock_vault') {
      const { numericPassword, complexPassword } = body;
      const { data: secRow } = await supabaseAdmin
        .from('admin_security')
        .select('vault_enabled, vault_numeric_hash, vault_complex_hash')
        .eq('id', 'primary')
        .maybeSingle();

      if (!secRow?.vault_enabled) {
        return NextResponse.json({ success: true, unlocked: true });
      }

      const numHash = hashSha256((numericPassword || '').trim());
      const compHash = hashSha256((complexPassword || '').trim());

      const isMatch = numHash === secRow.vault_numeric_hash && compHash === secRow.vault_complex_hash;

      if (isMatch) {
        await logAdminAudit(admin.username, 'unlock_vault', 'تم فك تشفير الخزينة بنجاح', ip);
        return NextResponse.json({ success: true, unlocked: true });
      } else {
        await logAdminAudit(admin.username, 'failed_vault_unlock', 'محاولة فك تشفير فاشلة للخزينة', ip);
        return NextResponse.json({ success: false, error: 'كلمات مرور الخزينة غير صحيحة' }, { status: 401 });
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

      await supabaseAdmin
        .from('admin_security')
        .update({
          recovery_code_hashes: hashedCodes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'primary');

      await logAdminAudit(admin.username, 'generate_recovery_codes', 'تم توليد 5 أكواد استرداد طوارئ جديدة للمشرف العام', ip);

      // Return raw codes ONLY this once for the admin to copy/save
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

      const { data: currentSec } = await supabaseAdmin
        .from('admin_security')
        .select('session_version')
        .eq('id', 'primary')
        .single();

      const newVersion = (currentSec?.session_version || 1) + 1;

      await supabaseAdmin
        .from('admin_security')
        .update({
          session_version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'primary');

      await logAdminAudit(
        admin.username,
        'panic_revoke',
        `تم تفعيل إغلاق الطوارئ المركزي وإبطال كافة الجلسات النشطة (الإصدار الجديد: ${newVersion})`,
        ip
      );

      const response = NextResponse.json({ success: true, newVersion });
      response.cookies.delete('eldostour_admin_token');
      return response;
    }

    // -------------------------------------------------------------
    // 8. EMERGENCY RESET ALL STUDENT PASSWORDS TO UNIFIED PASSWORD
    //    (AlDustour@2006@999#111#111) -> Requirement 2
    // -------------------------------------------------------------
    if (action === 'reset_all_student_passwords') {
      if (!admin.is_super_admin && !admin.permissions?.can_manage_students) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح: يتطلب صلاحية إدارة الطلاب' },
          { status: 403 }
        );
      }

      // Generate salt and hash for unified reset password
      const salt = generateRandomSalt(16);
      const unifiedHash = hashPasswordWithSalt(UNIFIED_RESET_PASSWORD, salt);

      // Fetch all registered students
      const { data: students, error: fetchErr } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('is_guest', false);

      if (fetchErr) {
        return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
      }

      const studentCount = students?.length || 0;

      // Update all students in database
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

      // Invalidate existing sessions by bumping session_version
      const { data: currentSec } = await supabaseAdmin
        .from('admin_security')
        .select('session_version')
        .eq('id', 'primary')
        .maybeSingle();

      const newVersion = (currentSec?.session_version || 1) + 1;
      await supabaseAdmin
        .from('admin_security')
        .update({ session_version: newVersion })
        .eq('id', 'primary');

      await logAdminAudit(
        admin.username,
        'emergency_password_reset',
        `تم تنفيذ إعادة تعيين جماعية طارئة لكلمات مرور كافة الطلاب (${studentCount} طالب) إلى الباسورد الموحد وإلزامهم بالتغيير الفوري`,
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
        return NextResponse.json({ success: false, error: 'غير مصرح بعرض الطلاب' }, { status: 403 });
      }

      const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
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
      const safeUpdates: Record<string, any> = {};
      if (updates.is_approved !== undefined) safeUpdates.is_approved = Boolean(updates.is_approved);
      if (updates.is_verified !== undefined) safeUpdates.is_verified = Boolean(updates.is_verified);
      if (updates.is_banned !== undefined) safeUpdates.is_banned = Boolean(updates.is_banned);
      if (updates.study_type !== undefined) safeUpdates.study_type = updates.study_type;
      if (updates.academic_year !== undefined) safeUpdates.academic_year = Number(updates.academic_year);
      if (updates.full_name !== undefined) safeUpdates.full_name = sanitizeInput(updates.full_name);
      if (updates.phone !== undefined) safeUpdates.phone = sanitizeInput(updates.phone);
      if (updates.device_fingerprint !== undefined) safeUpdates.device_fingerprint = updates.device_fingerprint; // Admin can unlink device by passing null

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
        .update({ is_approved: true })
        .in('id', studentIds);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      await logAdminAudit(admin.username, 'bulk_approve_students', `اعتماد جماعي لـ ${studentIds.length} طالب`, ip);
      return NextResponse.json({ success: true, count: studentIds.length });
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
    // (materials, quizzes, quiz_questions, subjects, bundles, news, etc.)
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
      ]);

      if (!allowedTables.has(table)) {
        return NextResponse.json({ success: false, error: 'جدول غير مصرح به' }, { status: 403 });
      }

      // Check content permissions
      if (mutation === 'delete') {
        if (!admin.is_super_admin && !admin.permissions?.can_delete_content) {
          return NextResponse.json({ success: false, error: 'غير مصرح بحذف المحتوى' }, { status: 403 });
        }
      } else {
        if (!admin.is_super_admin && !admin.permissions?.can_manage_content) {
          return NextResponse.json({ success: false, error: 'غير مصرح بإدارة المحتوى' }, { status: 403 });
        }
      }

      // Execute mutation via supabaseAdmin
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

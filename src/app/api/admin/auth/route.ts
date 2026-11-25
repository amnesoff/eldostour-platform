import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import {
  checkRateLimit,
  getClientIp,
  stripSensitiveFields,
  signToken,
  verifyToken,
  getSecureCookieOptions,
} from '@/lib/server/security';
import { AdminSession, SubAdminUser } from '@/types';
import { FOUNDER_FULL_PERMISSIONS } from '@/lib/constants';
import { getSupervisorGranularPermissions } from '@/lib/server/adminSecurityDb';

function hashSha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, 6, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `تم تجاوز الحد المسموح من المحاولات (6 طلبات/دقيقة). يرجى الانتظار ${rateLimit.retryAfter || 60} ثانية.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter || 60) },
      }
    );
  }

  try {
    const body = await req.json();
    const action = body.action || 'credentials';

    // -------------------------------------------------------------
    // ACTION: CREDENTIALS (Step 1)
    // -------------------------------------------------------------
    if (action === 'credentials') {
      const username = (body.username || '').trim();
      const password = body.password || '';
      const gateType = body.gateType || 'super_admin';

      if (!username || !password) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' },
          { status: 400 }
        );
      }

      const enteredPasswordHash = hashSha256(password);

      // Fetch primary security record
      const { data: secRow } = await supabaseAdmin
        .from('admin_security')
        .select('*')
        .limit(1)
        .maybeSingle();

      const defaultSuperUsername = secRow?.admin_username || 'Dr. Mazen 2006';
      const defaultSuperPasswordHash =
        secRow?.password_hash || 'b33b653a50da45bba3409e563f479875fc2e3a379d8a478bd515f5594de12200';

      const isSuperMatch = username.toLowerCase() === defaultSuperUsername.toLowerCase();

      // Gate enforcement
      if (gateType === 'staff' && isSuperMatch) {
        await logSecurityEvent('failed_login', username, `محاولة دخول من بوابة المشرفين الفرعيين [${gateType}]`, ip);
        return NextResponse.json(
          { success: false, error: 'هذه البوابة مخصصة للمشرفين الفرعيين فقط. يرجى الدخول من بوابة الإدارة المركزية.' },
          { status: 403 }
        );
      }

      if (gateType === 'super_admin' && !isSuperMatch) {
        await logSecurityEvent('failed_login', username, `محاولة دخول غير مصرح بها لبوابة الإدارة المركزية [${gateType}]`, ip);
        return NextResponse.json(
          { success: false, error: 'هذه البوابة مخصصة للإدارة المركزية فقط.' },
          { status: 403 }
        );
      }

      // Check Super Admin
      if (isSuperMatch) {
        if (enteredPasswordHash === defaultSuperPasswordHash) {
          // Advance to PIN step (never send pin hash to browser)
          return NextResponse.json({
            success: true,
            step: 'pin',
            username: defaultSuperUsername,
            is_super_admin: true,
          });
        } else {
          await logSecurityEvent('failed_login', username, 'كلمة المرور غير صحيحة', ip);
          return NextResponse.json(
            { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
            { status: 401 }
          );
        }
      }

      // Check Sub-Admin
      const { data: subAdmin } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .ilike('username', username)
        .maybeSingle();

      if (subAdmin && enteredPasswordHash === subAdmin.password_hash) {
        return NextResponse.json({
          success: true,
          step: 'pin',
          username: subAdmin.username,
          is_super_admin: false,
        });
      }

      await logSecurityEvent('failed_login', username, 'بيانات اعتماد خاطئة لمشرف فرعي', ip);
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // -------------------------------------------------------------
    // ACTION: VERIFY PIN (Step 2)
    // -------------------------------------------------------------
    if (action === 'verify_pin') {
      const username = (body.username || '').trim();
      const pin = (body.pin || '').trim();
      const isSuperAdmin = Boolean(body.is_super_admin);

      if (!username || pin.length !== 6) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال رمز الأمان كاملاً (6 أرقام)' },
          { status: 400 }
        );
      }

      const enteredPinHash = hashSha256(pin);

      if (isSuperAdmin) {
        const { data: secRow } = await supabaseAdmin
          .from('admin_security')
          .select('pin_hash, session_version')
          .limit(1)
          .maybeSingle();

        const defaultPinHash =
          secRow?.pin_hash || '588505a0785bab576624a7783e03236d3858987ca0a59b5ce340c6c5e808e5bf';

        if (enteredPinHash !== defaultPinHash) {
          await logSecurityEvent('failed_pin', username, 'رمز أمان PIN غير صحيح للمشرف العام', ip);
          return NextResponse.json(
            { success: false, error: 'رمز الأمان PIN غير صحيح' },
            { status: 401 }
          );
        }

        const sessionPayload: AdminSession = {
          username,
          is_super_admin: true,
          session_version: secRow?.session_version || 1,
          permissions: {
            can_manage_students: true,
            can_manage_content: true,
            can_delete_content: true,
            can_access_student_vault: true,
            granular: FOUNDER_FULL_PERMISSIONS,
          },
        };

        const token = signToken({
          ...sessionPayload,
          role: 'admin',
        });

        await logSecurityEvent('successful_login', username, 'تم تسجيل دخول ناجح متعدد العوامل (مشرف عام)', ip);

        const response = NextResponse.json({
          success: true,
          session: sessionPayload,
          token,
        });

        const cookieOpts = getSecureCookieOptions();
        response.cookies.set('eldostour_admin_token', token, cookieOpts);
        response.cookies.set('v2_admin_token', token, cookieOpts);
        response.cookies.set('eldostour_admin_session', token, cookieOpts);
        return response;
      } else {
        // Sub-admin PIN check
        const { data: subAdmin } = await supabaseAdmin
          .from('admin_users')
          .select('*')
          .ilike('username', username)
          .maybeSingle();

        if (!subAdmin || enteredPinHash !== subAdmin.pin_hash) {
          await logSecurityEvent('failed_pin', username, 'رمز أمان PIN غير صحيح لمشرف فرعي', ip);
          return NextResponse.json(
            { success: false, error: 'رمز الأمان PIN غير صحيح' },
            { status: 401 }
          );
        }

        const granularPerms = await getSupervisorGranularPermissions(subAdmin.username, subAdmin);

        const sessionPayload: AdminSession = {
          username: subAdmin.username,
          is_super_admin: false,
          session_version: 1,
          permissions: {
            can_manage_students: Boolean(subAdmin.can_manage_students || granularPerms.students.view),
            can_manage_content: Boolean(
              subAdmin.can_manage_content ||
                granularPerms.materials.view ||
                granularPerms.quizzes.view ||
                granularPerms.stories.view
            ),
            can_delete_content: Boolean(
              subAdmin.can_delete_content ||
                granularPerms.materials.delete ||
                granularPerms.quizzes.delete ||
                granularPerms.stories.delete
            ),
            can_access_student_vault: Boolean(subAdmin.can_access_student_vault || granularPerms.students.view),
            granular: granularPerms,
          },
        };

        const token = signToken({
          ...sessionPayload,
          role: 'admin',
        });

        await logSecurityEvent('successful_login', username, 'تم تسجيل دخول ناجح متعدد العوامل (مشرف فرعي)', ip);

        const response = NextResponse.json({
          success: true,
          session: sessionPayload,
          token,
        });

        const cookieOpts = getSecureCookieOptions();
        response.cookies.set('eldostour_admin_token', token, cookieOpts);
        response.cookies.set('v2_admin_token', token, cookieOpts);
        response.cookies.set('eldostour_admin_session', token, cookieOpts);
        return response;
      }
    }

    // -------------------------------------------------------------
    // ACTION: EMERGENCY RECOVERY CODE LOGIN
    // -------------------------------------------------------------
    if (action === 'recovery') {
      const username = (body.username || '').trim();
      const code = (body.recoveryCode || '').trim().toUpperCase();

      if (!code) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال كود الاسترداد' },
          { status: 400 }
        );
      }

      const { data: secRow } = await supabaseAdmin
        .from('admin_security')
        .select('*')
        .limit(1)
        .maybeSingle();

      const defaultSuperUsername = secRow?.admin_username || 'Dr. Mazen 2006';
      if (username.toLowerCase() !== defaultSuperUsername.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: 'كود الاسترداد مخصص للمشرف العام فقط' },
          { status: 403 }
        );
      }

      const enteredCodeHash = hashSha256(code);
      const existingHashes: string[] = Array.isArray(secRow?.recovery_code_hashes)
        ? secRow.recovery_code_hashes
        : [];

      if (existingHashes.includes(enteredCodeHash)) {
        // Consume code immediately
        const remaining = existingHashes.filter((h) => h !== enteredCodeHash);
        const targetId = secRow?.id !== undefined && secRow?.id !== null ? Number(secRow.id) : 1;
        await supabaseAdmin
          .from('admin_security')
          .update({
            recovery_code_hashes: remaining,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetId);

        const sessionPayload: AdminSession = {
          username: defaultSuperUsername,
          is_super_admin: true,
          session_version: secRow?.session_version || 1,
          permissions: {
            can_manage_students: true,
            can_manage_content: true,
            can_delete_content: true,
            can_access_student_vault: true,
            granular: FOUNDER_FULL_PERMISSIONS,
          },
        };

        const token = signToken({
          ...sessionPayload,
          role: 'admin',
        });

        await logSecurityEvent(
          'successful_login',
          defaultSuperUsername,
          'تم الدخول بنجاح عبر كود الاسترداد الرئيسي للطوارئ وتم استهلاك الكود',
          ip
        );

        const response = NextResponse.json({
          success: true,
          session: sessionPayload,
          token,
        });

        const cookieOpts = getSecureCookieOptions();
        response.cookies.set('eldostour_admin_token', token, cookieOpts);
        response.cookies.set('v2_admin_token', token, cookieOpts);
        response.cookies.set('eldostour_admin_session', token, cookieOpts);
        return response;
      }

      await logSecurityEvent('failed_recovery', username, 'محاولة استخدام كود استرداد غير صالح', ip);
      return NextResponse.json(
        { success: false, error: 'كود الاسترداد غير صحيح أو تم استخدامه مسبقاً' },
        { status: 401 }
      );
    }

    // -------------------------------------------------------------
    // ACTION: LOGOUT
    // -------------------------------------------------------------
    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete('eldostour_admin_token');
      response.cookies.delete('v2_admin_token');
      response.cookies.delete('eldostour_admin_session');
      return response;
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin Auth Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// GET endpoint to verify active admin session cookie
export async function GET(req: NextRequest) {
  const token = req.cookies.get('eldostour_admin_token')?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = verifyToken<AdminSession & { role: string }>(token);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Verify session version against DB
  if (payload.is_super_admin) {
    const { data: secRow } = await supabaseAdmin
      .from('admin_security')
      .select('session_version')
      .limit(1)
      .maybeSingle();

    if (secRow && secRow.session_version > payload.session_version) {
      const res = NextResponse.json({ authenticated: false, revoked: true }, { status: 401 });
      res.cookies.delete('eldostour_admin_token');
      return res;
    }
  }

  return NextResponse.json({
    authenticated: true,
    session: {
      username: payload.username,
      is_super_admin: payload.is_super_admin,
      session_version: payload.session_version,
      permissions: payload.permissions,
    },
  });
}

async function logSecurityEvent(
  eventType: string,
  username: string,
  details: string,
  ip: string
) {
  try {
    await supabaseAdmin.from('admin_security_logs').insert({
      event_type: eventType,
      username: username || 'مجهول',
      details,
      ip_address: ip,
    });
  } catch (err) {
    console.warn('Could not insert admin security log:', err);
  }
}

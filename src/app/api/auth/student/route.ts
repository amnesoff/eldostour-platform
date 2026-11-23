import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import {
  checkRateLimit,
  getClientIp,
  sanitizeInput,
  stripSensitiveFields,
  generateRandomSalt,
  hashPasswordWithSalt,
  verifyStudentPassword,
  isUnifiedPassword,
  UNIFIED_RESET_PASSWORD,
  signToken,
  verifyToken,
  getSecureCookieOptions,
} from '@/lib/server/security';
import {
  validateEgyptianPhone,
  validateStudentName,
  generateSequentialStudentCode,
  generateGuestCode,
} from '@/lib/authUtils';

async function getEmergencySwitches() {
  try {
    const { data: secRow } = await supabaseAdmin
      .from('admin_security')
      .select('registration_paused, platform_lockdown, manual_approval_enabled, whatsapp_approval_number')
      .eq('id', 'primary')
      .maybeSingle();

    if (secRow) {
      return {
        registration_paused: Boolean(secRow.registration_paused),
        platform_locked: Boolean(secRow.platform_lockdown),
        maintenance_mode: Boolean(secRow.platform_lockdown),
        manual_approval_enabled: Boolean(secRow.manual_approval_enabled),
        require_student_approval: Boolean(secRow.manual_approval_enabled),
        whatsapp_approval_number: secRow.whatsapp_approval_number || '201000000000',
      };
    }
  } catch (err) {
    console.warn('Could not read admin_security for emergency switches:', err);
  }

  // Fallback to site_settings
  try {
    const { data: siteSwitches } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'emergency_switches')
      .maybeSingle();

    const val = siteSwitches?.value || {};
    return {
      registration_paused: Boolean(val.registration_paused),
      platform_locked: Boolean(val.platform_locked || val.maintenance_mode || val.platform_lockdown),
      maintenance_mode: Boolean(val.platform_locked || val.maintenance_mode || val.platform_lockdown),
      manual_approval_enabled: Boolean(val.manual_approval_enabled || val.require_student_approval),
      require_student_approval: Boolean(val.manual_approval_enabled || val.require_student_approval),
      whatsapp_approval_number: '201000000000',
    };
  } catch {
    return {
      registration_paused: false,
      platform_locked: false,
      maintenance_mode: false,
      manual_approval_enabled: false,
      require_student_approval: false,
      whatsapp_approval_number: '201000000000',
    };
  }
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
    const action = body.action || 'login';

    // -------------------------------------------------------------
    // ACTION: LOGIN
    // -------------------------------------------------------------
    if (action === 'login') {
      const switches = await getEmergencySwitches();
      if (switches.platform_locked) {
        return NextResponse.json(
          {
            success: false,
            error:
              'المنصة في وضع القفل الشامل والصيانة الطارئة حالياً بقرار من إدارة المنصة. يرجى المحاولة لاحقاً 🔒',
            isMaintenance: true,
          },
          { status: 503 }
        );
      }

      const rawInput = sanitizeInput(body.phone || body.phoneOrEmail || body.email || '').trim();
      const password = body.password || '';
      const deviceFingerprint = body.deviceFingerprint || '';
      const deviceInfo = body.deviceInfo || '';

      if (!rawInput || !password) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال رقم الهاتف المسجل وكلمة المرور' },
          { status: 400 }
        );
      }

      const cleanPhone = rawInput.replace(/[\s-]/g, '');
      const syntheticEmail = `${cleanPhone}@hidden.aldostour.local`;

      // Query student by phone, or synthetic hidden email, or legacy direct email
      let student: any = null;
      let dbErr: any = null;

      // 1. Try phone match first
      const { data: byPhone, error: phoneErr } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (byPhone) {
        student = byPhone;
      } else {
        // 2. Try synthetic email or legacy direct email
        const { data: byEmail, error: emailErr } = await supabaseAdmin
          .from('students')
          .select('*')
          .or(`email.eq.${syntheticEmail},email.eq.${rawInput.toLowerCase()}`)
          .maybeSingle();

        student = byEmail;
        dbErr = emailErr || phoneErr;
      }

      if (dbErr || !student) {
        return NextResponse.json(
          { success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
          { status: 401 }
        );
      }

      // Check if student is permanently banned
      if (student.is_banned) {
        return NextResponse.json(
          {
            success: false,
            error: 'تم حظر هذا الحساب نهائياً لمخالفة بنود العقد وشروط الاستخدام 🚫',
          },
          { status: 403 }
        );
      }

      // Check password: unified password check OR stored hash check
      let isMatch = false;
      let forcePasswordChange = Boolean(student.must_change_password);

      if (isUnifiedPassword(password)) {
        isMatch = true;
        forcePasswordChange = true;
      } else {
        const verifyRes = verifyStudentPassword(
          password,
          student.password_hash || '',
          student.password_salt
        );
        isMatch = verifyRes.isValid;

        // Auto-upgrade legacy hash on login to salted SHA-256
        if (isMatch && verifyRes.needsUpgrade) {
          const newSalt = generateRandomSalt(16);
          const newHash = hashPasswordWithSalt(password, newSalt);
          await supabaseAdmin
            .from('students')
            .update({
              password_hash: newHash,
              password_salt: newSalt,
            })
            .eq('id', student.id);
        }
      }

      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
          { status: 401 }
        );
      }

      // Single-Device Lock
      if (
        student.device_fingerprint &&
        deviceFingerprint &&
        student.device_fingerprint !== deviceFingerprint
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'عذراً، هذا الحساب مرتبط بجهاز آخر مصرح به. لحماية العضوية يمنع تشغيل الحساب من جهاز ثانٍ. يمكنك طلب فك الارتباط من الإدارة.',
          },
          { status: 403 }
        );
      }

      // Issue unique session token identifier for Single-Session Lock
      const activeSessionToken = crypto.randomUUID();

      // Update student activity & active session token
      await supabaseAdmin
        .from('students')
        .update({
          device_fingerprint: student.device_fingerprint || deviceFingerprint || null,
          last_device_info: deviceInfo || student.last_device_info,
          last_active_at: new Date().toISOString(),
          activity_score: (student.activity_score || 0) + 1,
          must_change_password: forcePasswordChange,
          active_session_token: activeSessionToken,
        })
        .eq('id', student.id);

      // Check approval
      if (!student.is_guest && student.is_approved === false) {
        return NextResponse.json({
          success: false,
          pendingApproval: true,
          error: 'حسابك قيد المراجعة والاعتماد من قبل إدارة منصة الدستور ⏳',
        });
      }

      // Issue signed session token
      const sessionToken = signToken({
        id: student.id,
        student_code: student.student_code,
        email: student.email,
        sessionTokenId: activeSessionToken,
        role: 'student',
      });

      const response = NextResponse.json({
        success: true,
        student: stripSensitiveFields({
          ...student,
          must_change_password: forcePasswordChange,
        }),
        must_change_password: forcePasswordChange,
      });

      response.cookies.set('eldostour_student_token', sessionToken, getSecureCookieOptions());
      return response;
    }

    // -------------------------------------------------------------
    // ACTION: REGISTER OFFICIAL STUDENT
    // -------------------------------------------------------------
    if (action === 'register') {
      const fullName = sanitizeInput(body.full_name || '');
      const password = body.password || '';
      const rawPhone = sanitizeInput(body.phone || '');
      const gender = body.gender || 'male';
      const academicYear = Number(body.academic_year) || 1;
      const studyType = body.study_type || 'انتظام';
      const avatarUrl = body.avatar_url || '';
      const deviceFingerprint = body.deviceFingerprint || '';
      const deviceInfo = body.deviceInfo || '';

      const nameVal = validateStudentName(fullName);
      if (!nameVal.isValid) {
        return NextResponse.json({ success: false, error: nameVal.error }, { status: 400 });
      }

      const phoneVal = validateEgyptianPhone(rawPhone);
      if (!phoneVal.isValid) {
        return NextResponse.json({ success: false, error: phoneVal.error || 'يرجى إدخال رقم هاتف محمول مصري صحيح' }, { status: 400 });
      }

      if (!password) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال كلمة المرور' },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: 'كلمة المرور يجب أن لا تقل عن 8 خانات وتحتوي على أحرف وأرقام' },
          { status: 400 }
        );
      }

      const cleanPhone = rawPhone.trim().replace(/[\s-]/g, '');
      const syntheticEmail = body.email && !body.email.includes('@hidden.aldostour.local')
        ? sanitizeInput(body.email).toLowerCase()
        : `${cleanPhone}@hidden.aldostour.local`;

      // Check emergency switches
      const switches = await getEmergencySwitches();

      if (switches.platform_locked) {
        return NextResponse.json(
          {
            success: false,
            error: 'عذراً، المنصة في وضع القفل الشامل والصيانة حالياً، التسجيل غير متاح 🔒',
            isMaintenance: true,
          },
          { status: 503 }
        );
      }

      if (switches.registration_paused) {
        return NextResponse.json(
          {
            success: false,
            error:
              'عذراً، التسجيل متوقف مؤقتاً بقرار من إدارة المنصة لإجراء صيانة أمنية. يرجى المحاولة لاحقاً ⏸️',
          },
          { status: 403 }
        );
      }

      // Check duplicate phone
      const { data: existingPhone } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingPhone) {
        return NextResponse.json(
          {
            success: false,
            error: 'رقم الهاتف مسجل مسبقاً بحساب طالب آخر، يمكنك تسجيل الدخول مباشرة',
          },
          { status: 409 }
        );
      }

      const isManualApproval = switches.manual_approval_enabled === true;
      const isApproved = !isManualApproval;

      // Count students for sequential code
      const { count } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true });
      const studentCode = generateSequentialStudentCode(1001 + (count || 0));

      // Hash password with salt
      const salt = generateRandomSalt(16);
      const passwordHash = hashPasswordWithSalt(password, salt);
      const isUsingUnified = isUnifiedPassword(password);

      const { data: created, error: insErr } = await supabaseAdmin
        .from('students')
        .insert({
          student_code: studentCode,
          full_name: fullName,
          email: syntheticEmail,
          password_hash: passwordHash,
          password_salt: salt,
          must_change_password: isUsingUnified,
          gender,
          academic_year: academicYear,
          study_type: studyType,
          avatar_url: avatarUrl,
          phone: cleanPhone,
          is_guest: false,
          is_approved: isApproved,
          verification_status: isApproved ? 'approved' : 'pending',
          welcome_shown: false,
          is_verified: false,
          is_banned: false,
          device_fingerprint: deviceFingerprint || null,
          last_device_info: deviceInfo || null,
          activity_score: 5,
          last_active_at: new Date().toISOString(),
          terms_accepted_at: new Date().toISOString(),
          contract_version: 'v2.0-EG',
        })
        .select()
        .single();

      if (insErr || !created) {
        return NextResponse.json(
          { success: false, error: 'فشل تسجيل الحساب، يرجى إعادة المحاولة' },
          { status: 500 }
        );
      }

      const sessionToken = signToken({
        id: created.id,
        student_code: created.student_code,
        role: 'student',
      });

      const response = NextResponse.json({
        success: true,
        pendingApproval: !isApproved,
        student: stripSensitiveFields(created),
        must_change_password: isUsingUnified,
      });

      response.cookies.set('eldostour_student_token', sessionToken, getSecureCookieOptions());
      return response;
    }

    // -------------------------------------------------------------
    // ACTION: MARK WELCOME SHOWN
    // -------------------------------------------------------------
    if (action === 'mark_welcome_shown') {
      const studentId = body.student_id || body.studentId;
      if (studentId) {
        await supabaseAdmin
          .from('students')
          .update({ welcome_shown: true })
          .eq('id', studentId);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: 'معرف الطالب مفقود' }, { status: 400 });
    }

    // -------------------------------------------------------------
    // ACTION: REGISTER GUEST
    // -------------------------------------------------------------
    if (action === 'guest') {
      const switches = await getEmergencySwitches();

      if (switches.platform_locked) {
        return NextResponse.json(
          {
            success: false,
            error: 'عذراً، المنصة في وضع القفل الشامل والصيانة حالياً 🔒',
            isMaintenance: true,
          },
          { status: 503 }
        );
      }

      if (switches.registration_paused) {
        return NextResponse.json(
          {
            success: false,
            error: 'عذراً، التسجيل كزائر متوقف مؤقتاً بقرار من إدارة المنصة ⏸️',
          },
          { status: 403 }
        );
      }

      const fullName = sanitizeInput(body.full_name || '');
      const phone = sanitizeInput(body.phone || '');
      const gender = body.gender || 'male';
      const academicYear = Number(body.academic_year) || 1;
      const studyType = body.study_type || 'انتظام';

      const nameVal = validateStudentName(fullName);
      if (!nameVal.isValid) {
        return NextResponse.json({ success: false, error: nameVal.error }, { status: 400 });
      }

      const phoneVal = validateEgyptianPhone(phone);
      if (!phoneVal.isValid) {
        return NextResponse.json({ success: false, error: phoneVal.error }, { status: 400 });
      }

      const { count } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_guest', true);

      const guestCode = generateGuestCode(101 + (count || 0));

      const { data: created, error: insErr } = await supabaseAdmin
        .from('students')
        .insert({
          student_code: guestCode,
          full_name: fullName,
          phone,
          email: null,
          password_hash: null,
          password_salt: null,
          gender,
          academic_year: academicYear,
          study_type: studyType,
          is_guest: true,
          is_approved: true,
        })
        .select()
        .single();

      if (insErr || !created) {
        return NextResponse.json(
          { success: false, error: 'فشل تسجيل بيانات الزائر' },
          { status: 500 }
        );
      }

      const sessionToken = signToken({
        id: created.id,
        student_code: created.student_code,
        role: 'guest',
      });

      const response = NextResponse.json({
        success: true,
        student: stripSensitiveFields(created),
      });

      response.cookies.set('eldostour_student_token', sessionToken, getSecureCookieOptions());
      return response;
    }

    // -------------------------------------------------------------
    // ACTION: MANDATORY PASSWORD CHANGE / UPDATE
    // -------------------------------------------------------------
    if (action === 'change_password') {
      const studentId = body.student_id;
      const newPassword = body.new_password || '';

      if (!studentId || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'بيانات غير مكتملة' },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'كلمة المرور الجديدة يجب أن لا تقل عن 8 خانات' },
          { status: 400 }
        );
      }

      if (newPassword === UNIFIED_RESET_PASSWORD) {
        return NextResponse.json(
          {
            success: false,
            error: 'لا يمكن استخدام كلمة المرور الموحدة ككلمة مرور شخصية. اختر كلمة مرور قوية وخاصة بك.',
          },
          { status: 400 }
        );
      }

      const salt = generateRandomSalt(16);
      const newHash = hashPasswordWithSalt(newPassword, salt);

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('students')
        .update({
          password_hash: newHash,
          password_salt: salt,
          must_change_password: false,
          last_active_at: new Date().toISOString(),
        })
        .eq('id', studentId)
        .select()
        .single();

      if (updateErr || !updated) {
        return NextResponse.json(
          { success: false, error: 'فشل تحديث كلمة المرور في قاعدة البيانات' },
          { status: 500 }
        );
      }

      const sessionToken = signToken({
        id: updated.id,
        student_code: updated.student_code,
        email: updated.email,
        role: 'student',
      });

      const response = NextResponse.json({
        success: true,
        student: stripSensitiveFields({ ...updated, must_change_password: false }),
        must_change_password: false,
      });

      response.cookies.set('eldostour_student_token', sessionToken, getSecureCookieOptions());
      return response;
    }

    // -------------------------------------------------------------
    // ACTION: UPDATE PROFILE
    // -------------------------------------------------------------
    if (action === 'update_profile') {
      const studentId = body.student_id;
      if (!studentId) {
        return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
      }

      const allowedUpdates: Record<string, any> = {};
      if (body.study_type) allowedUpdates.study_type = body.study_type;
      if (body.avatar_url !== undefined) allowedUpdates.avatar_url = body.avatar_url;
      if (body.full_name) allowedUpdates.full_name = sanitizeInput(body.full_name);
      if (body.academic_year) allowedUpdates.academic_year = Number(body.academic_year);
      if (body.gender) allowedUpdates.gender = body.gender;
      if (body.phone) allowedUpdates.phone = sanitizeInput(body.phone);

      const { data: updated, error: updErr } = await supabaseAdmin
        .from('students')
        .update(allowedUpdates)
        .eq('id', studentId)
        .select()
        .single();

      if (updErr || !updated) {
        return NextResponse.json(
          { success: false, error: 'فشل تحديث البيانات' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        student: stripSensitiveFields(updated),
      });
    }

    // -------------------------------------------------------------
    // ACTION: DELETE MY ACCOUNT (Student GDPR / Right to Erasure)
    // -------------------------------------------------------------
    if (action === 'delete_account') {
      const studentId = body.student_id;
      if (!studentId) {
        return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
      }

      await supabaseAdmin.from('students').delete().eq('id', studentId);

      const response = NextResponse.json({
        success: true,
        message: 'تم حذف الحساب بنجاح',
      });
      response.cookies.delete('eldostour_student_token');
      return response;
    }

    // -------------------------------------------------------------
    // ACTION: LOGOUT
    // -------------------------------------------------------------
    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete('eldostour_student_token');
      return response;
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err: any) {
    console.error('Student Auth API Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// GET endpoint to verify current session cookie or fetch public config
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'session';

  const switches = await getEmergencySwitches();

  if (type === 'config') {
    // Return safe public configuration values
    return NextResponse.json({
      whatsapp_approval_number: switches.whatsapp_approval_number,
      registration_paused: switches.registration_paused,
      platform_locked: switches.platform_locked,
      platform_lockdown: switches.platform_locked,
      maintenance_mode: switches.maintenance_mode,
      require_student_approval: switches.require_student_approval,
      manual_approval_enabled: switches.manual_approval_enabled,
    });
  }

  // If platform is locked, student sessions are paused
  if (switches.platform_locked) {
    return NextResponse.json(
      {
        authenticated: false,
        isMaintenance: true,
        error: 'المنصة في وضع القفل الشامل والصيانة الطارئة حالياً 🔒',
      },
      { status: 503 }
    );
  }

  // Session check via HttpOnly Cookie
  const token = req.cookies.get('eldostour_student_token')?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = verifyToken<{ id: string; student_code: string; role: string; sessionTokenId?: string }>(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', payload.id)
    .maybeSingle();

  if (!student || student.is_banned) {
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.delete('eldostour_student_token');
    return res;
  }

  // Single-Session Lock: invalidate if sessionTokenId has been superseded by a newer login
  if (
    student.active_session_token &&
    payload.sessionTokenId &&
    student.active_session_token !== payload.sessionTokenId
  ) {
    const res = NextResponse.json(
      { authenticated: false, error: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء الجلسة القديمة لحماية الحساب.' },
      { status: 401 }
    );
    res.cookies.delete('eldostour_student_token');
    return res;
  }

  return NextResponse.json({
    authenticated: true,
    student: stripSensitiveFields(student),
    must_change_password: Boolean(student.must_change_password),
  });
}

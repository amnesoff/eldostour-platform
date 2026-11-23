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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, 8, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `تم تجاوز الحد المسموح من المحاولات (8 طلبات/دقيقة). يرجى الانتظار ${rateLimit.retryAfter || 60} ثانية.`,
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
      const email = sanitizeInput(body.email || '').toLowerCase();
      const password = body.password || '';
      const deviceFingerprint = body.deviceFingerprint || '';
      const deviceInfo = body.deviceInfo || '';

      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' },
          { status: 400 }
        );
      }

      // Query student
      const { data: student, error: dbErr } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (dbErr || !student) {
        return NextResponse.json(
          { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
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

      // Update student activity
      await supabaseAdmin
        .from('students')
        .update({
          device_fingerprint: student.device_fingerprint || deviceFingerprint || null,
          last_device_info: deviceInfo || student.last_device_info,
          last_active_at: new Date().toISOString(),
          activity_score: (student.activity_score || 0) + 1,
          must_change_password: forcePasswordChange,
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
      const email = sanitizeInput(body.email || '').toLowerCase();
      const fullName = sanitizeInput(body.full_name || '');
      const password = body.password || '';
      const phone = sanitizeInput(body.phone || '');
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

      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: 'كلمة المرور يجب أن لا تقل عن 8 خانات وتحتوي على أحرف وأرقام' },
          { status: 400 }
        );
      }

      if (phone) {
        const phoneVal = validateEgyptianPhone(phone);
        if (!phoneVal.isValid) {
          return NextResponse.json({ success: false, error: phoneVal.error }, { status: 400 });
        }
      }

      // Check registration paused switch in admin_security
      const { data: secRow } = await supabaseAdmin
        .from('admin_security')
        .select('registration_paused, manual_approval_enabled')
        .eq('id', 'primary')
        .maybeSingle();

      if (secRow?.registration_paused) {
        return NextResponse.json(
          {
            success: false,
            error:
              'عذراً، التسجيل متوقف مؤقتاً بقرار من إدارة المنصة لإجراء صيانة أمنية. يرجى المحاولة لاحقاً.',
          },
          { status: 403 }
        );
      }

      // Check duplicate email
      const { data: existingEmail } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: 'البريد الإلكتروني مسجل مسبقاً بالفعل، يمكنك تسجيل الدخول مباشرة',
          },
          { status: 409 }
        );
      }

      // Check duplicate phone if provided
      if (phone) {
        const { data: existingPhone } = await supabaseAdmin
          .from('students')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        if (existingPhone) {
          return NextResponse.json(
            { success: false, error: 'رقم الهاتف مسجل مسبقاً بحساب طالب آخر' },
            { status: 409 }
          );
        }
      }

      const isManualApproval = secRow?.manual_approval_enabled === true;
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
          email,
          password_hash: passwordHash,
          password_salt: salt,
          must_change_password: isUsingUnified,
          gender,
          academic_year: academicYear,
          study_type: studyType,
          avatar_url: avatarUrl,
          phone,
          is_guest: false,
          is_approved: isApproved,
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
        email: created.email,
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
    // ACTION: REGISTER GUEST
    // -------------------------------------------------------------
    if (action === 'guest') {
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

  if (type === 'config') {
    // Return only safe public configuration values
    const { data: secRow } = await supabaseAdmin
      .from('admin_security')
      .select('whatsapp_approval_number, registration_paused')
      .eq('id', 'primary')
      .maybeSingle();

    return NextResponse.json({
      whatsapp_approval_number: secRow?.whatsapp_approval_number || '201000000000',
      registration_paused: secRow?.registration_paused || false,
    });
  }

  // Session check via HttpOnly Cookie
  const token = req.cookies.get('eldostour_student_token')?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = verifyToken<{ id: string; student_code: string; role: string }>(token);
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

  return NextResponse.json({
    authenticated: true,
    student: stripSensitiveFields(student),
    must_change_password: Boolean(student.must_change_password),
  });
}

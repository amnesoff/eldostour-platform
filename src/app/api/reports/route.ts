import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { getClientIp, checkRateLimit, sanitizeInput } from '@/lib/server/security';
import { authenticateAdmin } from '@/app/api/admin/db/route';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Rate limit: max 6 bug reports per minute per IP
  const rateLimit = checkRateLimit(ip, 6, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `تم تجاوز الحد المسموح للإبلاغ (6 طلبات/دقيقة). يرجى الانتظار ${rateLimit.retryAfter || 60} ثانية.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const reportType = sanitizeInput(body.reportType || body.report_type || 'other');
    const targetTitle = sanitizeInput(body.targetTitle || body.target_title || '');
    const targetId = sanitizeInput(body.targetId || body.target_id || '');
    const description = sanitizeInput(body.description || '');
    const studentName = sanitizeInput(body.studentName || body.student_name || 'طالب المنصة');
    const studentPhone = sanitizeInput(body.studentPhone || body.student_phone || '');

    if (!description.trim()) {
      return NextResponse.json(
        { success: false, error: 'يرجى كتابة وصف الخطأ أو الملاحظة بالتفصيل.' },
        { status: 400 }
      );
    }

    const reportData = {
      report_type: reportType,
      target_id: targetId || null,
      target_title: targetTitle || 'عام',
      description: description.trim(),
      student_name: studentName,
      student_phone: studentPhone || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // 1. Try inserting into bug_reports table
    let insertSuccess = false;
    let savedRecord: any = null;

    try {
      const { data, error } = await supabaseAdmin
        .from('bug_reports')
        .insert(reportData)
        .select()
        .single();

      if (!error && data) {
        insertSuccess = true;
        savedRecord = data;
      }
    } catch {
      insertSuccess = false;
    }

    // 2. Fallback to student_requests if bug_reports table does not exist
    if (!insertSuccess) {
      try {
        const { data } = await supabaseAdmin
          .from('student_requests')
          .insert({
            student_name: `${studentName} 🚩 [بلاغ: ${reportType}]`,
            year: 1,
            subject_name: targetTitle || 'بلاغ تدقيق علمي',
            request_text: `[إبلاغ عن خطأ]\nالموضوع: ${targetTitle}\nالتفاصيل: ${description}\nمعرف العنصر: ${targetId}`,
            contact_info: studentPhone || null,
            status: 'pending',
          })
          .select()
          .single();

        savedRecord = data;
      } catch (fbErr) {
        console.warn('Fallback insert into student_requests failed:', fbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم إرسال البلاغ بنجاح للإدارة، شكراً لمساهمتك في تدقيق المحتوى! 🚩',
      report: savedRecord || reportData,
    });
  } catch (err: any) {
    console.error('Bug report error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'فشل إرسال البلاغ' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }

  try {
    // Try querying bug_reports table
    const { data: bugReports, error } = await supabaseAdmin
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && bugReports) {
      return NextResponse.json({ success: true, reports: bugReports });
    }

    // Fallback: extract from student_requests containing [بلاغ:
    const { data: requests } = await supabaseAdmin
      .from('student_requests')
      .select('*')
      .ilike('student_name', '%[بلاغ%')
      .order('created_at', { ascending: false });

    const mapped = (requests || []).map((r) => ({
      id: r.id,
      report_type: 'other',
      target_title: r.subject_name,
      description: r.request_text,
      student_name: r.student_name,
      student_phone: r.contact_info,
      status: r.status,
      created_at: r.created_at,
    }));

    return NextResponse.json({ success: true, reports: mapped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'خطأ' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'معرف غير صالح' }, { status: 400 });
    }

    // Update in bug_reports or student_requests
    await supabaseAdmin.from('bug_reports').update({ status }).eq('id', id);
    await supabaseAdmin.from('student_requests').update({ status }).eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'خطأ' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف غير صالح' }, { status: 400 });
    }

    await supabaseAdmin.from('bug_reports').delete().eq('id', id);
    await supabaseAdmin.from('student_requests').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'خطأ' }, { status: 500 });
  }
}

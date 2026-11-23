import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { checkRateLimit, getClientIp, sanitizeInput } from '@/lib/server/security';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, 20, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'يرجى الانتظار قليلاً قبل إرسال المزيد من التفاعلات' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action;

    // 1. Lecture Rating
    if (action === 'rate_lecture') {
      const { bundleId, rating, studentName } = body;
      const numRating = Number(rating);

      if (!bundleId || !numRating || numRating < 1 || numRating > 5) {
        return NextResponse.json({ success: false, error: 'التقييم يجب أن يكون بين 1 و 5 نجوم' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin.from('lecture_ratings').insert({
        bundle_id: bundleId,
        rating: numRating,
        student_name: sanitizeInput(studentName || 'طالب مجهول'),
      }).select().single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, rating: data });
    }

    // 2. Student Request / Suggestion
    if (action === 'student_request') {
      const { studentName, year, subjectName, requestText, contactInfo } = body;

      if (!requestText || !studentName) {
        return NextResponse.json({ success: false, error: 'يرجى ملء نص الطلب واسم الطالب' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin.from('student_requests').insert({
        student_name: sanitizeInput(studentName),
        year: Number(year) || 1,
        subject_name: sanitizeInput(subjectName || 'عام'),
        request_text: sanitizeInput(requestText),
        contact_info: sanitizeInput(contactInfo || ''),
        status: 'pending',
      }).select().single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, request: data });
    }

    // 3. Increment Material Likes
    if (action === 'like_material') {
      const { materialId } = body;
      if (!materialId) {
        return NextResponse.json({ success: false, error: 'معرف الملف مفقود' }, { status: 400 });
      }

      await supabaseAdmin.rpc('increment_likes', { material_id: materialId });
      return NextResponse.json({ success: true });
    }

    // 4. Increment Bundle Downloads
    if (action === 'bundle_download') {
      const { bundleId } = body;
      if (!bundleId) {
        return NextResponse.json({ success: false, error: 'معرف المحاضرة مفقود' }, { status: 400 });
      }

      await supabaseAdmin.rpc('increment_bundle_downloads', { bundle_id: bundleId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

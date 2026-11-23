import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { checkRateLimit, getClientIp, sanitizeInput } from '@/lib/server/security';

// GET: Load Quiz & Questions with correct_answer stripped
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get('quizId');

  if (!quizId) {
    return NextResponse.json({ success: false, error: 'معرف الاختبار مفقود' }, { status: 400 });
  }

  try {
    const { data: quiz, error: qErr } = await supabaseAdmin
      .from('quizzes')
      .select('id, title, description, year, duration_minutes, is_active, subject_id, subjects(name)')
      .eq('id', quizId)
      .single();

    if (qErr || !quiz) {
      return NextResponse.json({ success: false, error: 'الاختبار غير موجود' }, { status: 404 });
    }

    const { data: questions, error: questErr } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, quiz_id, question_text, question_type, options, order_index')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (questErr) {
      return NextResponse.json({ success: false, error: questErr.message }, { status: 500 });
    }

    // Never send correct_answer or explanation to the client!
    return NextResponse.json({
      success: true,
      quiz: {
        ...quiz,
        questions: questions || [],
        question_count: questions?.length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Server-side Exam Grading & Submission
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, 6, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'يرجى الانتظار قليلاً قبل إرسال الاختبار مرة أخرى' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { quizId, answers, studentName, studentPhone, year } = body;

    if (!quizId || !answers || typeof answers !== 'object') {
      return NextResponse.json({ success: false, error: 'بيانات الإجابات مفقودة' }, { status: 400 });
    }

    // Fetch quiz and original questions with correct_answer from DB
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, correct_answer, order_index')
      .eq('quiz_id', quizId);

    if (qErr || !questions || questions.length === 0) {
      return NextResponse.json({ success: false, error: 'تعذر العثور على أسئلة الاختبار للتصحيح' }, { status: 404 });
    }

    // Strict server-side grading
    let calculatedScore = 0;
    const totalQuestions = questions.length;

    questions.forEach((q, idx) => {
      // Support matching by question ID or index (0-based or 1-based)
      const submittedAnswer =
        answers[q.id] ||
        answers[idx] ||
        answers[String(idx)] ||
        answers[q.order_index] ||
        answers[String(q.order_index)];

      if (submittedAnswer && typeof submittedAnswer === 'string') {
        if (submittedAnswer.trim() === q.correct_answer.trim()) {
          calculatedScore++;
        }
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((calculatedScore / totalQuestions) * 100) : 0;

    // Insert verified submission into quiz_submissions
    const { data: submission, error: insErr } = await supabaseAdmin
      .from('quiz_submissions')
      .insert({
        quiz_id: quizId,
        student_name: sanitizeInput(studentName || 'طالب مجهول'),
        student_phone: sanitizeInput(studentPhone || ''),
        year: Number(year) || 1,
        score: calculatedScore,
        total_score: totalQuestions,
        percentage,
      })
      .select()
      .single();

    if (insErr) {
      console.warn('Quiz submission record error:', insErr);
    }

    return NextResponse.json({
      success: true,
      score: calculatedScore,
      totalScore: totalQuestions,
      percentage,
      submissionId: submission?.id,
    });
  } catch (err: any) {
    console.error('Quiz submission error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

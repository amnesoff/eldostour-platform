'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageCircle,
  Crown,
  FileSpreadsheet,
  FileBadge,
  Check,
} from 'lucide-react';
import { Quiz, QuizSubmission, AcademicYearId, Subject, CertificateData } from '@/types';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { CertificateModal } from '@/components/admin/CertificateModal';

interface QuizzesManagerProps {
  subjects: Subject[];
  onRefresh?: () => void;
}

interface VisualQuestionItem {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false';
  options: string[];
  correct_answer: string;
  explanation: string;
}

export function QuizzesManager({ subjects, onRefresh }: QuizzesManagerProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'quizzes' | 'submissions'>('quizzes');

  // New Quiz Header State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState<AcademicYearId>(1);
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState(15);

  // Visual Form-Based Questions State (Part 1.3 requirement: NO pipe-delimited text!)
  const [questions, setQuestions] = useState<VisualQuestionItem[]>([
    {
      id: '1',
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Selected Submission for Admin Certificate Modal
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);

  const loadData = async () => {
    try {
      const { data: qData } = await supabase
        .from('quizzes')
        .select('*, subjects(name)')
        .order('created_at', { ascending: false });

      if (qData) setQuizzes(qData as Quiz[]);

      const { data: sData } = await supabase
        .from('quiz_submissions')
        .select('*, quizzes(title)')
        .order('created_at', { ascending: false });

      if (sData) setSubmissions(sData as QuizSubmission[]);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter subjects for the selected year
  const availableSubjects = subjects.filter((s) => s.year === year);

  // Add another question to builder
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
        explanation: '',
      },
    ]);
  };

  // Remove question
  const handleRemoveQuestion = (idx: number) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Toggle question type
  const handleTypeChange = (idx: number, type: 'mcq' | 'true_false') => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        if (type === 'true_false') {
          return {
            ...q,
            question_type: 'true_false',
            options: ['صحيح', 'خطأ'],
            correct_answer: 'صحيح',
          };
        } else {
          return {
            ...q,
            question_type: 'mcq',
            options: ['', '', '', ''],
            correct_answer: '',
          };
        }
      })
    );
  };

  // Update question field
  const handleUpdateQuestion = (
    idx: number,
    field: 'question_text' | 'explanation' | 'correct_answer',
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  // Update specific option
  const handleUpdateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = [...q.options];
        const oldVal = newOpts[optIdx];
        newOpts[optIdx] = value;
        return {
          ...q,
          options: newOpts,
          correct_answer: q.correct_answer === oldVal ? value : q.correct_answer,
        };
      })
    );
  };

  // Create Quiz with Visual Questions
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setError(`يرجى كتابة نص السؤال رقم ${i + 1}`);
        return;
      }
      if (!q.correct_answer) {
        setError(`يرجى تحديد الإجابة الصحيحة للسؤال رقم ${i + 1}`);
        return;
      }
      if (q.question_type === 'mcq' && q.options.some((opt) => !opt.trim())) {
        setError(`يرجى ملء جميع الاختيارات الأربعة للسؤال رقم ${i + 1}`);
        return;
      }
    }

    setIsAdding(true);
    setSuccess('');
    setError('');

    try {
      // 1. Insert Quiz
      const { data: createdQuiz, error: qErr } = await supabase
        .from('quizzes')
        .insert({
          title: title.trim(),
          description: description.trim(),
          year,
          subject_id: subjectId,
          duration_minutes: duration,
          is_active: true,
        })
        .select()
        .single();

      if (qErr) throw qErr;

      // 2. Insert Questions
      if (createdQuiz && questions.length > 0) {
        const rowsToInsert = questions.map((q, idx) => ({
          quiz_id: createdQuiz.id,
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          options: q.options.map((o) => o.trim()),
          correct_answer: q.correct_answer.trim(),
          explanation: q.explanation.trim(),
          order_index: idx + 1,
        }));

        const { error: insErr } = await supabase.from('quiz_questions').insert(rowsToInsert);
        if (insErr) throw insErr;
      }

      setSuccess('تم إنشاء الاختبار وإضافة كافة الأسئلة بنجاح!');
      setTitle('');
      setDescription('');
      setQuestions([
        {
          id: '1',
          question_text: '',
          question_type: 'mcq',
          options: ['', '', '', ''],
          correct_answer: '',
          explanation: '',
        },
      ]);
      loadData();
      onRefresh?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الاختبار');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار وجميع أسئلته ونتائجه؟')) return;
    try {
      await supabase.from('quizzes').delete().eq('id', id);
      loadData();
      onRefresh?.();
    } catch (err: any) {
      alert(`خطأ: ${err?.message || ''}`);
    }
  };

  // Feature #17: Export Student Results to Excel/CSV with UTF-8 BOM
  const handleExportCsv = () => {
    if (submissions.length === 0) {
      alert('لا توجد نتائج لتصديرها.');
      return;
    }

    const headers = ['م', 'اسم الطالب', 'رقم الهاتف', 'الفرقة', 'الاختبار', 'الدرجة', 'النسبة المئوية', 'التاريخ'];
    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.student_name.replace(/"/g, '""')}"`,
      `"${s.student_phone || '-'}"`,
      `"الفرقة ${s.year}"`,
      `"${(s.quizzes?.title || 'اختبار').replace(/"/g, '""')}"`,
      `"${s.score} / ${s.total_score}"`,
      `"${s.percentage}%"`,
      `"${new Date(s.created_at).toLocaleDateString('ar-EG')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `نتائج_اختبارات_منصة_الدستور_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              نظام الاختبارات التفاعلية ولوحة تكريم الطلاب
            </h3>
            <p className="text-xs text-slate-400">
              منشئ الأسئلة المرئي، إصدار شهادات التفوق الرسمية، وتكريم الطلاب عبر واتساب
            </p>
          </div>
        </div>

        {/* Sub-tabs & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === 'submissions' && submissions.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm"
              title="تصدير النتائج إلى ملف Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel (CSV)</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveSubTab('quizzes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeSubTab === 'quizzes'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الاختبارات ({quizzes.length})
            </button>
            <button
              onClick={() => setActiveSubTab('submissions')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeSubTab === 'submissions'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              نتائج وتكريم الطلاب ({submissions.length})
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'quizzes' ? (
        <div className="space-y-6">
          {/* VISUAL FORM-BASED QUIZ BUILDER */}
          <form onSubmit={handleCreateQuiz} className="p-4 sm:p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>إنشاء اختبار جديد وبناء الأسئلة المرئي:</span>
              </h4>
              <span className="text-xs text-slate-400 font-medium">
                {questions.length} سؤال مضاف
              </span>
            </div>

            {/* Quiz General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان الاختبار:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الاختبار الشامل في مصادر الالتزام"
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المدة (بالدقائق):</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الفرقة الدراسية:</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value) as AcademicYearId)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المادة الدراسية:</label>
                <select
                  value={subjectId}
                  required
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                >
                  <option value="">اختر المادة...</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Questions List (Visual Form Builder) */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <span className="block text-xs font-bold text-slate-300">
                قائمة الأسئلة والاختيارات (حدد الإجابة الصحيحة بالضغط على الدائرة):
              </span>

              {questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 relative group"
                >
                  {/* Question Header & Type Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                      السؤال {qIdx + 1}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Type Toggle */}
                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleTypeChange(qIdx, 'mcq')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                            q.question_type === 'mcq'
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          اختيار من متعدد (4 خيارات)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTypeChange(qIdx, 'true_false')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                            q.question_type === 'true_false'
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          صح أم خطأ
                        </button>
                      </div>

                      {/* Remove question button */}
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                          title="حذف هذا السؤال"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <input
                      type="text"
                      required
                      value={q.question_text}
                      onChange={(e) => handleUpdateQuestion(qIdx, 'question_text', e.target.value)}
                      placeholder={`أدخل نص السؤال رقم ${qIdx + 1}...`}
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Options with Radio Button to Pick Correct Answer */}
                  <div className="space-y-2">
                    <span className="text-[11px] text-slate-400">
                      الاختيارات (اختر الإجابة الصحيحة بالضغط على الدائرة الخضراء):
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correct_answer === opt && opt !== '';
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-500/15 border-emerald-500'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            {/* Radio / Check to select as correct */}
                            <button
                              type="button"
                              onClick={() => handleUpdateQuestion(qIdx, 'correct_answer', opt)}
                              className={`w-6 h-6 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                                isCorrect
                                  ? 'bg-emerald-500 border-emerald-400 text-white'
                                  : 'border-slate-600 hover:border-emerald-400 text-transparent'
                              }`}
                              title="اضغط لتعيين هذا الخيار كإجابة صحيحة"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            {/* Option Text Input */}
                            <input
                              type="text"
                              required
                              value={opt}
                              readOnly={q.question_type === 'true_false'}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              placeholder={`الخيار ${optIdx + 1}...`}
                              className="flex-1 bg-transparent text-xs text-white outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation / Legal Reference */}
                  <div>
                    <input
                      type="text"
                      value={q.explanation}
                      onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                      placeholder="السند القانوني أو التفسير (مثال: المادة 147 من القانون المدني)..."
                      className="w-full h-8 px-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              ))}

              {/* Add Question Button */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة سؤال آخر إلى الاختبار</span>
              </button>
            </div>

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAdding || !title.trim() || !subjectId}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all shadow-md"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>حفظ ونشر الاختبار الآن ({questions.length} سؤال)</span>
            </button>
          </form>

          {/* Existing Quizzes */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-300">الاختبارات المنشورة ({quizzes.length}):</h4>
            {quizzes.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold">
                      {q.subjects?.name || 'مادة'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      الفرقة {q.year} • ⏱️ {q.duration_minutes} دقيقة
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{q.title}</h4>
                </div>

                <button
                  onClick={() => handleDeleteQuiz(q.id)}
                  className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                  title="حذف الاختبار"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Submissions / Honors Table (Part 1.1: Certificate + WhatsApp Flow + CSV) */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>قائمة نتائج الطلاب مرتبة زمنياً، يمكنك إصدار شهادة تقدير لكل طالب أو إرسال تهنئة عبر واتساب:</span>
            <span className="font-bold text-amber-400">{submissions.length} نتيجة مسجلة</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الفرقة</th>
                  <th className="p-3">الاختبار</th>
                  <th className="p-3">الدرجة</th>
                  <th className="p-3">النسبة</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3 text-center">شهادة التقدير والتكريم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {submissions.map((sub, idx) => {
                  const isTop = sub.percentage >= 85;
                  const cleanPhone = sub.student_phone ? sub.student_phone.replace(/\D/g, '') : '';
                  const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
                  const waText = encodeURIComponent(
                    `مبارك للطالب المتميز ${sub.student_name}! 🎉 نبارك لك تفوقك واجتيازك ${sub.quizzes?.title || 'الاختبار'} بدرجة ${sub.score} من ${sub.total_score} بنسبة ${sub.percentage}% على منصة الدستور التعليمية للعلوم القانونية. ⚖️ إشراف وتأسيس: مازن شكري • رحمة علاء • وليد محرم.`
                  );

                  return (
                    <tr
                      key={sub.id}
                      className={isTop ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-slate-950/40'}
                    >
                      <td className="p-3 font-bold text-amber-400">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        {isTop && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        <span>{sub.student_name}</span>
                      </td>
                      <td className="p-3 text-slate-300">الفرقة {sub.year}</td>
                      <td className="p-3 text-slate-400 truncate max-w-[140px]">
                        {sub.quizzes?.title || 'اختبار'}
                      </td>
                      <td className="p-3 font-bold text-amber-400">{sub.score} / {sub.total_score}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-black ${
                          isTop ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {sub.percentage}%
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400">
                        {new Date(sub.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Generate Certificate Button */}
                          <button
                            onClick={() =>
                              setSelectedCertificate({
                                studentName: sub.student_name,
                                studentPhone: sub.student_phone,
                                year: sub.year,
                                quizTitle: sub.quizzes?.title || 'اختبار مادة قانونية',
                                score: sub.score,
                                totalScore: sub.total_score,
                                percentage: sub.percentage,
                                issueDate: new Date(sub.created_at).toLocaleDateString('ar-EG'),
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] shadow-sm transition-colors"
                            title="إنشاء ومعاينة شهادة تقدير رسمية"
                          >
                            <FileBadge className="w-3 h-3" />
                            <span>إنشاء شهادة تقدير</span>
                          </button>

                          {/* 2. WhatsApp Honor Button */}
                          {sub.student_phone ? (
                            <a
                              href={`https://wa.me/${formattedPhone}?text=${waText}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-colors"
                              title="إرسال تهنئة عبر واتساب"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>تكريم واتساب</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[10px]">لا يوجد هاتف</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Certificate Modal */}
      <CertificateModal
        data={selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
      />
    </div>
  );
}
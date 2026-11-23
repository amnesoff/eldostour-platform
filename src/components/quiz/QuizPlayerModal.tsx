'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Award,
  User,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Quiz, QuizQuestion } from '@/types';
import { studentSubmitQuiz } from '@/lib/apiClient';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { COLLEGE_NAME } from '@/lib/constants';

interface QuizPlayerModalProps {
  quiz: Quiz | null;
  onClose: () => void;
  onSubmissionSuccess?: () => void;
}

export function QuizPlayerModal({
  quiz,
  onClose,
  onSubmissionSuccess,
}: QuizPlayerModalProps) {
  const [step, setStep] = useState<'info' | 'quiz' | 'result'>('info');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15 * 60);

  // 1. Persistent Student Profile & Mid-Exam State Restoration on Refresh (F5)
  useEffect(() => {
    if (!quiz) return;

    // Load saved student profile
    try {
      const savedProfile = localStorage.getItem('eldostour_student_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setStudentName(parsed.name);
        if (parsed.phone) setStudentPhone(parsed.phone);
      }
    } catch {
      // ignore
    }

    // Load mid-exam progress if exists
    try {
      const savedSession = sessionStorage.getItem(`eldostour_quiz_session_${quiz.id}`);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.step === 'quiz') {
          setStep('quiz');
          if (session.answers) setAnswers(session.answers);
          if (typeof session.currentQIndex === 'number') setCurrentQIndex(session.currentQIndex);
          if (typeof session.timeRemaining === 'number') setTimeRemaining(session.timeRemaining);
          if (session.studentName) setStudentName(session.studentName);
          if (session.studentPhone) setStudentPhone(session.studentPhone);
        }
      } else {
        setTimeRemaining((quiz.duration_minutes || 15) * 60);
      }
    } catch {
      // ignore
    }
  }, [quiz]);

  // Save mid-exam session on every state change
  useEffect(() => {
    if (!quiz || step !== 'quiz') return;

    try {
      sessionStorage.setItem(
        `eldostour_quiz_session_${quiz.id}`,
        JSON.stringify({
          step: 'quiz',
          studentName,
          studentPhone,
          currentQIndex,
          answers,
          timeRemaining,
        })
      );
    } catch {
      // ignore
    }
  }, [quiz, step, studentName, studentPhone, currentQIndex, answers, timeRemaining]);

  const finishRef = useRef<() => void>(() => {});

  // Exam timer countdown
  useEffect(() => {
    if (step !== 'quiz' || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeRemaining]);

  // Fallback questions if none configured in DB
  const questions: QuizQuestion[] = quiz?.questions && quiz.questions.length > 0
    ? quiz.questions
    : [
        {
          id: '1',
          quiz_id: quiz?.id || 'sample-1',
          question_text: 'ما هو المبدأ الأساسي الذي يحكم سريان القانون الجنائي من حيث الزمان؟',
          question_type: 'mcq',
          options: [
            'الأثر الفوري فقط دون استثناء',
            'عدم رجعية القانون الجنائي إلا إذا كان أصلح للمتهم',
            'الرجعية المطلقة لجميع القوانين',
            'سريان القانون بأمر من المحكمة فقط',
          ],
          correct_answer: 'عدم رجعية القانون الجنائي إلا إذا كان أصلح للمتهم',
          explanation: 'المادة 5 من قانون العقوبات تؤكد عدم رجعية نصوص التجريم المشددة مع استثناء القانون الأصلح للمتهم.',
          order_index: 1,
        },
        {
          id: '2',
          quiz_id: quiz?.id || 'sample-2',
          question_text: 'العقد شريعة المتعاقدين، فلا يجوز نقضه ولا تعديله إلا باتفاق الطرفين أو للأسباب التي يقررها القانون.',
          question_type: 'true_false',
          options: ['صحيح', 'خطأ'],
          correct_answer: 'صحيح',
          explanation: 'المادة 147 من القانون المدني المصري تنص على مبدأ القوة الملزمة للعقد.',
          order_index: 2,
        },
      ];

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    setTotalQuestions(questions.length);
    setStep('quiz');
  };

  const handleSelectAnswer = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentQIndex]: option }));
  };

  const handleNextOrFinish = async () => {
    if (!quiz) return;
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Server-side Grading & Submission (Prevents DevTools Cheat Inspection)
      setIsSubmitting(true);
      try {
        const res = await studentSubmitQuiz({
          quizId: quiz.id,
          answers,
          studentName: studentName.trim(),
          studentPhone: studentPhone.trim() || undefined,
          year: quiz.year,
        });

        if (res.success) {
          setFinalScore(res.score);
          setTotalQuestions(res.totalScore);
        }

        // Persist student profile for future visits
        try {
          localStorage.setItem(
            'eldostour_student_profile',
            JSON.stringify({ name: studentName.trim(), phone: studentPhone.trim() })
          );
          sessionStorage.removeItem(`eldostour_quiz_session_${quiz.id}`);
        } catch {
          // ignore
        }

        onSubmissionSuccess?.();
      } catch (err) {
        console.warn('Quiz submission error:', err);
      } finally {
        setIsSubmitting(false);
        setStep('result');
      }
    }
  };

  useEffect(() => {
    finishRef.current = handleNextOrFinish;
  });

  const percentage = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;
  const isPassed = percentage >= 60;
  const isHonor = percentage >= 85;

  if (!quiz) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md text-right text-slate-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* STEP 1: Student Info Input */}
          {step === 'info' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <AnimatedLogo size="md" showText={false} />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-amber-500 font-semibold">
                    {COLLEGE_NAME}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                يرجى كتابة الاسم الثلاثي للبدء في الاختبار والحصول على نتيجتك الفورية وتكريمك في لوحة شرف المنصة:
              </p>

              <form onSubmit={handleStartQuiz} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    الاسم الثلاثي للطالب / الطالبة (مطلوب):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="مثال: أحمد محمد علي..."
                      className="w-full h-12 pr-10 pl-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-sm outline-none"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الواتساب (اختياري - للتكريم والمتابعة):
                  </label>
                  <input
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-sm outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!studentName.trim()}
                  className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  <span>بدء الاختبار الآن</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Answering Questions */}
          {step === 'quiz' && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-semibold">
                  <span>السؤال {currentQIndex + 1} من {questions.length}</span>
                  <span>{Math.round(((currentQIndex + 1) / questions.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>

                {/* Question Text */}
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed mb-6">
                  {questions[currentQIndex]?.question_text}
                </h4>

                {/* Options */}
                <div className="space-y-3">
                  {questions[currentQIndex]?.options.map((opt, idx) => {
                    const isSelected = answers[currentQIndex] === opt;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(opt)}
                        className={`w-full p-3.5 rounded-2xl border text-right text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500'
                              : 'border-slate-400'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Next / Submit Button */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleNextOrFinish}
                  disabled={!answers[currentQIndex] || isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>
                    {currentQIndex < questions.length - 1 ? 'السؤال التالي' : 'إنهاء الاختبار وإظهار النتيجة'}
                  </span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Results & Certificate */}
          {step === 'result' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-amber-500/20 text-amber-500 border border-amber-500/30">
                <Award className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                {isHonor ? 'مبارك الامتياز! 🌟' : isPassed ? 'أحسنت! تم اجتياز الاختبار' : 'محاولة جيدة'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                الطالب: <strong className="text-amber-500">{studentName}</strong> • {quiz.title}
              </p>

              {/* Score Badges */}
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-5">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-2xl font-black text-amber-500">{finalScore} / {totalQuestions}</span>
                  <span className="block text-[11px] text-slate-400">الدرجة المستحقة</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-2xl font-black text-emerald-500">{percentage}%</span>
                  <span className="block text-[11px] text-slate-400">النسبة المئوية</span>
                </div>
              </div>

              {/* Admin-Only Certificate Notice */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                <p>
                  ✅ <strong>تم تسجيل نتيجتك بنجاح في قاعدة بيانات المنصة ولوحة الشرف!</strong>
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  شهادات التقدير والتكريم يتم إصدارها واعتمادها حصرياً من قِبل إدارة المنصة والتواصل مع الطلاب المتفوقين عبر واتساب.
                </p>
              </div>

              {/* Answers Review Section */}
              <div className="text-right border-t border-slate-200 dark:border-slate-800 pt-4 mb-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                  <span>مراجعة إجاباتك:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {finalScore} من {totalQuestions} إجابة صحيحة
                  </span>
                </h4>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1 text-xs">
                  {questions.map((q, idx) => {
                    const studentAns = answers[idx];
                    const isCorrect = studentAns === q.correct_answer;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-300'
                        }`}
                      >
                        <p className="font-bold mb-1.5 text-slate-900 dark:text-white">
                          {idx + 1}. {q.question_text}
                        </p>
                        <div className="text-[11px] space-y-0.5">
                          <p>
                            إجابتك:{' '}
                            <strong className={isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                              {studentAns || 'لم تتم الإجابة'}
                            </strong>
                          </p>
                          {!isCorrect && (
                            <p className="text-slate-600 dark:text-slate-300">
                              الإجابة الصحيحة:{' '}
                              <strong className="text-emerald-600 dark:text-emerald-400">
                                {q.correct_answer}
                              </strong>
                            </p>
                          )}
                          {q.explanation && (
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1 italic">
                              💡 {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-colors"
              >
                إغلاق
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

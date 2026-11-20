'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Award,
  Sparkles,
  RotateCcw,
  Check,
} from 'lucide-react';
import { LEGAL_MAXIMS, DAILY_CHALLENGES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { QuizQuestion } from '@/types';

interface ChallengeItem {
  id: string;
  question: string;
  type: 'true_false' | 'mcq';
  options: string[];
  correctAnswer: string;
  explanation: string;
  articleRef?: string;
}

export function DailyMaximChallenge() {
  const [selectedMaxim] = useState(LEGAL_MAXIMS[0]);

  // 3-Question Set State
  const [activeSet, setActiveSet] = useState<ChallengeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  // Load 3 unseen questions from Supabase or fallback
  const load3Questions = async () => {
    setUserAnswers({});
    setSelectedChoice(null);
    setCurrentIndex(0);
    setIsFinished(false);
    setScore(0);

    let solvedIds: string[] = [];
    try {
      solvedIds = JSON.parse(localStorage.getItem('eldostour_solved_daily_q_ids') || '[]');
    } catch {
      solvedIds = [];
    }

    try {
      // Try to fetch from Supabase quiz_questions
      const { data: dbQuestions } = await supabase
        .from('quiz_questions')
        .select('*')
        .limit(20);

      let pool: ChallengeItem[] = [];

      if (dbQuestions && dbQuestions.length > 0) {
        pool = dbQuestions.map((q: QuizQuestion) => ({
          id: q.id,
          question: q.question_text,
          type: q.question_type,
          options: q.options || ['صحيح', 'خطأ'],
          correctAnswer: q.correct_answer,
          explanation: q.explanation || 'سند قانوني معتمد من المنهج الجامعي',
          articleRef: 'كلية الحقوق جامعة مدينة السادات',
        }));
      }

      // Add fallback daily challenges to pool
      DAILY_CHALLENGES.forEach((dc) => {
        pool.push({
          id: `dc-${dc.id}`,
          question: dc.question,
          type: 'true_false',
          options: ['صحيح', 'خطأ'],
          correctAnswer: dc.correctAnswer ? 'صحيح' : 'خطأ',
          explanation: dc.explanation,
          articleRef: dc.articleRef,
        });
      });

      // Filter unseen questions
      let unseen = pool.filter((item) => !solvedIds.includes(item.id));
      if (unseen.length < 3) {
        // Reset solved list if exhausted
        localStorage.removeItem('eldostour_solved_daily_q_ids');
        unseen = pool;
      }

      // Shuffle and pick 3
      const shuffled = [...unseen].sort(() => 0.5 - Math.random());
      setActiveSet(shuffled.slice(0, 3));
    } catch {
      // Fallback
      const fallbackItems: ChallengeItem[] = DAILY_CHALLENGES.slice(0, 3).map((dc) => ({
        id: `dc-${dc.id}`,
        question: dc.question,
        type: 'true_false',
        options: ['صحيح', 'خطأ'],
        correctAnswer: dc.correctAnswer ? 'صحيح' : 'خطأ',
        explanation: dc.explanation,
        articleRef: dc.articleRef,
      }));
      setActiveSet(fallbackItems);
    }
  };

  useEffect(() => {
    load3Questions();
  }, []);

  const currentQ = activeSet[currentIndex];

  const handleSelectAnswer = (ans: string) => {
    if (selectedChoice !== null || !currentQ) return;
    setSelectedChoice(ans);
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: ans }));

    const isCorrect = ans === currentQ.correctAnswer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < 2) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoice(null);
    } else {
      // Finish 3 questions
      setIsFinished(true);

      // Save solved question IDs in localStorage
      try {
        const solvedIds: string[] = JSON.parse(
          localStorage.getItem('eldostour_solved_daily_q_ids') || '[]'
        );
        activeSet.forEach((q) => {
          if (!solvedIds.includes(q.id)) solvedIds.push(q.id);
        });
        localStorage.setItem('eldostour_daily_solved_ids', JSON.stringify(solvedIds));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-right">
      {/* 1. Daily Legal Maxim (القاعدة القانونية اليومية) */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 p-5 sm:p-7 shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <Scale className="w-3.5 h-3.5" />
              <span>قاعدة قانونية يومية</span>
            </span>
            <span className="text-[11px] text-amber-400 font-medium">
              أصل {selectedMaxim.origin}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-white mb-2 leading-relaxed">
            «{selectedMaxim.arabic}»
          </h3>

          <p className="text-xs text-amber-300/80 italic font-serif mb-4" dir="ltr">
            {selectedMaxim.original}
          </p>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
            {selectedMaxim.explanation}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>كلية الحقوق - جامعة مدينة السادات</span>
          <span className="text-amber-400">تحديث يومي دوري</span>
        </div>
      </div>

      {/* 2. Dynamic 3-Question Daily Challenge (Part 1.4) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xl text-slate-900 dark:text-white flex flex-col justify-between min-h-[360px]">
        {!isFinished ? (
          /* Answering the 3 Questions */
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
                <Award className="w-3.5 h-3.5" />
                <span>تحدي الـ 3 أسئلة اليومي</span>
                {score > 0 && <span className="mr-1 text-emerald-500 font-black">+{score}</span>}
              </span>

              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                السؤال {currentIndex + 1} من 3
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-5 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / 3) * 100}%` }}
              />
            </div>

            {currentQ ? (
              <>
                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mb-5 leading-relaxed">
                  {currentQ.question}
                </p>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = selectedChoice === opt;
                    const isCorrect = opt === currentQ.correctAnswer;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(opt)}
                        disabled={selectedChoice !== null}
                        className={`p-3 rounded-2xl text-xs sm:text-sm font-bold transition-all border text-right flex items-center justify-between ${
                          selectedChoice === null
                            ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-blue-500 active:scale-95 text-slate-800 dark:text-slate-100'
                            : isCorrect
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                            : isSelected
                            ? 'bg-red-500 text-white border-red-400'
                            : 'opacity-40 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        <span>{opt}</span>
                        {selectedChoice !== null && isCorrect && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>

                {/* Legal Explanation */}
                {selectedChoice !== null && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-bold text-amber-500 block mb-1">السند والتفسير القانوني:</span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-1">
                      {currentQ.explanation}
                    </p>
                    {currentQ.articleRef && (
                      <span className="text-[10px] text-slate-400 font-semibold">
                        📖 {currentQ.articleRef}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : (
          /* RESULT SUMMARY CARD (Part 1.4 Requirement) */
          <div className="my-auto py-2 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                {score === 3 ? 'أداء باهر! العلامة الكاملة 🌟' : score >= 2 ? 'أحسنت! أداء متميز' : 'محاولة تدريبية جيدة'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                نتيجة التحدي: <strong className="text-amber-500 text-base">{score} من 3</strong> أسئلة صحيحة
              </p>
            </div>

            {/* Answers Breakdown */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1 text-right text-xs">
              {activeSet.map((q, idx) => {
                const uAns = userAnswers[idx];
                const isRight = uAns === q.correctAnswer;
                return (
                  <div
                    key={q.id}
                    className={`p-2.5 rounded-xl border text-[11px] ${
                      isRight
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-300'
                    }`}
                  >
                    <p className="font-bold mb-0.5 text-slate-900 dark:text-white truncate">
                      {idx + 1}. {q.question}
                    </p>
                    <p>
                      إجابتك: <strong>{uAns}</strong> • الإجابة الصحيحة: <strong>{q.correctAnswer}</strong>
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Load 3 Fresh Unseen Questions Button */}
            <button
              onClick={load3Questions}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تحدي 3 أسئلة جديدة 🔄</span>
            </button>
          </div>
        )}

        {/* Next Button during test */}
        {!isFinished && selectedChoice !== null && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleNextQuestion}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              {currentIndex < 2 ? 'السؤال التالي' : 'عرض النتيجة والتفسيرات'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
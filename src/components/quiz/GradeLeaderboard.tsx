'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Crown,
  Sparkles,
  Medal,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';
import { AcademicYearId, QuizSubmission } from '@/types';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';

export function GradeLeaderboard() {
  const [selectedYear, setSelectedYear] = useState<AcademicYearId>(1);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('quiz_submissions')
          .select('*, quizzes(title)')
          .eq('year', selectedYear)
          .gte('percentage', 60)
          .order('percentage', { ascending: false })
          .order('score', { ascending: false })
          .limit(10);

        if (!error && data) {
          // De-duplicate multiple submissions by same student to keep top score
          const studentMap = new Map<string, QuizSubmission>();
          for (const sub of data as QuizSubmission[]) {
            const key = sub.student_name.trim().toLowerCase();
            if (!studentMap.has(key) || (studentMap.get(key)!.percentage < sub.percentage)) {
              studentMap.set(key, sub);
            }
          }
          setSubmissions(Array.from(studentMap.values()).slice(0, 10));
        } else {
          setSubmissions([]);
        }
      } catch {
        setSubmissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedYear]);

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-400/30">
          <span>🥇</span>
          <span>المركز الأول</span>
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-md">
          <span>🥈</span>
          <span>المركز الثاني</span>
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-700/80 text-amber-100 font-black text-xs shadow-md">
          <span>🥉</span>
          <span>المركز الثالث</span>
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center border border-slate-700">
        {index + 1}
      </span>
    );
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-slate-950 to-[#0b132b] border border-amber-500/25 rounded-3xl p-4 sm:p-7 shadow-2xl text-right text-white relative overflow-hidden">
      {/* Decorative Golden Ambient Aura */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>لوحة الشرف والأوائل 🏆</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-amber-200/80">
              قائمة أفضل 10 طلاب متفوقين في اختبارات الدستور بحسب الفرقة الدراسية
            </p>
          </div>
        </div>

        {/* Academic Year Tabs (1st to 4th) */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-950/80 border border-white/10 w-full sm:w-auto self-stretch sm:self-auto">
          {ACADEMIC_YEARS.map((year) => (
            <button
              key={year.id}
              onClick={() => setSelectedYear(year.id)}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                selectedYear === year.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {year.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="pt-4 relative z-10">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            <span>جاري استخراج أوائل الفرقة...</span>
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            title="لا توجد نتائج مسجلة لهذه الفرقة حتى الآن"
            description="خض أول اختبار تفاعلي في قسم مادتك لتتصدر لوحة الشرف هنا!"
            icon="book"
          />
        ) : (
          <div className="space-y-2.5">
            {submissions.map((sub, index) => {
              const isTop3 = index < 3;
              return (
                <div
                  key={sub.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    index === 0
                      ? 'bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-transparent border-amber-400/50 shadow-lg shadow-amber-500/10'
                      : index === 1
                      ? 'bg-slate-800/40 border-slate-700/60'
                      : index === 2
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : 'bg-slate-950/50 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{getRankBadge(index)}</div>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-white truncate">
                        {sub.student_name}
                      </h4>
                      {sub.quizzes?.title && (
                        <p className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">
                          {sub.quizzes.title}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-left font-mono">
                      <div className="text-sm sm:text-base font-black text-amber-400">
                        {sub.percentage}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sub.score}/{sub.total_score} نقطة
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

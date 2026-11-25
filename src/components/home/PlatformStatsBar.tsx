'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Award, Layers, Users } from 'lucide-react';

export function PlatformStatsBar() {
  const [stats, setStats] = useState({
    materialsCount: 0,
    quizzesCount: 0,
    studentsCount: 0,
    submissionsCount: 0,
  });

  useEffect(() => {
    fetch('/api/auth/student?type=stats')
      .then((r) => r.json())
      .then((res) => {
        if (res?.success) {
          setStats({
            materialsCount: res.materialsCount || 0,
            quizzesCount: res.quizzesCount || 0,
            studentsCount: res.studentsCount || 0,
            submissionsCount: res.submissionsCount || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const cards = [
    {
      label: 'المحاضرات والملفات',
      value: stats.materialsCount,
      icon: <BookOpen className="w-4 h-4 text-amber-500" />,
      bg: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'الاختبارات التفاعلية',
      value: stats.quizzesCount,
      icon: <Award className="w-4 h-4 text-emerald-500" />,
      bg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'الفرق الدراسية',
      value: '4 فرق',
      icon: <Layers className="w-4 h-4 text-blue-500" />,
      bg: 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'الطلاب والتدريبات',
      value: `${stats.studentsCount} طالب • ${stats.submissionsCount} حل`,
      icon: <Users className="w-4 h-4 text-purple-500" />,
      bg: 'bg-purple-500/10 border-purple-500/25 text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6" dir="rtl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2.5"
          >
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${c.bg}`}>
              {c.icon}
            </div>
            <div className="min-w-0 text-right">
              <span className="block text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {c.value}
              </span>
              <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {c.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

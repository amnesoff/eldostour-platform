'use client';

import React, { useState } from 'react';
import { Calculator, Plus, Trash2, RefreshCcw } from 'lucide-react';

interface CourseRow {
  id: string;
  name: string;
  grade: 'A' | 'B_PLUS' | 'B' | 'C' | 'F';
  hours: number;
}

const GRADE_POINTS: Record<string, { points: number; label: string; minPercent: string }> = {
  A: { points: 4.0, label: 'ممتاز (85% فأكثر)', minPercent: '85%' },
  B_PLUS: { points: 3.3, label: 'جيد جداً (75% - 84%)', minPercent: '75%' },
  B: { points: 2.7, label: 'جيد (65% - 74%)', minPercent: '65%' },
  C: { points: 2.0, label: 'مقبول (50% - 64%)', minPercent: '50%' },
  F: { points: 0.0, label: 'راسب (أقل من 50%)', minPercent: '0%' },
};

export function GpaCalculator() {
  const [courses, setCourses] = useState<CourseRow[]>([
    { id: '1', name: 'المادة الأولى', grade: 'A', hours: 3 },
    { id: '2', name: 'المادة الثانية', grade: 'B_PLUS', hours: 3 },
    { id: '3', name: 'المادة الثالثة', grade: 'B', hours: 2 },
  ]);

  const addCourse = () => {
    setCourses((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: `مادة ${prev.length + 1}`,
        grade: 'A',
        hours: 3,
      },
    ]);
  };

  const removeCourse = (id: string) => {
    if (courses.length <= 1) return;
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCourse = (id: string, field: keyof CourseRow, value: any) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const resetCalculator = () => {
    setCourses([
      { id: '1', name: 'المادة الأولى', grade: 'A', hours: 3 },
      { id: '2', name: 'المادة الثانية', grade: 'B_PLUS', hours: 3 },
    ]);
  };

  // Calculations
  const totalHours = courses.reduce((acc, c) => acc + (Number(c.hours) || 0), 0);
  const totalPoints = courses.reduce(
    (acc, c) => acc + (Number(c.hours) || 0) * (GRADE_POINTS[c.grade]?.points || 0),
    0
  );

  const gpa = totalHours > 0 ? (totalPoints / totalHours).toFixed(2) : '0.00';
  const gpaNum = parseFloat(gpa);

  let gpaLabel = 'مقبول';
  let badgeColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  if (gpaNum >= 3.5) {
    gpaLabel = 'ممتاز مع مرتبة الشرف 🌟';
    badgeColor = 'text-yellow-400 bg-yellow-500/20 border-yellow-400/40';
  } else if (gpaNum >= 3.0) {
    gpaLabel = 'جيد جداً 🎖️';
    badgeColor = 'text-emerald-400 bg-emerald-500/20 border-emerald-400/40';
  } else if (gpaNum >= 2.3) {
    gpaLabel = 'جيد ⚖️';
    badgeColor = 'text-blue-400 bg-blue-500/20 border-blue-400/40';
  } else if (gpaNum < 2.0) {
    gpaLabel = 'إنذار أكاديمي';
    badgeColor = 'text-red-400 bg-red-500/20 border-red-400/40';
  }

  return (
    <div
      id="gpa-calculator"
      className="w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xl text-right text-slate-900 dark:text-white"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">
              حاسبة المعدل التراكمي ومحاكي التقديرات (Sadat Law GPA)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              مخصصة للائحة كلية الحقوق جامعة مدينة السادات
            </p>
          </div>
        </div>

        <button
          onClick={resetCalculator}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-amber-500 flex items-center gap-1 transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>إعادة تعيين</span>
        </button>
      </div>

      {/* Result Display Box */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-300 font-semibold block">
            المعدل الفصلي التقديري:
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-amber-400 tabular-nums">
              {gpa}
            </span>
            <span className="text-xs text-slate-400">من 4.00</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end text-center sm:text-right">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
            {gpaLabel}
          </span>
          <span className="text-[11px] text-slate-300 mt-1">
            إجمالي الساعات المحسوبة: {totalHours} ساعة
          </span>
        </div>
      </div>

      {/* Courses Rows (Stacked 2-line layout on mobile to prevent any horizontal clipping at 360px) */}
      <div className="space-y-3 mb-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2"
          >
            {/* Row 1 on mobile: Course Name input + Delete button */}
            <div className="flex items-center gap-2 w-full sm:flex-1">
              <input
                type="text"
                value={course.name}
                onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                placeholder="اسم المادة"
              />
              <button
                onClick={() => removeCourse(course.id)}
                disabled={courses.length <= 1}
                className="sm:hidden p-2 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 shrink-0"
                aria-label="حذف المادة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2 on mobile: 2-column grid for Grade and Credit Hours dropdowns */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
              <select
                value={course.grade}
                onChange={(e) => updateCourse(course.id, 'grade', e.target.value)}
                className="w-full sm:w-auto h-10 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-amber-500 outline-none"
              >
                {Object.entries(GRADE_POINTS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label} ({info.points})
                  </option>
                ))}
              </select>

              <select
                value={course.hours}
                onChange={(e) => updateCourse(course.id, 'hours', Number(e.target.value))}
                className="w-full sm:w-auto h-10 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold outline-none text-slate-800 dark:text-slate-200"
              >
                <option value={1}>1 ساعة</option>
                <option value={2}>2 ساعة</option>
                <option value={3}>3 ساعات</option>
                <option value={4}>4 ساعات</option>
              </select>
            </div>

            {/* Delete button for desktop */}
            <button
              onClick={() => removeCourse(course.id)}
              disabled={courses.length <= 1}
              className="hidden sm:block p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 shrink-0"
              aria-label="حذف المادة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Course Button */}
      <button
        onClick={addCourse}
        className="w-full py-2.5 rounded-xl border border-dashed border-teal-500/40 hover:border-teal-500 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>إضافة مادة أخرى للحساب</span>
      </button>
    </div>
  );
}

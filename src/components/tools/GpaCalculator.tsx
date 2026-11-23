'use client';

import React, { useState } from 'react';
import { Calculator, Plus, Trash2, RefreshCcw, Award, Layers } from 'lucide-react';

export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D+' | 'D' | 'F';

export interface CourseRow {
  id: string;
  name: string;
  grade: LetterGrade;
  hours: number;
}

export const LETTER_GRADES: Record<
  LetterGrade,
  { points: number; label: string; minPercent: string }
> = {
  'A+': { points: 4.0, label: 'ممتاز مرتفع (A+)', minPercent: '90% فأكثر' },
  'A': { points: 3.7, label: 'ممتاز (A)', minPercent: '85% - 89%' },
  'A-': { points: 3.4, label: 'ممتاز منخفض (A-)', minPercent: '80% - 84%' },
  'B+': { points: 3.3, label: 'جيد جداً مرتفع (B+)', minPercent: '75% - 79%' },
  'B': { points: 3.0, label: 'جيد جداً (B)', minPercent: '70% - 74%' },
  'B-': { points: 2.7, label: 'جيد جداً منخفض (B-)', minPercent: '65% - 69%' },
  'C+': { points: 2.3, label: 'جيد مرتفع (C+)', minPercent: '60% - 64%' },
  'C': { points: 2.0, label: 'مقبول (C)', minPercent: '55% - 59%' },
  'D+': { points: 1.5, label: 'مقبول منخفض (D+)', minPercent: '50% - 54%' },
  'D': { points: 1.0, label: 'ضعيف (D)', minPercent: '45% - 49%' },
  'F': { points: 0.0, label: 'راسب (F)', minPercent: 'أقل من 45%' },
};

export function GpaCalculator() {
  const [courses, setCourses] = useState<CourseRow[]>([
    { id: '1', name: 'القانون المدني', grade: 'A+', hours: 3 },
    { id: '2', name: 'القانون الجنائي', grade: 'A', hours: 3 },
    { id: '3', name: 'الشريعة الإسلامية', grade: 'B+', hours: 2 },
    { id: '4', name: 'القانون الدستوري', grade: 'B', hours: 2 },
  ]);

  // Optional Cumulative GPA Simulator
  const [includePrevious, setIncludePrevious] = useState(false);
  const [prevGpa, setPrevGpa] = useState<string>('3.00');
  const [prevHours, setPrevHours] = useState<string>('30');

  const addCourse = () => {
    setCourses((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: `مادة دراسية ${prev.length + 1}`,
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
      { id: '1', name: 'القانون المدني', grade: 'A+', hours: 3 },
      { id: '2', name: 'القانون الجنائي', grade: 'A', hours: 3 },
      { id: '3', name: 'الشريعة الإسلامية', grade: 'B+', hours: 2 },
    ]);
    setIncludePrevious(false);
    setPrevGpa('3.00');
    setPrevHours('30');
  };

  // Semester Calculations
  const semesterHours = courses.reduce((acc, c) => acc + (Number(c.hours) || 0), 0);
  const semesterPoints = courses.reduce(
    (acc, c) => acc + (Number(c.hours) || 0) * (LETTER_GRADES[c.grade]?.points || 0),
    0
  );

  const semesterGpa = semesterHours > 0 ? (semesterPoints / semesterHours).toFixed(2) : '0.00';
  const semesterGpaNum = parseFloat(semesterGpa);

  // Cumulative Calculations
  const prevGpaNum = parseFloat(prevGpa) || 0;
  const prevHoursNum = parseInt(prevHours, 10) || 0;

  const totalCumulativeHours = includePrevious ? semesterHours + prevHoursNum : semesterHours;
  const totalCumulativePoints = includePrevious
    ? semesterPoints + prevGpaNum * prevHoursNum
    : semesterPoints;

  const cumulativeGpa =
    totalCumulativeHours > 0 ? (totalCumulativePoints / totalCumulativeHours).toFixed(2) : '0.00';
  const cumulativeGpaNum = parseFloat(cumulativeGpa);

  // Standing Evaluator
  const getStanding = (num: number) => {
    if (num >= 3.6) {
      return {
        label: 'ممتاز مع مرتبة الشرف 🌟',
        color: 'text-yellow-400 bg-yellow-500/20 border-yellow-400/40',
      };
    }
    if (num >= 3.0) {
      return {
        label: 'جيد جداً 🎖️',
        color: 'text-emerald-400 bg-emerald-500/20 border-emerald-400/40',
      };
    }
    if (num >= 2.3) {
      return {
        label: 'جيد ⚖️',
        color: 'text-blue-400 bg-blue-500/20 border-blue-400/40',
      };
    }
    if (num >= 2.0) {
      return {
        label: 'مقبول 📜',
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      };
    }
    return {
      label: 'إنذار أكاديمي / ضعيف ⚠️',
      color: 'text-red-400 bg-red-500/20 border-red-400/40',
    };
  };

  const semesterStanding = getStanding(semesterGpaNum);
  const cumulativeStanding = getStanding(cumulativeGpaNum);

  return (
    <div
      id="gpa-calculator"
      className="w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xl text-right text-slate-900 dark:text-white"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">
              حاسبة ومحاكي المعدل التراكمي بنظام النقاط والحروف (Law GPA Calculator)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              نظام الساعات المعتمدة وسلم التقديرات الجامعي من A+ إلى F
            </p>
          </div>
        </div>

        <button
          onClick={resetCalculator}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-amber-500 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>إعادة ضبط</span>
        </button>
      </div>

      {/* Results Display Box (Semester & Cumulative) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {/* Semester GPA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border border-teal-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-teal-400" />
              <span>معدل الفصل الحالي (Semester GPA)</span>
            </span>
            <span className="text-[11px] text-slate-400">{semesterHours} ساعة</span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-400 tabular-nums">
              {semesterGpa}
            </span>
            <span className="text-xs text-slate-400">من 4.00</span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${semesterStanding.color}`}
            >
              {semesterStanding.label}
            </span>
          </div>
        </div>

        {/* Cumulative GPA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border border-amber-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>المعدل التراكمي الإجمالي (Cumulative GPA)</span>
            </span>
            <span className="text-[11px] text-slate-400">{totalCumulativeHours} ساعة مسجلة</span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-black text-teal-300 tabular-nums">
              {cumulativeGpa}
            </span>
            <span className="text-xs text-slate-400">من 4.00</span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cumulativeStanding.color}`}
            >
              {cumulativeStanding.label}
            </span>
          </div>
        </div>
      </div>

      {/* Previous Cumulative Simulator Toggle */}
      <div className="mb-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={includePrevious}
            onChange={(e) => setIncludePrevious(e.target.checked)}
            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
          />
          <span>حساب التراكمي مع الفصول السابقة (إضافة ساعات ومعدل سابق)</span>
        </label>

        {includePrevious && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                المعدل التراكمي السابق (قبل هذا الفصل):
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={prevGpa}
                onChange={(e) => setPrevGpa(e.target.value)}
                placeholder="3.00"
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                عدد الساعات السابقة المكتملة:
              </label>
              <input
                type="number"
                min="0"
                max="160"
                value={prevHours}
                onChange={(e) => setPrevHours(e.target.value)}
                placeholder="30"
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Courses Table / List (2-row stacked mobile layout - Zero horizontal clipping) */}
      <div className="space-y-3">
        <div className="hidden sm:grid sm:grid-cols-12 gap-3 pb-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          <div className="sm:col-span-5">اسم المادة الدراسية</div>
          <div className="sm:col-span-4">التقدير بالحروف (A+ إلى F)</div>
          <div className="sm:col-span-2">الساعات (Credit)</div>
          <div className="sm:col-span-1 text-center">حذف</div>
        </div>

        {courses.map((course, index) => (
          <div
            key={course.id}
            className="p-3 sm:p-2 rounded-2xl sm:rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-center"
          >
            {/* Row 1 on Mobile: Course Name */}
            <div className="sm:col-span-5">
              <input
                type="text"
                value={course.name}
                onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                placeholder={`مادة ${index + 1}`}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Row 2 on Mobile: 2-column grid for Grade + Hours + Delete */}
            <div className="sm:col-span-7 grid grid-cols-12 gap-2 items-center">
              {/* Grade select (Letter scale: A+ to F) */}
              <div className="col-span-7 sm:col-span-7">
                <select
                  value={course.grade}
                  onChange={(e) =>
                    updateCourse(course.id, 'grade', e.target.value as LetterGrade)
                  }
                  className="w-full h-9 px-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  {(Object.keys(LETTER_GRADES) as LetterGrade[]).map((gradeKey) => (
                    <option key={gradeKey} value={gradeKey}>
                      {gradeKey} ({LETTER_GRADES[gradeKey].points} ن) - {LETTER_GRADES[gradeKey].minPercent}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hours select */}
              <div className="col-span-3 sm:col-span-3">
                <select
                  value={course.hours}
                  onChange={(e) => updateCourse(course.id, 'hours', Number(e.target.value))}
                  className="w-full h-9 px-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={1}>1 س</option>
                  <option value={2}>2 س</option>
                  <option value={3}>3 س</option>
                  <option value={4}>4 س</option>
                  <option value={5}>5 س</option>
                </select>
              </div>

              {/* Delete button */}
              <div className="col-span-2 sm:col-span-2 text-center">
                <button
                  type="button"
                  onClick={() => removeCourse(course.id)}
                  disabled={courses.length <= 1}
                  className="w-9 h-9 mx-auto rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-500 hover:text-white text-slate-400 border border-slate-200 dark:border-slate-800 transition-colors flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  title="حذف المادة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Course Button */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <button
          type="button"
          onClick={addCourse}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مادة دراسية أخرى</span>
        </button>

        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          إجمالي الساعات: <strong>{semesterHours}</strong> ساعة
        </span>
      </div>
    </div>
  );
}

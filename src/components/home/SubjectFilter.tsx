'use client';

import React from 'react';
import { BookOpen, FileText, Video, Layers } from 'lucide-react';
import { Subject, MaterialType } from '@/types';

interface SubjectFilterProps {
  subjects: Subject[];
  selectedSubjectId: string | 'all';
  onSelectSubject: (id: string | 'all') => void;
  selectedType: 'all' | MaterialType;
  onSelectType: (type: 'all' | MaterialType) => void;
  isLoading?: boolean;
}

export function SubjectFilter({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  selectedType,
  onSelectType,
  isLoading = false,
}: SubjectFilterProps) {
  return (
    <div className="w-full space-y-4">
      {/* 1. Subjects Pills */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            المواد الدراسية المقررة:
          </span>
          <span className="text-xs text-slate-400">
            {subjects.length} مادة دراسية
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          {/* "الكل" button */}
          <button
            onClick={() => onSelectSubject('all')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              selectedSubjectId === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            جميع المواد (الكل)
          </button>

          {/* Dynamic Subject Buttons */}
          {subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => onSelectSubject(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {sub.name}
              </button>
            );
          })}

          {subjects.length === 0 && !isLoading && (
            <span className="text-xs text-slate-400 italic px-2">
              لا توجد مواد مضافة لهذه الفرقة بعد
            </span>
          )}
        </div>
      </div>

      {/* 2. File Type Pills (All, PDFs, Videos) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 bg-slate-200/60 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onSelectType('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedType === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>الكل</span>
          </button>

          <button
            onClick={() => onSelectType('pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedType === 'pdf'
                ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-red-500" />
            <span>محاضرات PDF</span>
          </button>

          <button
            onClick={() => onSelectType('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedType === 'video'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-blue-500" />
            <span>فيديوهات مباشرة</span>
          </button>
        </div>
      </div>
    </div>
  );
}

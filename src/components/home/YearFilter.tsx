'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookMarked, Scale, Briefcase } from 'lucide-react';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { AcademicYearId } from '@/types';

interface YearFilterProps {
  selectedYear: AcademicYearId;
  onSelectYear: (year: AcademicYearId) => void;
  materialsCountsByYear?: Record<number, number>;
}

export function YearFilter({
  selectedYear,
  onSelectYear,
  materialsCountsByYear = {},
}: YearFilterProps) {
  const yearIcons: Record<number, React.ReactNode> = {
    1: <BookMarked className="w-4 h-4" />,
    2: <Scale className="w-4 h-4" />,
    3: <Briefcase className="w-4 h-4" />,
    4: <GraduationCap className="w-4 h-4" />,
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>اختر الفرقة الدراسية</span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            (تصفية المحاضرات والمواد)
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {ACADEMIC_YEARS.map((year) => {
          const isSelected = selectedYear === year.id;
          const count = materialsCountsByYear[year.id] || 0;

          return (
            <motion.button
              key={year.id}
              onClick={() => onSelectYear(year.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 text-right transition-all border text-slate-900 dark:text-white ${
                isSelected
                  ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-transparent border-amber-500/80 shadow-lg shadow-amber-500/10 dark:bg-slate-900/90'
                  : 'bg-white/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Highlight bar for active state */}
              {isSelected && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500" />
              )}

              <div className="flex items-start justify-between mb-2">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {yearIcons[year.id]}
                </span>

                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count > 0 ? `${count} محتوى` : 'الفرقة'}
                </span>
              </div>

              <div className="font-bold text-base sm:text-lg">
                {year.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                {year.shortName} • {year.description}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

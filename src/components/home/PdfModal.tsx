'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, ExternalLink, Moon, Sun } from 'lucide-react';
import { Material } from '@/types';
import { COLLEGE_NAME } from '@/lib/constants';

interface PdfModalProps {
  material: Material | null;
  onClose: () => void;
}

export function PdfModal({ material, onClose }: PdfModalProps) {
  const [isNightReader, setIsNightReader] = useState(false);
  const [studentWatermark, setStudentWatermark] = useState('');

  useEffect(() => {
    if (!material) return;
    const name = localStorage.getItem('eldostour_student_name') || 'طالب كلية الحقوق';
    const studentId = localStorage.getItem('eldostour_student_id_num') || 'DST-LAW';
    setStudentWatermark(`${name} • ${studentId} • منصة الدستور`);
  }, [material]);

  if (!material) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="p-1.5 rounded-lg bg-red-500/20 text-red-500">
                <FileText className="w-4 h-4" />
              </span>
              <div className="truncate text-right">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {material.title}
                </h3>
                {material.subjects?.name && (
                  <span className="text-[11px] text-amber-500 dark:text-amber-400 font-medium">
                    {material.subjects.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Feature #15: PDF Night Reader Inverter */}
              <button
                onClick={() => setIsNightReader(!isNightReader)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                  isNightReader
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                }`}
                title="عكس ألوان ملف الـ PDF لقراءة مريحة ليلاً"
              >
                {isNightReader ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isNightReader ? 'نهاري' : 'ليلي (Invert)'}</span>
              </button>

              <a
                href={material.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل PDF</span>
              </a>

              <a
                href={material.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="فتح في علامة تبويب جديدة"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-red-500/20 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Iframe preview with Feature #8 Anti-Leak Watermark */}
          <div className="flex-1 w-full bg-slate-200 dark:bg-slate-950 relative overflow-hidden">
            {/* Feature #8: Anti-Leak Student Watermark */}
            <div className="absolute inset-0 z-10 pointer-events-none select-none flex flex-wrap items-center justify-around overflow-hidden opacity-[0.08] dark:opacity-[0.06] rotate-[-25deg] scale-125">
              {Array.from({ length: 16 }).map((_, idx) => (
                <div key={idx} className="p-8 text-center">
                  <span className="text-base font-black text-slate-900 dark:text-white block">{studentWatermark}</span>
                  <span className="text-xs text-amber-500">{COLLEGE_NAME}</span>
                </div>
              ))}
            </div>

            <iframe
              src={`${material.file_url}#toolbar=1`}
              className={`w-full h-full border-none transition-all ${
                isNightReader ? 'filter invert-[0.92] hue-rotate-180 brightness-95 contrast-125' : ''
              }`}
              title={material.title}
            />
          </div>

          {/* Note footer if present */}
          {material.description && (
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-right">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold text-amber-600 dark:text-amber-400 ml-1">توجيه المحاضرة:</span>
                {material.description}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

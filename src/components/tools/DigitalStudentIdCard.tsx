'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IdCard,
  X,
  Share2,
  CheckCircle2,
  Sparkles,
  Printer,
  Scale,
} from 'lucide-react';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { useTheme } from '@/context/ThemeContext';
import { COLLEGE_NAME, PLATFORM_NAME, LEADERSHIP_BAR_TEXT, ACADEMIC_YEARS } from '@/lib/constants';
import { AcademicYearId } from '@/types';

interface DigitalStudentIdCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DigitalStudentIdCard({ isOpen, onClose }: DigitalStudentIdCardProps) {
  const { gender } = useTheme();
  const [studentName, setStudentName] = useState('');
  const [year, setYear] = useState<AcademicYearId>(1);
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('eldostour_student_name') || '';
    const savedYear = Number(localStorage.getItem('eldostour_student_year')) || 1;
    let savedId = localStorage.getItem('eldostour_student_id_num');

    if (!savedId) {
      savedId = `DST-${Math.floor(100000 + Math.random() * 900000)}`;
      localStorage.setItem('eldostour_student_id_num', savedId);
    }

    setStudentName(savedName || 'طالب حقوق السادات');
    setYear((savedYear >= 1 && savedYear <= 4 ? savedYear : 1) as AcademicYearId);
    setStudentIdNumber(savedId);
  }, []);

  const handleSaveInfo = (name: string, y: AcademicYearId) => {
    setStudentName(name);
    setYear(y);
    localStorage.setItem('eldostour_student_name', name);
    localStorage.setItem('eldostour_student_year', String(y));
  };

  const currentYearObj = ACADEMIC_YEARS.find((y) => y.id === year) || ACADEMIC_YEARS[0];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `بطاقة طالب منصة الدستور - ${studentName}`,
          text: `بطاقتي الأكاديمية الرقمية بكلية الحقوق جامعة مدينة السادات - منصة الدستور التعليمية (${currentYearObj.name})`,
          url: window.location.origin,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(
        `بطاقة الطالب: ${studentName} - ${currentYearObj.name} - كلية الحقوق جامعة مدينة السادات - منصة الدستور التعليمية (رقم القيد: ${studentIdNumber})`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const isBurgundy = gender === 'burgundy';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md text-right text-slate-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">بطاقة الطالب الرقمية المعتمدة</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                كارنيه إلكتروني يحمل بياناتك الأكاديمية ورقم القيد بمنصة الدستور
              </p>
            </div>
          </div>

          {/* Edit Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم الطالب الثلاثي:
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => handleSaveInfo(e.target.value, year)}
                placeholder="أدخل اسمك الثلاثي..."
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                الفرقة الدراسية:
              </label>
              <select
                value={year}
                onChange={(e) => handleSaveInfo(studentName, Number(e.target.value) as AcademicYearId)}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CARD PREVIEW AREA */}
          <div className="overflow-y-auto pr-1 pb-1">
            <div
              ref={cardRef}
              id="printable-student-card"
              className={`relative rounded-3xl p-5 sm:p-6 shadow-2xl text-white border overflow-hidden select-none transition-all ${
                isBurgundy
                  ? 'bg-gradient-to-br from-[#5C0A1E] via-[#800020] to-[#2B040D] border-rose-400/40'
                  : 'bg-gradient-to-br from-[#0B1B3D] via-[#0F295A] to-[#060D1E] border-amber-400/40'
              }`}
            >
              {/* Subtle Guilloche / Geometric Background Pattern */}
              <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

              {/* Watermark in Card */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <Scale className="w-48 h-48 text-white" />
              </div>

              {/* Top Row: College & Platform Info */}
              <div className="relative z-10 flex items-center justify-between gap-3 pb-3 border-b border-white/15">
                <div className="flex items-center gap-2.5">
                  <AnimatedLogo size="sm" showText={false} />
                  <div>
                    <h4 className="font-black text-sm text-white tracking-wide">{PLATFORM_NAME}</h4>
                    <p className="text-[10px] text-amber-300 font-medium">{COLLEGE_NAME}</p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>بطاقة طالب معتمدة</span>
                  </span>
                  <span className="block text-[9px] text-slate-300 mt-0.5 font-mono" dir="ltr">
                    ID: {studentIdNumber}
                  </span>
                </div>
              </div>

              {/* Middle Row: Student Photo / Crest + Name & Academic Details */}
              <div className="relative z-10 my-4 flex items-center gap-4">
                {/* Crest / Photo placeholder */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-amber-400/50 flex items-center justify-center p-2 shrink-0 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="الشعار" className="w-full h-full object-contain" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-slate-300 block mb-0.5">اسم الطالب:</span>
                  <h3 className="text-lg sm:text-xl font-black text-white truncate mb-1.5">
                    {studentName || 'اسم الطالب'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/15 text-amber-300 font-bold border border-white/10">
                      {currentYearObj.name}
                    </span>
                    <span className="text-[11px] text-slate-300">
                      {isBurgundy ? 'طالبة نظامية' : 'طالب نظامي'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Barcode + Leadership signature */}
              <div className="relative z-10 pt-3 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-slate-300">
                <div>
                  <span className="block font-semibold text-amber-300">{LEADERSHIP_BAR_TEXT}</span>
                  <span className="text-[9px] text-slate-400">العام الجامعي 2026/2027</span>
                </div>

                {/* Simulated Barcode */}
                <div className="flex items-center gap-0.5 h-6 bg-white/90 px-2 py-1 rounded">
                  {[4, 2, 6, 3, 5, 2, 7, 3, 4, 2, 6, 3, 5, 2, 6, 3].map((h, i) => (
                    <div
                      key={i}
                      className="w-[2px] bg-slate-900"
                      style={{ height: `${h * 2.5}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / حفظ PDF</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all active:scale-95"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'تم نسخ البيانات' : 'مشاركة البطاقة'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
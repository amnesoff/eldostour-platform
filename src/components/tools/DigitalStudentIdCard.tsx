'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IdCard,
  X,
  Share2,
  CheckCircle2,
  Check,
  Sparkles,
  Printer,
  Scale,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
  Camera,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { useTheme } from '@/context/ThemeContext';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { COLLEGE_NAME, PLATFORM_NAME, LEADERSHIP_BAR_TEXT, ACADEMIC_YEARS } from '@/lib/constants';
import { AcademicYearId, StudyType } from '@/types';
import { compressImageFile } from '@/lib/authUtils';

interface DigitalStudentIdCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DigitalStudentIdCard({ isOpen, onClose }: DigitalStudentIdCardProps) {
  const { gender } = useTheme();
  const { student, isGuest, openAuthModal, updateStudentProfile } = useStudentAuth();

  const [studentName, setStudentName] = useState('');
  const [year, setYear] = useState<AcademicYearId>(1);
  const [studyType, setStudyType] = useState<StudyType>('انتظام');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with authenticated student or fallback guest/local state
  useEffect(() => {
    if (student && !isGuest) {
      setStudentName(student.full_name);
      setYear(student.academic_year);
      setStudentIdNumber(student.student_code);
      setStudentEmail(student.email || '');
      setStudyType(student.study_type || 'انتظام');
      setAvatarUrl(student.avatar_url || '');
    } else {
      const savedName = localStorage.getItem('eldostour_student_name') || '';
      const savedYear = Number(localStorage.getItem('eldostour_student_year')) || 1;
      const savedStudy = (localStorage.getItem('eldostour_study_type') as StudyType) || 'انتظام';
      const savedAvatar = localStorage.getItem('eldostour_avatar_url') || '';
      let savedId = localStorage.getItem('eldostour_student_id_num');

      if (!savedId) {
        savedId = `G-101`;
        localStorage.setItem('eldostour_student_id_num', savedId);
      }

      setStudentName(savedName || 'طالب زائر');
      setYear((savedYear >= 1 && savedYear <= 4 ? savedYear : 1) as AcademicYearId);
      setStudentIdNumber(savedId);
      setStudentEmail('');
      setStudyType(savedStudy);
      setAvatarUrl(savedAvatar);
    }
  }, [student, isGuest, isOpen]);

  const handleSaveInfo = async (name: string, y: AcademicYearId, st: StudyType) => {
    setStudentName(name);
    setYear(y);
    setStudyType(st);
    localStorage.setItem('eldostour_student_name', name);
    localStorage.setItem('eldostour_student_year', String(y));
    localStorage.setItem('eldostour_study_type', st);

    if (student && !isGuest) {
      await updateStudentProfile({
        full_name: name,
        academic_year: y,
        study_type: st,
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdatingPhoto(true);
    try {
      const compressed = await compressImageFile(file, 400);
      setAvatarUrl(compressed);
      localStorage.setItem('eldostour_avatar_url', compressed);

      if (student && !isGuest) {
        await updateStudentProfile({ avatar_url: compressed });
      }
    } catch {
      alert('فشل رفع الصورة، يرجى المحاولة بصورة أخرى');
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const currentYearObj = ACADEMIC_YEARS.find((y) => y.id === year) || ACADEMIC_YEARS[0];
  const isRegistered = Boolean(student && !isGuest);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `بطاقة طالب منصة الدستور - ${studentName}`,
          text: `بطاقتي الأكاديمية الرقمية - منصة الدستور التعليمية (${currentYearObj.name} - ${studyType}) - رقم القيد: ${studentIdNumber}`,
          url: typeof window !== 'undefined' ? window.location.origin : '',
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(
        `بطاقة الطالب: ${studentName} - ${currentYearObj.name} (${studyType}) - منصة الدستور التعليمية (رقم القيد: ${studentIdNumber})`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteMyAccount = async () => {
    if (!student || isGuest) return;
    const confirm1 = window.confirm(
      'هل أنت متأكد من رغبتك في حذف حسابك وبياناتك الشخصية نهائياً من منصة الدستور وفقاً للمادة 17 من العقد القانوني (قانون 151 لسنة 2020)؟ سيتم شطب حسابك فورياً.'
    );
    if (!confirm1) return;

    try {
      await supabase.from('students').delete().eq('id', student.id);
      localStorage.clear();
      sessionStorage.clear();
      alert('تم حذف حسابك وبياناتك الشخصية بنجاح.');
      window.location.reload();
    } catch (err: any) {
      alert('فشل حذف الحساب: ' + (err?.message || 'خطأ غير متوقع'));
    }
  };

  if (!isOpen) return null;

  // Determine gender styling: prefer student's registered gender, fallback to theme
  const isFemale = student ? student.gender === 'female' : gender === 'burgundy';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md text-right text-slate-900 dark:text-white" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">بطاقة الطالب الرقمية المعتمدة</h3>
                {isRegistered ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>حساب رسمي موثق</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                    <AlertCircle className="w-3 h-3" />
                    <span>وضع الزائر</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                كارنيه إلكتروني يحمل بياناتك الأكاديمية، الشعبة، ورقم القيد بمنصة الدستور
              </p>
            </div>
          </div>

          {/* Guest Registration Banner */}
          {!isRegistered && (
            <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  سجل حسابك مجاناً لإصدار رقم القيد الأكاديمي الدائم وتوثيق كارنيهك الرسمي.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  openAuthModal('register');
                }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>تسجيل حساب طالب</span>
              </button>
            </div>
          )}

          {/* Study System & Grade Selector Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs">
            {/* Study System Selection (الشعبة) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                الشعبة:
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSaveInfo(studentName, year, 'انتظام')}
                  className={`flex-1 h-8 rounded-lg font-bold transition-all text-xs ${studyType === 'انتظام'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                >
                  انتظام
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInfo(studentName, year, 'انتساب')}
                  className={`flex-1 h-8 rounded-lg font-bold transition-all text-xs ${studyType === 'انتساب'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                >
                  انتساب
                </button>
              </div>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                الفرقة الدراسية:
              </label>
              <select
                value={year}
                onChange={(e) =>
                  handleSaveInfo(studentName, Number(e.target.value) as AcademicYearId, studyType)
                }
                className="w-full h-8 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Photo Upload Shortcut */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                صورتك الشخصية:
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdatingPhoto}
                className="w-full h-8 px-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Camera className="w-3.5 h-3.5 text-amber-500" />
                <span>{avatarUrl ? 'تغيير صورتك' : 'رفع صورتك'}</span>
              </button>
            </div>
          </div>

          {/* CARD PREVIEW AREA */}
          <div className="overflow-y-auto pr-1 pb-1">
            <div
              ref={cardRef}
              id="printable-student-card"
              className={`relative rounded-3xl p-5 sm:p-6 shadow-2xl text-white border overflow-hidden select-none transition-all ${isFemale
                ? 'bg-gradient-to-br from-[#4A0818] via-[#75001C] to-[#25030A] border-rose-400/40'
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
                  <div className="flex items-center gap-1 justify-end flex-wrap">
                    {student?.is_verified && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] shadow-sm">
                        <Check className="w-2.5 h-2.5" />
                        <span>عضو معتمد رسمياً ✓</span>
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-[10px] shadow-sm ${isRegistered ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300 border border-amber-400/30'
                        }`}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{isRegistered ? 'بطاقة طالب معتمدة' : 'معاينة زائر'}</span>
                    </span>
                  </div>
                  <span className="block text-[10px] text-amber-300 mt-0.5 font-mono font-bold" dir="ltr">
                    ID: {studentIdNumber}
                  </span>
                </div>
              </div>

              {/* Middle Row: Student Photo + Name & Academic Details */}
              <div className="relative z-10 my-4 flex items-center gap-4">
                {/* Student Photo Box with direct change trigger */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-white/10 border-2 border-amber-400/60 overflow-hidden flex items-center justify-center shrink-0 shadow-lg cursor-pointer hover:border-amber-300 transition-all"
                  title="انقر لرفع صورتك الشخصية على الكارنيه"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="صورة الطالب" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="الشعار" className="w-10 h-10 object-contain opacity-80" />
                      <span className="text-[9px] text-amber-300/80 mt-1">أضف صورتك</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-slate-300 block mb-0.5">اسم الطالب:</span>
                  <h3 className="text-lg sm:text-xl font-black text-white truncate mb-1.5">
                    {studentName || 'اسم الطالب'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/15 text-amber-300 font-bold border border-white/10 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      <span>{currentYearObj.name}</span>
                    </span>

                    {/* Gender + Study System Badge (طالب/طالبة انتظام أو انتساب) */}
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/20 text-white font-bold border border-amber-400/30 text-[11px]">
                      {isFemale
                        ? studyType === 'انتساب'
                          ? 'طالبة انتساب 🟣'
                          : 'طالبة انتظام 🟣'
                        : studyType === 'انتساب'
                          ? 'طالب انتساب 🔵'
                          : 'طالب انتظام 🔵'}
                    </span>

                    {studentEmail && (
                      <span className="text-[10px] text-slate-300 font-mono truncate max-w-[160px] hidden sm:inline" dir="ltr">
                        {studentEmail}
                      </span>
                    )}
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
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / حفظ PDF</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all active:scale-95 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'تم نسخ البيانات' : 'مشاركة البطاقة'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {student && !isGuest && (
                <button
                  type="button"
                  onClick={handleDeleteMyAccount}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold border border-rose-500/20 transition-all cursor-pointer"
                  title="حق محو البيانات وحذف الحساب نهائياً طبقاً للمادة 17 من العقد"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف حسابي وبياناتي نهائياً (حماية البيانات)</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

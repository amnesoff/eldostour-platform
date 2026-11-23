'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Lock,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Phone,
  Camera,
  UserCheck,
} from 'lucide-react';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { AcademicYearId, StudentGender, StudyType } from '@/types';
import { ACADEMIC_YEARS, COLLEGE_NAME, PLATFORM_NAME } from '@/lib/constants';
import { compressImageFile } from '@/lib/authUtils';

export function StudentAuthModal() {
  const {
    student,
    isGuest,
    isAuthModalOpen,
    closeAuthModal,
    modalDefaultMode,
    login,
    register,
    registerGuest,
  } = useStudentAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'guest'>('register');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<StudentGender>('male');
  const [academicYear, setAcademicYear] = useState<AcademicYearId>(1);
  const [studyType, setStudyType] = useState<StudyType>('انتظام');
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with trigger
  useEffect(() => {
    if (modalDefaultMode) {
      setMode(modalDefaultMode);
    }
  }, [modalDefaultMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 380);
      setAvatarPreview(compressed);
    } catch {
      setError('فشل قراءة الصورة، يرجى اختيار صورة أخرى');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const res = await register({
          full_name: fullName,
          email,
          password,
          gender,
          academic_year: academicYear,
          study_type: studyType,
          avatar_url: avatarPreview,
          phone,
        });

        if (!res.success) {
          setError(res.error || 'حدث خطأ أثناء التسجيل');
        } else {
          setSuccess('تم إنشاء الحساب وإصدار الكارنيه الجامعي بنجاح!');
        }
      } else if (mode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'فشل تسجيل الدخول');
        } else {
          setSuccess('تم تسجيل الدخول بنجاح!');
        }
      } else if (mode === 'guest') {
        const res = await registerGuest({
          full_name: fullName,
          phone,
          academic_year: academicYear,
          gender,
          study_type: studyType,
        });

        if (!res.success) {
          setError(res.error || 'فشل المتابعة كزائر');
        } else {
          setSuccess('تم تسجيل بيانات الزائر بنجاح، جاري الدخول للمنصة...');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only allow manual closing if user is already authenticated or guest
  const canClose = Boolean(student || isGuest);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md text-right text-slate-900 dark:text-white"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Close button (allowed if already logged in or guest) */}
          {canClose && (
            <button
              onClick={closeAuthModal}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header */}
          <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center mb-1.5 shadow-inner">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {mode === 'register'
                ? 'تسجيل حساب طالب جديد'
                : mode === 'guest'
                ? 'الدخول كزائر للمنصة'
                : 'تسجيل دخول الطالب'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {COLLEGE_NAME} • {PLATFORM_NAME}
            </p>
          </div>

          {/* Switch Mode Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 my-3 border border-slate-200/80 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              حساب رسمي
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              تسجيل دخول
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('guest');
                setError('');
              }}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'guest'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              الدخول كزائر
            </button>
          </div>

          {/* Notice for Guest Mode */}
          {mode === 'guest' && (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] leading-relaxed flex items-start gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                للمتابعة كزائر، يرجى كتابة اسمك الحقيقي ورقم هاتفك المصري للتوثيق والاستفادة من
                المحاضرات والمذكرات.
              </span>
            </div>
          )}

          {/* Form Area */}
          <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1 pb-1">
            {/* FULL NAME (in register & guest mode) */}
            {(mode === 'register' || mode === 'guest') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل (ثلاثي أو ثنائي):
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أحمد محمد محمود"
                    className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* EGYPTIAN MOBILE NUMBER (Required in guest mode, optional in register) */}
            {(mode === 'register' || mode === 'guest') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف المحمول (مصر - 11 رقماً):
                  {mode === 'guest' && <span className="text-red-500 mr-1">*</span>}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required={mode === 'guest'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 01012345678 أو 011... أو 012... أو 015..."
                    dir="ltr"
                    className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono text-right"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  يبدأ بـ 010 أو 011 أو 012 أو 015
                </span>
              </div>
            )}

            {/* EMAIL (Required in login & register) */}
            {(mode === 'register' || mode === 'login') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني (Gmail):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    dir="ltr"
                    className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono text-right"
                  />
                </div>
              </div>
            )}

            {/* PASSWORD (Required in login & register) */}
            {(mode === 'register' || mode === 'login') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة المرور:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full h-10 pr-9 pl-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* GENDER & STUDY SYSTEM (in register & guest mode) */}
            {(mode === 'register' || mode === 'guest') && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    النوع:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                        gender === 'male'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      طالب 🔵
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                        gender === 'female'
                          ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      طالبة 🟣
                    </button>
                  </div>
                </div>

                {/* Study System (انتظام vs انتساب) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الشعبة الدراسية:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStudyType('انتظام')}
                      className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                        studyType === 'انتظام'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      انتظام
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudyType('انتساب')}
                      className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                        studyType === 'انتساب'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      انتساب
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ACADEMIC YEAR (in register & guest mode) */}
            {(mode === 'register' || mode === 'guest') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الفرقة الدراسية المقيد بها:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {ACADEMIC_YEARS.map((y) => (
                    <button
                      key={y.id}
                      type="button"
                      onClick={() => setAcademicYear(y.id)}
                      className={`h-9 px-2 rounded-xl border text-xs font-bold transition-all ${
                        academicYear === y.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {y.shortName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROFILE PHOTO UPLOAD (in register mode) */}
            {mode === 'register' && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 border-2 border-amber-500/40 overflow-hidden flex items-center justify-center shrink-0">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPreview}
                        alt="معاينة الصورة"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">{gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      صورة الكارنيه الشخصية
                    </span>
                    <span className="text-[10px] text-slate-400">
                      اختياري • ستظهر على بطاقتك الجامعية
                    </span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{avatarPreview ? 'تغيير' : 'اختيار صورة'}</span>
                </button>
              </div>
            )}

            {/* Error & Success Messages */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'register' ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>إنشاء الحساب وإصدار الكارنيه الجامعي</span>
                  </>
                ) : mode === 'guest' ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>متابعة الدخول كزائر 🚀</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>تسجيل الدخول للمنصة</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

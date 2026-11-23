'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { AcademicYearId, StudentGender } from '@/types';
import { ACADEMIC_YEARS, COLLEGE_NAME, PLATFORM_NAME } from '@/lib/constants';

export function StudentAuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register, continueAsGuest } =
    useStudentAuth();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<StudentGender>('male');
  const [academicYear, setAcademicYear] = useState<AcademicYearId>(1);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isAuthModalOpen) return null;

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
        });

        if (!res.success) {
          setError(res.error || 'حدث خطأ أثناء التسجيل');
        } else {
          setSuccess('تم إنشاء الحساب وإصدار الكارنيه الجامعي بنجاح!');
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'فشل تسجيل الدخول');
        } else {
          setSuccess('تم تسجيل الدخول بنجاح!');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md text-right text-slate-900 dark:text-white" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center mb-2 shadow-inner">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {mode === 'register' ? 'تسجيل حساب طالب جديد' : 'تسجيل دخول الطالب'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {COLLEGE_NAME} • {PLATFORM_NAME}
            </p>
          </div>

          {/* Switch Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 my-4 border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-white'
              }`}
            >
              تسجيل حساب جديد
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-white'
              }`}
            >
              تسجيل الدخول
            </button>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto pr-1">
            {mode === 'register' && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الاسم ثلاثي (كما سيظهر في الكارنيه الجامعي) *:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: أحمد محمد علي"
                      required
                      className="w-full h-11 pr-10 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 outline-none"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Gender Distinction (طالب vs طالبة) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    النوع (لتخصيص هوية الكارنيه) *:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-bold ${
                        gender === 'male'
                          ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="text-base">👨‍🎓</span>
                      <span>طالب (أزرق ملكي)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-bold ${
                        gender === 'female'
                          ? 'bg-rose-600/15 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="text-base">👩‍🎓</span>
                      <span>طالبة (عنابي راقي)</span>
                    </button>
                  </div>
                </div>

                {/* Academic Year Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الفرقة الدراسية المقيد بها *:
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(Number(e.target.value) as AcademicYearId)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 outline-none"
                  >
                    {ACADEMIC_YEARS.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Email / Gmail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                البريد الإلكتروني (Gmail) *:
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  className="w-full h-11 pr-10 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 outline-none text-left"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور *:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pr-10 pl-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 outline-none text-left"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-white absolute left-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ المعالجة...</span>
                </>
              ) : mode === 'register' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>إنشاء الحساب وإصدار الكارنيه الجامعي</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>تسجيل الدخول للمنصة</span>
                </>
              )}
            </button>

            {/* Continue as Guest Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={continueAsGuest}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                الدخول كزائر (تصفح المحاضرات بدون حساب)
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

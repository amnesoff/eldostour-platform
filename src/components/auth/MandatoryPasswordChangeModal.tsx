'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { useStudentAuth } from '@/context/StudentAuthContext';

export function MandatoryPasswordChangeModal() {
  const { student, updateStudentLocally, changePassword } = useStudentAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Only display if student is logged in AND must_change_password is true
  if (!student || !student.must_change_password) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('يجب ألا تقل كلمة المرور الشخصية عن 8 خانات وتحتوي على أحرف وأرقام');
      return;
    }

    if (newPassword === 'AlDustour@2006@999#111#111') {
      setError('لا يمكن استخدام الباسورد الموحد. يرجى اختيار كلمة مرور شخصية جديدة تماماً خاصة بك.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين، يرجى التأكد وإعادة المحاولة');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(newPassword);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          updateStudentLocally({ ...student, must_change_password: false });
        }, 1200);
      } else {
        setError(res.error || 'فشل تحديث كلمة المرور');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl text-right text-slate-900 dark:text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mandatory-reset-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/20 relative overflow-hidden"
        >
          {/* Top Security Glow Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 animate-pulse" />

          {/* Header Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
              <ShieldAlert className="w-9 h-9 animate-bounce" />
            </div>
            <h2 id="mandatory-reset-title" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
              تحديث كلمة المرور الإلزامي لحماية حسابك
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              مرحباً <span className="font-bold text-amber-500">{student.full_name}</span>، تم تسجيل دخولك بنجاح. نظراً لإجراءات الأمان المشددة، يتعين عليك الآن تعيين كلمة مرور شخصية قوية جديدة قبل الوصول إلى محتوى المنصة.
            </p>
          </div>

          {success ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-center flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-500 animate-pulse" />
              <p className="font-bold text-base">تم تحديث كلمة المرور وتأمين حسابك بنجاح! 🔒</p>
              <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">جاري نقلك إلى المنصة فوراً...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة المرور الشخصية الجديدة <span className="text-amber-500">* (8 خانات كحد أدنى)</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-10 py-2.5 text-sm font-sans focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تأكيد كلمة المرور الجديدة <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-10 py-2.5 text-sm font-sans focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التشفير والحفظ...</span>
                    </>
                  ) : (
                    <span>تأكيد كلمة المرور والدخول إلى المنصة 🚀</span>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-500 dark:text-slate-500">
                🔒 كلمة المرور يتم تشفيرها وتمليحها (Salted Hashing) ولا يمكن لأحد الاطلاع عليها.
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

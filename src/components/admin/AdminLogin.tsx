'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const validPassword =
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'Dostour@2026';

    setTimeout(() => {
      if (password.trim() === validPassword) {
        sessionStorage.setItem('eldostour_admin_auth', 'authenticated');
        sessionStorage.setItem('eldostour_admin_login_time', Date.now().toString());
        onSuccess();
      } else {
        setError('كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#060b18] via-[#0B132B] to-[#040813] text-white p-4 select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-right"
      >
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-4 text-amber-400 shadow-lg shadow-amber-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <Logo size="md" showSubtitle={false} />
          <h2 className="text-xl font-bold text-white mt-3">
            لوحة تحكم المشرفين
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            منطقة مخصصة لإدارة المحتوى الأكاديمي لمنصة الدستور
          </p>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold mb-5"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة مرور المشرف (Admin Password):
            </label>
            <div className="relative">
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4 text-amber-400/80" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                required
                className="w-full h-12 pr-11 pl-11 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white text-sm outline-none transition-all text-right"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
              <span>جلسة تسجيل الدخول آمنة ومشفرة</span>
              <span className="text-amber-400/80">مهلة عدم النشاط: 30 دقيقة</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            <span>{loading ? 'جارٍ التحقق...' : 'دخول لوحة التحكم'}</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-white/10 text-center text-xs text-slate-500">
          <span>إشراف: مازن شكري • رحمة علاء • وليد محرم</span>
        </div>
      </motion.div>
    </div>
  );
}

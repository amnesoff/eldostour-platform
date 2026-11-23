'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, Heart, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';

export function GenderWelcomeModal() {
  const { showGenderModal, setGender, closeGenderModal } = useTheme();

  if (!showGenderModal) return null;

  const handleSelect = (g: 'blue' | 'burgundy') => {
    setGender(g);
    closeGenderModal();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden"
        >
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <AnimatedLogo size="lg" showText={false} />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مرحباً بك في منصة الدستور</span>
          </span>

          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            منصة الدستور التعليمية المستقلة
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            اختر مظهر وألوان المنصة المفضلة لتخصيص تجربتك الدراسية:
          </p>

          {/* Two Choice Cards */}
          <div className="grid grid-cols-2 gap-3.5 mb-6">
            {/* Student (Male) - Blue */}
            <button
              onClick={() => handleSelect('blue')}
              className="group relative flex flex-col items-center p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 transition-all active:scale-95 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <User className="w-6 h-6" />
              </div>
              <span className="text-base font-bold text-blue-950 dark:text-blue-100 mb-1">
                طالب
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                الأزرق الملكي
              </span>
              <div className="mt-2 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Student (Female) - Burgundy */}
            <button
              onClick={() => handleSelect('burgundy')}
              className="group relative flex flex-col items-center p-4 rounded-2xl bg-rose-50 dark:bg-[#2b0813]/60 hover:bg-rose-100 dark:hover:bg-[#3b0b1a]/80 border-2 border-rose-200 dark:border-[#800020]/70 hover:border-[#800020] transition-all active:scale-95 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-[#800020] text-white flex items-center justify-center mb-3 shadow-md shadow-rose-900/30 group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6" />
              </div>
              <span className="text-base font-bold text-rose-950 dark:text-rose-100 mb-1">
                طالبة
              </span>
              <span className="text-[11px] text-[#9B1B30] dark:text-rose-300 font-medium">
                البرجندي الملكي
              </span>
              <div className="mt-2 w-4 h-4 rounded-full bg-[#800020] flex items-center justify-center text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            يمكنك تغيير اللون والوضع (ليلي / نهاري) في أي وقت لاحقاً من الشريط العلوي.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

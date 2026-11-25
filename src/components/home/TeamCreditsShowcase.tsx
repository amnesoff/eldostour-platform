'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Award, ShieldCheck, Heart, Sparkles } from 'lucide-react';

interface TeamCreditsShowcaseProps {
  compact?: boolean;
}

export function TeamCreditsShowcase({ compact = false }: TeamCreditsShowcaseProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-950/90 border border-amber-500/25 ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
      } shadow-xl`}
      dir="rtl"
    >
      {/* 4 Corners: Subtle glowing hearts in varying colors */}
      <Heart
        aria-hidden="true"
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 fill-rose-500/80 absolute top-2.5 right-2.5 drop-shadow-[0_0_8px_rgba(244,63,94,0.85)] animate-pulse motion-reduce:animate-none pointer-events-none"
      />
      <Heart
        aria-hidden="true"
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400/80 absolute top-2.5 left-2.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)] animate-pulse motion-reduce:animate-none pointer-events-none"
      />
      <Heart
        aria-hidden="true"
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 fill-sky-400/80 absolute bottom-2.5 right-2.5 drop-shadow-[0_0_8px_rgba(56,189,248,0.85)] animate-pulse motion-reduce:animate-none pointer-events-none"
      />
      <Heart
        aria-hidden="true"
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400 fill-violet-400/80 absolute bottom-2.5 left-2.5 drop-shadow-[0_0_8px_rgba(167,139,250,0.85)] animate-pulse motion-reduce:animate-none pointer-events-none"
      />

      {/* Row 1: مازن شكري <--> 💓💍 <--> رحمة علاء */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 mb-3">
        {/* 1. مازن شكري — المؤسس (Red Glow) */}
        <div className="w-full sm:w-auto flex-1 flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-950/35 border border-red-500/45 shadow-[0_0_18px_rgba(239,68,68,0.35)]">
          <Crown className="w-4 h-4 text-red-400 shrink-0 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
          <div className="text-right sm:text-center">
            <span className="block text-sm sm:text-base font-black text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.85)]">
              مازن شكري
            </span>
            <span className="block text-[10px] font-bold text-red-200/90">المؤسس</span>
          </div>
        </div>

        {/* Centered Beating Heart + Ring specifically between مازن شكري and رحمة علاء */}
        <motion.div
          animate={{ scale: [1, 1.18, 1, 1.14, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/35 shadow-[0_0_15px_rgba(239,68,68,0.45)] motion-reduce:animate-none"
          aria-label="قلب نابض وخاتم"
        >
          <span className="text-base sm:text-lg leading-none" role="img" aria-hidden="true">
            💓
          </span>
          <span className="text-sm sm:text-base leading-none" role="img" aria-hidden="true">
            💍
          </span>
        </motion.div>

        {/* 2. رحمة علاء — المشرف العام (Red Glow) */}
        <div className="w-full sm:w-auto flex-1 flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-950/35 border border-red-500/45 shadow-[0_0_18px_rgba(239,68,68,0.35)]">
          <Award className="w-4 h-4 text-red-400 shrink-0 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
          <div className="text-right sm:text-center">
            <span className="block text-sm sm:text-base font-black text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.85)]">
              رحمة علاء
            </span>
            <span className="block text-[10px] font-bold text-red-200/90">المشرف العام</span>
          </div>
        </div>
      </div>

      {/* Row 2: وليد محرم & جواد & ندى زيد */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 3. وليد محرم — مشرف إداري (Soft White Glow + Smooth Motion) */}
        <motion.div
          animate={{ y: [0, -2.5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/25 shadow-[0_0_14px_rgba(255,255,255,0.22)] motion-reduce:transform-none"
        >
          <ShieldCheck className="w-4 h-4 text-white shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]" />
          <div className="text-right sm:text-center">
            <span className="block text-xs sm:text-sm font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]">
              وليد محرم
            </span>
            <span className="block text-[10px] font-semibold text-slate-300">مشرف إداري</span>
          </div>
        </motion.div>

        {/* 4. جواد — مشرف إداري (Soft White Glow + Smooth Motion) */}
        <motion.div
          animate={{ y: [0, -2.5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/25 shadow-[0_0_14px_rgba(255,255,255,0.22)] motion-reduce:transform-none"
        >
          <ShieldCheck className="w-4 h-4 text-white shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]" />
          <div className="text-right sm:text-center">
            <span className="block text-xs sm:text-sm font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]">
              جواد
            </span>
            <span className="block text-[10px] font-semibold text-slate-300">مشرف إداري</span>
          </div>
        </motion.div>

        {/* 5. ندى زيد — مشرف عام (Gold Glow + Twinkling Stars) */}
        <div className="relative flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-950/35 border border-amber-400/50 shadow-[0_0_18px_rgba(245,158,11,0.35)]">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse motion-reduce:animate-none drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
          <div className="text-right sm:text-center flex items-center gap-1.5 sm:block">
            <span className="text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.85)] flex items-center justify-center gap-1">
              <span className="text-amber-300 animate-pulse motion-reduce:animate-none text-[10px]">✦</span>
              <span>ندى زيد</span>
              <span className="text-amber-300 animate-pulse motion-reduce:animate-none text-[10px]">✦</span>
            </span>
            <span className="block text-[10px] font-bold text-amber-200/90">مشرف عام</span>
          </div>
        </div>
      </div>
    </div>
  );
}

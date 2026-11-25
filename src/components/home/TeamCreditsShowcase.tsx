'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Award, ShieldCheck, Sparkles } from 'lucide-react';

interface TeamCreditsShowcaseProps {
  compact?: boolean;
  staggered?: boolean;
  baseDelay?: number;
}

/**
 * Cohesive Arabic RTL progressive writing reveal (never splits Arabic letters into separate spans)
 */
function ArabicWritingReveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ clipPath: 'inset(0 0 0 100%)', opacity: 0.25 }}
      animate={{ clipPath: 'inset(0 0 0 0%)', opacity: 1 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-block motion-reduce:![clip-path:none] motion-reduce:!opacity-100 ${className}`}
    >
      {children}
    </motion.span>
  );
}

export function TeamCreditsShowcase({
  compact = false,
  staggered = false,
  baseDelay = 0.25,
}: TeamCreditsShowcaseProps) {
  const step = staggered ? 0.18 : 0.06;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-950/90 border border-amber-500/25 ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
      } shadow-xl`}
      dir="rtl"
    >
      {/* Row 1: مازن شكري <--> 💓 (single beating heart only) <--> رحمة علاء */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 mb-3">
        {/* 1. مازن شكري — المؤسس (Soft Crimson/Red Glow + Writing Reveal) */}
        <motion.div
          initial={staggered ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: baseDelay }}
          className="w-full sm:w-auto flex-1 flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-950/35 border border-red-500/45 shadow-[0_0_18px_rgba(239,68,68,0.32)]"
        >
          <Crown className="w-4 h-4 text-red-400 shrink-0 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
          <div className="text-right sm:text-center">
            <ArabicWritingReveal
              delay={baseDelay + 0.05}
              className="block text-sm sm:text-base font-black text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.85)]"
            >
              مازن شكري
            </ArabicWritingReveal>
            <span className="block text-[10px] font-bold text-red-200/90">المؤسس</span>
          </div>
        </motion.div>

        {/* ONLY ONE single subtle beating heart centered exclusively between مازن شكري and رحمة علاء */}
        <motion.div
          animate={{ scale: [1, 1.18, 1, 1.12, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-red-500/15 border border-red-500/35 shadow-[0_0_14px_rgba(239,68,68,0.4)] motion-reduce:animate-none"
          aria-label="قلب نابض"
        >
          <span className="text-base sm:text-lg leading-none" role="img" aria-hidden="true">
            💓
          </span>
        </motion.div>

        {/* 2. رحمة علاء — المشرف العام (Soft Crimson/Red Glow + Writing Reveal) */}
        <motion.div
          initial={staggered ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: baseDelay + step }}
          className="w-full sm:w-auto flex-1 flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-950/35 border border-red-500/45 shadow-[0_0_18px_rgba(239,68,68,0.32)]"
        >
          <Award className="w-4 h-4 text-red-400 shrink-0 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
          <div className="text-right sm:text-center">
            <ArabicWritingReveal
              delay={baseDelay + step + 0.05}
              className="block text-sm sm:text-base font-black text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.85)]"
            >
              رحمة علاء
            </ArabicWritingReveal>
            <span className="block text-[10px] font-bold text-red-200/90">المشرف العام</span>
          </div>
        </motion.div>
      </div>

      {/* Row 2: وليد محرم & يوسف عمرو & ندى زيد */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 3. وليد محرم — مشرف إداري (Soft White Glow + Gentle Motion + Writing Reveal) */}
        <motion.div
          initial={staggered ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: [0, -2.5, 0] }}
          transition={{
            opacity: { duration: 0.32, delay: baseDelay + step * 2 },
            y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: baseDelay + step * 2 },
          }}
          className="flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/25 shadow-[0_0_14px_rgba(255,255,255,0.2)] motion-reduce:transform-none"
        >
          <ShieldCheck className="w-4 h-4 text-white shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.88)]" />
          <div className="text-right sm:text-center">
            <ArabicWritingReveal
              delay={baseDelay + step * 2 + 0.05}
              className="block text-xs sm:text-sm font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.88)]"
            >
              وليد محرم
            </ArabicWritingReveal>
            <span className="block text-[10px] font-semibold text-slate-300">مشرف إداري</span>
          </div>
        </motion.div>

        {/* 4. يوسف عمرو — مشرف إداري (Soft White Glow + Gentle Motion + Writing Reveal) */}
        <motion.div
          initial={staggered ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: [0, -2.5, 0] }}
          transition={{
            opacity: { duration: 0.32, delay: baseDelay + step * 3 },
            y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: baseDelay + step * 3 + 0.4 },
          }}
          className="flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/25 shadow-[0_0_14px_rgba(255,255,255,0.2)] motion-reduce:transform-none"
        >
          <ShieldCheck className="w-4 h-4 text-white shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.88)]" />
          <div className="text-right sm:text-center">
            <ArabicWritingReveal
              delay={baseDelay + step * 3 + 0.05}
              className="block text-xs sm:text-sm font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.88)]"
            >
              يوسف عمرو
            </ArabicWritingReveal>
            <span className="block text-[10px] font-semibold text-slate-300">مشرف إداري</span>
          </div>
        </motion.div>

        {/* 5. ندى زيد — مشرف عام (Warm Gold Glow + Subtle Twinkling Stars + Writing Reveal, ZERO hearts) */}
        <motion.div
          initial={staggered ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: baseDelay + step * 4 }}
          className="relative flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-950/35 border border-amber-400/50 shadow-[0_0_18px_rgba(245,158,11,0.35)]"
        >
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse motion-reduce:animate-none drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
          <div className="text-right sm:text-center flex items-center gap-1.5 sm:block">
            <ArabicWritingReveal
              delay={baseDelay + step * 4 + 0.05}
              className="text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.85)]"
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span className="text-amber-300 animate-pulse motion-reduce:animate-none text-[10px]">✦</span>
                <span>ندى زيد</span>
                <span className="text-amber-300 animate-pulse motion-reduce:animate-none text-[10px]">✦</span>
              </span>
            </ArabicWritingReveal>
            <span className="block text-[10px] font-bold text-amber-200/90">مشرف عام</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

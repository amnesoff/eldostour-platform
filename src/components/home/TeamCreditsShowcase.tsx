'use client';

import React from 'react';
import { Crown, Award, ShieldCheck, Sparkles } from 'lucide-react';

interface TeamCreditsShowcaseProps {
  compact?: boolean;
  staggered?: boolean;
  baseDelay?: number;
}

export function TeamCreditsShowcase({
  compact = false,
  staggered = false,
  baseDelay = 0.5,
}: TeamCreditsShowcaseProps) {
  const step = staggered ? 0.25 : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-950/95 border border-amber-500/25 ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
      } shadow-xl`}
      dir="rtl"
    >
      {/* Row 1: مازن شكري & رحمة علاء (No hearts anywhere) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-3">
        {/* 1. مازن شكري — المؤسس (Soft Crimson/Red Glow) */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay}s both`,
                }
              : undefined
          }
          className="flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-950/35 border border-red-500/45 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
        >
          <Crown className="w-4 h-4 text-red-400 shrink-0" />
          <div className="text-right sm:text-center">
            <span className="block text-sm sm:text-base font-black text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]">
              مازن شكري
            </span>
            <span className="block text-[10px] font-bold text-red-200/90">المؤسس</span>
          </div>
        </div>

        {/* 2. رحمة علاء — المشرف العام (Soft Crimson/Red Glow) */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + step}s both`,
                }
              : undefined
          }
          className="flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-950/35 border border-red-500/45 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
        >
          <Award className="w-4 h-4 text-red-400 shrink-0" />
          <div className="text-right sm:text-center">
            <span className="block text-sm sm:text-base font-black text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]">
              رحمة علاء
            </span>
            <span className="block text-[10px] font-bold text-red-200/90">المشرف العام</span>
          </div>
        </div>
      </div>

      {/* Row 2: وليد محرم & يوسف عمرو & ندى زيد */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 3. وليد محرم — مشرف إداري (Soft White Glow + Write-in / Stay / Disappear Cycle) */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + step * 2}s both`,
                }
              : undefined
          }
          className="flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.18)]"
        >
          <ShieldCheck className="w-4 h-4 text-white shrink-0" />
          <div className="text-right sm:text-center">
            <span
              className={`block text-xs sm:text-sm font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.88)] ${
                staggered ? '' : 'animate-arabic-write-cycle'
              }`}
            >
              وليد محرم
            </span>
            <span className="block text-[10px] font-semibold text-slate-300">مشرف إداري</span>
          </div>
        </div>

        {/* 4. يوسف عمرو — مشرف إداري (Soft White Glow + Write-in / Stay / Disappear Cycle) */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + step * 3}s both`,
                }
              : undefined
          }
          className="flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.18)]"
        >
          <ShieldCheck className="w-4 h-4 text-white shrink-0" />
          <div className="text-right sm:text-center">
            <span
              style={!staggered ? { animationDelay: '0.7s' } : undefined}
              className={`block text-xs sm:text-sm font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.88)] ${
                staggered ? '' : 'animate-arabic-write-cycle'
              }`}
            >
              يوسف عمرو
            </span>
            <span className="block text-[10px] font-semibold text-slate-300">مشرف إداري</span>
          </div>
        </div>

        {/* 5. ندى زيد — مشرف عام (Warm Gold Glow + Subtle Twinkling Stars, Zero Hearts) */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + step * 4}s both`,
                }
              : undefined
          }
          className="relative flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-950/35 border border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
        >
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse motion-reduce:animate-none" />
          <div className="text-right sm:text-center flex items-center gap-1.5 sm:block">
            <span className="text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)] inline-flex items-center justify-center gap-1">
              <span className="text-amber-300 animate-pulse motion-reduce:animate-none text-[10px]">✦</span>
              <span>ندى زيد</span>
              <span className="text-amber-300 animate-pulse motion-reduce:animate-none text-[10px]">✦</span>
            </span>
            <span className="block text-[10px] font-bold text-amber-200/90">مشرف عام</span>
          </div>
        </div>
      </div>

      {/* Lightweight GPU-accelerated cascade keyframe */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*='fadeSlideIn'] {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

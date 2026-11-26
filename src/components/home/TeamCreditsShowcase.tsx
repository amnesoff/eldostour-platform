'use client';

import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

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
      {/* Row 1: مازن شكري & رحمة علاء (Larger scale, Burgundy + Gold styling, Continuous Golden Backlight Glow) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3.5">
        {/* 1. مازن شكري — المؤسس */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay}s both`,
                }
              : undefined
          }
          className="relative overflow-hidden flex items-center justify-center px-4 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-br from-[#5b1024] via-[#3a0916] to-[#20050d] border-2 border-amber-400/70 shadow-[0_0_24px_rgba(245,158,11,0.42)]"
        >
          {/* Continuous Golden Backlight Glow */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22)_0%,transparent_72%)] animate-pulse motion-reduce:animate-none pointer-events-none"
          />
          <div className="relative z-10 text-center">
            <span className="inline-flex items-center justify-center gap-1.5 text-base sm:text-lg font-black text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]">
              <span aria-hidden="true" className="text-sm sm:text-base">👑👑</span>
              <span>مازن شكري</span>
              <span aria-hidden="true" className="text-sm sm:text-base">👑👑</span>
            </span>
            <span className="block text-[11px] sm:text-xs font-extrabold text-amber-200/95 mt-0.5">
              المؤسس
            </span>
          </div>
        </div>

        {/* 2. رحمة علاء — المشرف العام */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + step}s both`,
                }
              : undefined
          }
          className="relative overflow-hidden flex items-center justify-center px-4 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-br from-[#5b1024] via-[#3a0916] to-[#20050d] border-2 border-amber-400/70 shadow-[0_0_24px_rgba(245,158,11,0.42)]"
        >
          {/* Continuous Golden Backlight Glow */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22)_0%,transparent_72%)] animate-pulse motion-reduce:animate-none pointer-events-none"
          />
          <div className="relative z-10 text-center">
            <span className="inline-flex items-center justify-center gap-1.5 text-base sm:text-lg font-black text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]">
              <span aria-hidden="true" className="text-rose-400 text-sm sm:text-base">♥</span>
              <span>رحمة علاء</span>
              <span aria-hidden="true" className="text-rose-400 text-sm sm:text-base">♥</span>
            </span>
            <span className="block text-[11px] sm:text-xs font-extrabold text-amber-200/95 mt-0.5">
              المشرف العام
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: وليد محرم & يوسف عمرو & ندى زيد (All مشرف إداري, Gold Glow + Write-in/Disappear Animation) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 3. وليد محرم — مشرف إداري */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + step * 2}s both`,
                }
              : undefined
          }
          className="flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-950/35 border border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
        >
          <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
          <div className="text-right sm:text-center">
            <span
              className={`block text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)] ${
                staggered ? '' : 'animate-arabic-write-cycle'
              }`}
            >
              وليد محرم
            </span>
            <span className="block text-[10px] font-bold text-amber-200/90">مشرف إداري</span>
          </div>
        </div>

        {/* 4. يوسف عمرو — مشرف إداري */}
        <div
          style={
            staggered
              ? {
                  animation: `fadeSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + step * 3}s both`,
                }
              : undefined
          }
          className="flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-950/35 border border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
        >
          <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
          <div className="text-right sm:text-center">
            <span
              style={!staggered ? { animationDelay: '0.6s' } : undefined}
              className={`block text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)] ${
                staggered ? '' : 'animate-arabic-write-cycle'
              }`}
            >
              يوسف عمرو
            </span>
            <span className="block text-[10px] font-bold text-amber-200/90">مشرف إداري</span>
          </div>
        </div>

        {/* 5. ندى زيد — مشرف إداري (Gold Glow + Write-in/Disappear Animation + Subtle Stars, Zero Hearts) */}
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
            <span
              style={!staggered ? { animationDelay: '1.2s' } : undefined}
              className={`text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)] inline-flex items-center justify-center gap-1 ${
                staggered ? '' : 'animate-arabic-write-cycle'
              }`}
            >
              <span className="text-amber-300 animate-pulse motion-reduce:animate-none text-[10px]">✦</span>
              <span>ندى زيد</span>
              <span className="text-amber-300 animate-pulse motion-reduce:animate-none text-[10px]">✦</span>
            </span>
            <span className="block text-[10px] font-bold text-amber-200/90">مشرف إداري</span>
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

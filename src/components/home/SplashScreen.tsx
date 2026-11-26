'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { INDEPENDENCE_DISCLAIMER } from '@/lib/constants';
import { TeamCreditsShowcase } from '@/components/home/TeamCreditsShowcase';

interface SplashScreenProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function SplashScreen({ onComplete, forceShow = false }: SplashScreenProps) {
  const [phase, setPhase] = useState<'active' | 'fading' | 'done'>('active');

  const handleDismiss = React.useCallback(() => {
    try {
      sessionStorage.setItem('eldostour_splash_v2_seen', 'true');
    } catch {
      // ignore storage errors
    }
    setPhase('fading');
    setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 600);
  }, [onComplete]);

  useEffect(() => {
    if (!forceShow) {
      try {
        const seen = sessionStorage.getItem('eldostour_splash_v2_seen');
        if (seen === 'true') {
          setPhase('done');
          onComplete?.();
          return;
        }
      } catch {
        // ignore storage errors
      }
    }

    // Smooth ~2.6s total timeline:
    // 0.0s - 0.5s: Logo & header settle
    // 0.5s - 2.0s: Sequential leadership cascade + progress bar
    // 2.0s - 2.6s: Smooth 0.6s fade-out into the app
    const fadeTimer = setTimeout(() => {
      handleDismiss();
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
    };
  }, [forceShow, handleDismiss, onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060b18] text-white px-4 overflow-x-hidden overflow-y-auto select-none transition-opacity duration-[600ms] ease-out ${
        phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ transform: 'translate3d(0, 0, 0)', willChange: 'opacity' }}
      dir="rtl"
    >
      {/* YouTube-style Top Progress Bar (Pure CSS scaleX, 60fps, zero JS loop) */}
      <div className="fixed top-0 inset-x-0 h-1 bg-slate-900 z-30 overflow-hidden">
        <div
          className="w-full h-full bg-gradient-to-l from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.75)]"
          style={{
            transformOrigin: 'right center',
            animation: 'splashProgress 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Skip button (no backdrop-blur for low-end device performance) */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-5 left-5 z-20 flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full bg-slate-900/90 hover:bg-slate-800 text-xs font-bold text-slate-200 transition-colors border border-white/15 active:scale-95 cursor-pointer"
      >
        <span>تخطي</span>
        <ArrowLeft className="w-3.5 h-3.5" />
      </button>

      {/* Main Content Box */}
      <div className="flex flex-col items-center text-center max-w-2xl w-full relative z-10 py-6 space-y-5">
        {/* Clean Emblem & Title Fade-In (~0.5s settle) */}
        <div
          className="flex flex-col items-center"
          style={{
            animation: 'splashHeaderIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
            willChange: 'transform, opacity',
          }}
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-1 shadow-xl shadow-amber-500/30 mb-3">
            <div className="w-full h-full rounded-full bg-[#0B132B] overflow-hidden flex items-center justify-center border-2 border-amber-400/50">
              <Image
                src="/logo.png"
                alt="منصة الدستور التعليمية"
                width={96}
                height={96}
                className="object-cover w-full h-full rounded-full"
                priority
              />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            منصة{' '}
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              الدستور
            </span>{' '}
            التعليمية
          </h1>

          <p className="text-[11px] sm:text-xs text-amber-300/90 font-bold mt-1.5">
            {INDEPENDENCE_DISCLAIMER}
          </p>
        </div>

        {/* Staggered Cascade Reveal of the 5 Leadership Names (~1.5s sequence) */}
        <div className="w-full">
          <TeamCreditsShowcase compact staggered baseDelay={0.45} />
        </div>
      </div>

      <style jsx>{`
        @keyframes splashProgress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        @keyframes splashHeaderIn {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*='splashProgress'],
          div[style*='splashHeaderIn'] {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { INDEPENDENCE_DISCLAIMER } from '@/lib/constants';
import { TeamCreditsShowcase } from '@/components/home/TeamCreditsShowcase';

interface SplashScreenProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function SplashScreen({ onComplete, forceShow = false }: SplashScreenProps) {
  const [visible, setVisible] = useState(false);

  const handleDismiss = React.useCallback(() => {
    sessionStorage.setItem('eldostour_splash_seen', 'true');
    setVisible(false);
    setTimeout(() => {
      onComplete?.();
    }, 320);
  }, [onComplete]);

  useEffect(() => {
    if (!forceShow) {
      const seen = sessionStorage.getItem('eldostour_splash_seen');
      if (seen) {
        onComplete?.();
        return;
      }
    }

    setVisible(true);

    // Total ~1.6s Staggered Cascade Reveal then smooth fade-out
    const timer = setTimeout(() => {
      handleDismiss();
    }, 1650);

    return () => {
      clearTimeout(timer);
    };
  }, [forceShow, handleDismiss, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#060b18] via-[#0B132B] to-[#040813] text-white px-4 overflow-x-hidden overflow-y-auto select-none"
          dir="rtl"
        >
          {/* YouTube-style Top Progress Bar (GPU-accelerated scaleX) */}
          <div className="fixed top-0 inset-x-0 h-1 bg-slate-900/80 z-30 overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'right center' }}
              className="w-full h-full bg-gradient-to-l from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] motion-reduce:transform-none"
            />
          </div>

          {/* Skip button */}
          <button
            onClick={handleDismiss}
            className="absolute top-5 left-5 z-20 flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 backdrop-blur-md transition-colors border border-white/10 active:scale-95 cursor-pointer"
          >
            <span>تخطي</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Main Content Box */}
          <div className="flex flex-col items-center text-center max-w-2xl w-full relative z-10 py-6 space-y-5">
            {/* Clean Emblem & Title Fade-In */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-1 shadow-2xl shadow-amber-500/35 mb-3">
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
            </motion.div>

            {/* Staggered Cascade Reveal of the 5 Leadership Names */}
            <div className="w-full">
              <TeamCreditsShowcase compact staggered baseDelay={0.2} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Crown, Award, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';
import { TEAM_CREDITS, COLLEGE_NAME } from '@/lib/constants';

interface SplashScreenProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function SplashScreen({ onComplete, forceShow = false }: SplashScreenProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDismiss = React.useCallback(() => {
    sessionStorage.setItem('eldostour_splash_seen', 'true');
    setVisible(false);
    setTimeout(() => {
      onComplete?.();
    }, 400);
  }, [onComplete]);

  useEffect(() => {
    // Check if user already saw the splash screen in this session
    if (!forceShow) {
      const seen = sessionStorage.getItem('eldostour_splash_seen');
      if (seen) {
        onComplete?.();
        return;
      }
    }

    setVisible(true);

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    // Auto-dismiss after 2.4s
    const timer = setTimeout(() => {
      handleDismiss();
    }, 2400);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [forceShow, handleDismiss, onComplete]);

  if (!visible) return null;

  const iconMap: Record<string, React.ReactNode> = {
    Crown: <Crown className="w-4 h-4 text-amber-400" />,
    Award: <Award className="w-4 h-4 text-emerald-400" />,
    ShieldCheck: <ShieldCheck className="w-4 h-4 text-blue-400" />,
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#060b18] via-[#0B132B] to-[#040813] text-white px-4 overflow-hidden select-none"
        >
          {/* Subtle background glow circles */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Skip button */}
          <button
            onClick={handleDismiss}
            className="absolute top-6 left-6 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-slate-300 backdrop-blur-md transition-all border border-white/10 active:scale-95"
          >
            <span>تخطي</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Main Content Box */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col items-center text-center max-w-lg w-full relative z-10"
          >
            {/* Animated Official Emblem */}
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className="relative mb-6"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-1 shadow-2xl shadow-amber-500/40">
                <div className="w-full h-full rounded-full bg-[#0B132B] overflow-hidden flex items-center justify-center border-2 border-amber-400/50">
                  <Image
                    src="/logo.png"
                    alt="منصة الدستور"
                    width={96}
                    height={96}
                    className="object-cover w-full h-full rounded-full"
                    priority
                  />
                </div>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-2 -right-2 text-yellow-300"
              >
                <Sparkles className="w-6 h-6 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
              </motion.div>
            </motion.div>

            {/* Platform Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2"
            >
              منصة <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">الدستور</span> التعليمية
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs sm:text-sm text-amber-300 font-bold mb-6"
            >
              {COLLEGE_NAME}
            </motion.p>

            {/* Team Credits Display */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 shadow-xl mb-6"
            >
              <div className="text-[11px] uppercase tracking-wider text-amber-400/80 font-bold mb-3">
                فريق الإدارة والتطوير
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {TEAM_CREDITS.map((member) => (
                  <div
                    key={member.name}
                    className="flex sm:flex-col items-center justify-between sm:justify-center p-2 rounded-xl bg-white/5 border border-white/5 text-right sm:text-center"
                  >
                    <div className="flex items-center gap-2 sm:mb-1">
                      <span className="p-1 rounded-md bg-white/10 shrink-0">
                        {iconMap[member.iconName] || <Crown className="w-4 h-4 text-amber-400" />}
                      </span>
                      <span className="text-xs text-slate-300 font-medium sm:hidden">
                        {member.role}:
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white">
                      {member.name}
                    </div>
                    <div className="text-[10px] text-amber-300/70 hidden sm:block">
                      {member.role}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Progress bar */}
            <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

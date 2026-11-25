'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Heart, X } from 'lucide-react';
import { useStudentAuth } from '@/context/StudentAuthContext';

export function PostActivationCelebration() {
  const { student, isGuest, markWelcomeShown } = useStudentAuth();
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!student || isGuest) return;

    // Trigger celebration if student is approved and welcome has not been shown
    const isApproved = student.is_approved === true || student.verification_status === 'approved';
    const hasSeenSession = sessionStorage.getItem(`eldostour_celebrated_${student.id}`);

    if (isApproved && student.welcome_shown === false && !hasSeenSession) {
      setShowCelebration(true);
      sessionStorage.setItem(`eldostour_celebrated_${student.id}`, 'true');
    }
  }, [student, isGuest]);

  const handleDismiss = () => {
    setShowCelebration(false);
    markWelcomeShown();
  };

  if (!showCelebration) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none text-right text-white"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-[#070c18] border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/20 text-center space-y-5 overflow-hidden"
        >
          {/* Confetti Particle Sparkles Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute top-2 left-6 text-2xl animate-bounce">🎉</span>
            <span className="absolute top-8 right-6 text-xl animate-pulse">✨</span>
            <span className="absolute bottom-6 left-8 text-2xl animate-bounce">🎓</span>
            <span className="absolute bottom-10 right-8 text-xl animate-pulse">⭐</span>
          </div>

          <div className="relative z-10 w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30">
            <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: '8s' }} />
          </div>

          <div className="relative z-10 space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 inline-block mb-1">
              تم التفعيل الرسمي بنجاح ✅
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
              🎉 تم تفعيل حسابك بنجاح بواسطة د. مازن شكري!
            </h3>
            <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed font-medium">
              أهلاً بك يا بطل في منصة الدستور التعليمية للعلوم القانونية! حسابك الآن معتمد وكامل المحاضرات والملخصات والاختبارات متاحة لك بالكامل.
            </p>
          </div>

          <div className="relative z-10 pt-2">
            <button
              onClick={handleDismiss}
              className="w-full min-h-[44px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>شكراً دكتور مازن، دخول المنصة 🚀</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

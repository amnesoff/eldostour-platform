'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Sparkles } from 'lucide-react';
import { TeamCreditsShowcase } from '@/components/home/TeamCreditsShowcase';

export function TeamCreditsBadge() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Clickable Team Badge in Hero/Header */}
      <button
        onClick={() => setIsOpen(true)}
        className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 dark:bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-amber-500/30 hover:border-amber-400 shadow-md backdrop-blur-md transition-all active:scale-95"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
          <Users className="w-3.5 h-3.5" />
        </span>
        <div className="text-xs font-semibold flex flex-wrap items-center gap-1.5">
          <span className="text-amber-400">إشراف وتأسيس:</span>
          <span className="text-red-400 font-bold">مازن شكري</span>
          <span className="text-slate-500">•</span>
          <span className="text-red-400 font-bold">رحمة علاء</span>
          <span className="text-slate-500">•</span>
          <span className="text-white">وليد محرم</span>
          <span className="text-slate-500">•</span>
          <span className="text-white">يوسف عمرو</span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-300 font-bold">ندى زيد</span>
        </div>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse hidden sm:inline" />
      </button>

      {/* Team Details Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl text-right text-white overflow-hidden"
            >
              {/* Decorative light */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    فريق العمل والتأسيس
                  </h3>
                  <p className="text-xs text-amber-300/80">
                    منصة الدستور التعليمية • مبادرة طلابية مستقلة
                  </p>
                </div>
              </div>

              {/* Members Showcase */}
              <TeamCreditsShowcase compact />

              {/* Footer Quote */}
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <p className="text-xs text-slate-400 italic">
                  «العدل أساس الملك، والعلم سراج المستقبل — نعتز بخدمة طلاب العلوم القانونية»
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

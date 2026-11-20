'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Award, ShieldCheck, Users, X, Sparkles } from 'lucide-react';
import { TEAM_CREDITS } from '@/lib/constants';

export function TeamCreditsBadge() {
  const [isOpen, setIsOpen] = useState(false);

  const iconMap: Record<string, React.ReactNode> = {
    Crown: <Crown className="w-5 h-5 text-amber-500" />,
    Award: <Award className="w-5 h-5 text-emerald-500" />,
    ShieldCheck: <ShieldCheck className="w-5 h-5 text-blue-500" />,
  };

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
        <div className="text-xs font-semibold flex items-center gap-1.5">
          <span className="text-amber-400">إشراف وتأسيس:</span>
          <span>مازن شكري</span>
          <span className="text-slate-500">•</span>
          <span>رحمة علاء</span>
          <span className="text-slate-500">•</span>
          <span>وليد محرم</span>
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
                    منصة الدستور التعليمية • كلية الحقوق
                  </p>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-3.5">
                {TEAM_CREDITS.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="p-2 rounded-xl bg-slate-800 border border-white/10 shrink-0 mt-0.5">
                      {iconMap[member.iconName]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm sm:text-base text-white">
                          {member.name}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {member.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Quote */}
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <p className="text-xs text-slate-400 italic">
                  «العدل أساس الملك، والعلم سراج المستقبل — نعتز بخدمة طلاب كلية الحقوق»
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

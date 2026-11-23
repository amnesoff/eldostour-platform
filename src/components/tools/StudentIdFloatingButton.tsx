'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { IdCard } from 'lucide-react';
import { DigitalStudentIdCard } from '@/components/tools/DigitalStudentIdCard';
import { useStudentAuth } from '@/context/StudentAuthContext';

export function StudentIdFloatingButton() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { student, isGuest } = useStudentAuth();

  // Hide on admin routes to prevent overlapping admin panels
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Dedicated Floating "كارنيهك 🪪" Button (Safe-Zone Bottom-Right) */}
      <div className="fixed bottom-4 right-3 md:bottom-6 md:right-6 z-40">
        <motion.button
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 border-2 border-amber-300/80 transition-all cursor-pointer select-none"
          title="افتح بطاقتك الجامعية الرقمية (كارنيهك)"
          aria-label="كارنيهك الجامعي"
        >
          {/* Subtle pulse ring if registered */}
          {student && !isGuest && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white" />
            </span>
          )}

          <div className="w-6 h-6 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
            <IdCard className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="tracking-wide">كارنيهك</span>
            <span className="text-base">🪪</span>
          </div>

          {student && !isGuest && (
            <span className="hidden lg:inline text-[10px] font-mono bg-slate-950/15 px-1.5 py-0.5 rounded-md text-slate-900 border border-slate-950/20">
              {student.student_code}
            </span>
          )}
        </motion.button>
      </div>

      {/* Digital Student ID Modal */}
      <DigitalStudentIdCard isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

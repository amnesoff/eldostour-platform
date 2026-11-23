'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Scale, Check, X } from 'lucide-react';
import { LegalContractModal } from '@/components/legal/LegalContractModal';

export function PrivacyBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isContractOpen, setIsContractOpen] = useState(false);

  useEffect(() => {
    try {
      const consented = localStorage.getItem('eldostour_privacy_consented');
      if (consented !== 'true') {
        setIsVisible(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleConsent = () => {
    try {
      localStorage.setItem('eldostour_privacy_consented', 'true');
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-40 p-4 rounded-3xl bg-slate-900/95 dark:bg-slate-950/95 border border-amber-500/40 text-slate-100 shadow-2xl backdrop-blur-md text-right text-xs"
            dir="rtl"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                    <span>الخصوصية وتأمين البيانات</span>
                    <span className="text-[10px] text-amber-400 font-normal">قانون 151 لسنة 2020</span>
                  </h4>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  تستخدم منصة الدستور ملفات التخزين المحلي الآمن لحفظ جلستك الأكاديمية وحماية بياناتك وفقاً للمادة 8 من العقد القانوني. استمرارك بالتصفح يُعد موافقة صريحة على بنوده.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleConsent}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>موافق ومتابعة</span>
                  </button>

                  <button
                    onClick={() => setIsContractOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Scale className="w-3 h-3 text-amber-400" />
                    <span>العقد القانوني (20 مادة)</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LegalContractModal
        isOpen={isContractOpen}
        onClose={() => setIsContractOpen(false)}
        onAccept={handleConsent}
      />
    </>
  );
}

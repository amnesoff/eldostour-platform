'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import { studentSubmitBugReport } from '@/lib/apiClient';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'quiz' | 'lecture' | 'other';
  targetTitle: string;
  targetId?: string;
}

export function BugReportModal({
  isOpen,
  onClose,
  reportType,
  targetTitle,
  targetId,
}: BugReportModalProps) {
  const [description, setDescription] = useState('');
  const [studentName, setStudentName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('eldostour_student_name') || '';
    }
    return '';
  });
  const [studentPhone, setStudentPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('eldostour_phone') || '';
    }
    return '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('يرجى كتابة تفاصيل الخطأ أو الملاحظة');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await studentSubmitBugReport({
        reportType,
        targetTitle,
        targetId,
        description: description.trim(),
        studentName: studentName.trim() || undefined,
        studentPhone: studentPhone.trim() || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || 'فشل إرسال البلاغ');
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDescription('');
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm text-right text-white"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-[95vw] sm:w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                إبلاغ عن خطأ أو ملاحظة علمية 🚩
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">
                {targetTitle || 'محتوى المنصة'}
              </p>
            </div>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">
                تم استلام بلاغك بنجاح!
              </h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                شكراً لمساهمتك القيمة في تدقيق المحتوى. سيقوم المشرف العام ود. مازن بمراجعة الملاحظة وتصحيحها فوراً.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-3 overflow-y-auto pr-1">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 leading-relaxed">
                رأيت سؤالاً إجابته غير دقيقة؟ أو خطأ مطبعي في ملف أو فيديو؟ اكتب التفاصيل هنا وسنتعامل معها فوراً.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  تفاصيل الخطأ أو الملاحظة:
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب رقم السؤال أو رقم الصفحة والخطأ الذي لاحظته مع التصحيح المقترح إن وُجد..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    اسمك (اختياري):
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="طالب"
                    className="w-full min-h-[44px] h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    رقم هاتفك (اختياري):
                  </label>
                  <input
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="010..."
                    dir="ltr"
                    className="w-full min-h-[44px] h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 font-mono text-right"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال البلاغ للإدارة 🚩</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, CheckCircle2, AlertCircle, MessageSquarePlus, Loader2 } from 'lucide-react';
import { studentSubmitRequest } from '@/lib/apiClient';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { AcademicYearId } from '@/types';

interface StudentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudentRequestModal({ isOpen, onClose }: StudentRequestModalProps) {
  const [studentName, setStudentName] = useState('');
  const [year, setYear] = useState<AcademicYearId>(1);
  const [subjectName, setSubjectName] = useState('');
  const [requestText, setRequestText] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !requestText.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await studentSubmitRequest({
        studentName: studentName.trim(),
        year,
        subjectName: subjectName.trim() || 'عام',
        requestText: requestText.trim(),
        contactInfo: contactInfo.trim() || undefined,
      });

      if (!res.success) throw new Error(res.error || 'فشل إرسال الطلب');

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال الطلب حالياً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-right text-slate-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                صندوق طلبات وملاحظات الطلاب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                أرسل طلبك لمذكرات ناقصة أو استفسارك مباشرة لإدارة منصة الدستور
              </p>
            </div>
          </div>

          {success ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                تم استلام طلبك بنجاح!
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                سيقوم المشرفون بمراجعته وتوفير المحتوى المطلوب في أقرب وقت.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم:
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="اسم الطالب / الطالبة..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الفرقة الدراسية:
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value) as AcademicYearId)}
                    className="w-full h-11 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm outline-none"
                  >
                    {ACADEMIC_YEARS.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المادة:
                  </label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="مثال: القانون المدني"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  تفاصيل الطلب أو المذكرة المطلوبة:
                </label>
                <textarea
                  rows={3}
                  required
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  placeholder="اكتب المحاضرة أو الملخص الذي تبحث عنه..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الواتساب أو وسيلة تواصل (اختياري للإفادة):
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="01012345678"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !studentName.trim() || !requestText.trim()}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>إرسال الطلب للمشرفين</span>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

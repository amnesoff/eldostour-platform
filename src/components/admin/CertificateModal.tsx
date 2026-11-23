'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  X,
  Download,
  Printer,
  MessageCircle,
  Sparkles,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import { CertificateData } from '@/types';
import { COLLEGE_NAME, PLATFORM_NAME, LEADERSHIP_BAR_TEXT, ACADEMIC_YEARS } from '@/lib/constants';

interface CertificateModalProps {
  data: CertificateData | null;
  onClose: () => void;
}

export function CertificateModal({ data, onClose }: CertificateModalProps) {
  const [customTitle, setCustomTitle] = useState('شهادة تفوق وتقدير أكاديمي');
  const [customNote, setCustomNote] = useState(
    'نظراً لتميزه وجهوده المشرفة واجتيازه الاختبار بنجاح وتفوق بارز في رحاب كلية الحقوق.'
  );
  const [copied, setCopied] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const yearObj = ACADEMIC_YEARS.find((y) => y.id === data.year) || ACADEMIC_YEARS[0];

  const cleanPhone = data.studentPhone ? data.studentPhone.replace(/\D/g, '') : '';
  const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
  const waCelebrationText = encodeURIComponent(
    `السلام عليكم ورحمة الله وبركاته،\nنبارك للطالب المتميز: ${data.studentName} (${yearObj.name}) تفوقه المستحق وحصوله على درجة ${data.score} من ${data.totalScore} بنسبة ${data.percentage}% في "${data.quizTitle}" على منصة الدستور التعليمية للعلوم القانونية 🌟\nتم إرفاق شهادة التقدير الرسمية.\nمع أطيب تمنياتنا بدوام التميز.\n${LEADERSHIP_BAR_TEXT}`
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    const text = `شهادة تفوق الطالب ${data.studentName} - ${data.quizTitle} بنسبة ${data.percentage}% - منصة الدستور التعليمية (${LEADERSHIP_BAR_TEXT})`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md text-right text-slate-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                إصدار شهادة تقدير وتكريم المتفوقين (لوحة الإدارة)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                قم بمراجعة بيانات الشهادة وطباعتها أو إرسالها للطالب مباشرة عبر واتساب
              </p>
            </div>
          </div>

          {/* Admin Customization Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                عنوان الشهادة:
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full h-8 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                نص الإشادة والتقدير:
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full h-8 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* CERTIFICATE PREVIEW CONTAINER */}
          <div className="overflow-y-auto pr-1 pb-1 flex-1">
            <div
              ref={certificateRef}
              id="printable-certificate"
              className="relative w-full aspect-[1.414/1] min-h-[460px] bg-gradient-to-br from-[#0c162d] via-[#091024] to-[#050914] text-white p-6 sm:p-10 rounded-2xl border-4 border-amber-500/70 shadow-2xl flex flex-col justify-between overflow-hidden select-none"
            >
              {/* Ornate Gold Border Inner Frame */}
              <div className="absolute inset-2 sm:inset-3 border-2 border-amber-400/30 rounded-xl pointer-events-none" />
              <div className="absolute inset-3 sm:inset-4 border border-amber-500/20 rounded-lg pointer-events-none" />

              {/* Watermark in Certificate */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="w-96 h-96 object-contain" />
              </div>

              {/* Top Banner: Logo & College */}
              <div className="relative z-10 flex items-center justify-between pb-4 border-b border-amber-500/20">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-amber-400 tracking-wide">
                      {PLATFORM_NAME}
                    </h4>
                    <p className="text-xs text-slate-300 font-semibold">{COLLEGE_NAME}</p>
                  </div>
                </div>

                <div className="text-left">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>لوحة شرف المتفوقين</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                    التاريخ: {data.issueDate || new Date().toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>

              {/* Certificate Body */}
              <div className="relative z-10 text-center my-auto py-4">
                <span className="text-xs sm:text-sm uppercase tracking-widest text-amber-300/80 font-bold block mb-1">
                  جمهورية مصر العربية • منصة الدستور التعليمية
                </span>

                <h2 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-3 font-serif">
                  {customTitle}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 mb-2">
                  تتشرف إدارة منصة الدستور التعليمية بكلية الحقوق بمنح هذه الشهادة للطالب / الطالبة:
                </p>

                {/* Student Full Name Highlight */}
                <div className="inline-block my-2 px-6 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/40 shadow-inner">
                  <h3 className="text-xl sm:text-3xl font-black text-white tracking-wide">
                    {data.studentName}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
                  المقيد بـ <span className="text-amber-400 font-bold">{yearObj.name}</span>
                </p>

                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl mx-auto leading-relaxed">
                  {customNote}
                </p>

                {/* Exam Details & Score */}
                <div className="mt-4 inline-flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs">
                  <span>الاختبار: <strong className="text-white">{data.quizTitle}</strong></span>
                  <span className="text-amber-400">•</span>
                  <span>الدرجة: <strong className="text-amber-400">{data.score} من {data.totalScore}</strong></span>
                  <span className="text-amber-400">•</span>
                  <span>النسبة: <strong className="text-emerald-400 font-black">{data.percentage}% (امتياز)</strong></span>
                </div>
              </div>

              {/* Bottom Row: Official Seal & Leadership Signatures */}
              <div className="relative z-10 pt-4 border-t border-amber-500/20 flex items-end justify-between text-xs">
                {/* Official Seal / Crest */}
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-400/60 flex items-center justify-center p-1 bg-amber-500/10 text-amber-300">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block font-black text-amber-400 text-[11px]">الختم الرقمي المعتمد</span>
                    <span className="text-[9px] text-slate-400">منصة الدستور التعليمية</span>
                  </div>
                </div>

                {/* Leadership Signature Line */}
                <div className="text-left">
                  <span className="block font-bold text-slate-300 text-[10px] mb-1">
                    اعتماد وإشراف هيئة إدارة المنصة:
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wide">
                    {LEADERSHIP_BAR_TEXT}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / حفظ الشهادة (PDF / High-Res)</span>
              </button>

              {data.studentPhone && (
                <a
                  href={`https://wa.me/${formattedPhone}?text=${waCelebrationText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>إرسال تهنئة وشهادة عبر واتساب ({data.studentPhone})</span>
                </a>
              )}

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم نسخ النص' : 'نسخ النص'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
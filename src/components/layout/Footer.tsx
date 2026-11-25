'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Scale, Heart, MessageCircle, Send, AlertCircle } from 'lucide-react';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { ACADEMIC_YEARS, PLATFORM_NAME, INDEPENDENCE_DISCLAIMER } from '@/lib/constants';
import { LegalContractModal } from '@/components/legal/LegalContractModal';
import { TeamCreditsShowcase } from '@/components/home/TeamCreditsShowcase';

export function Footer() {
  const [isContractOpen, setIsContractOpen] = useState(false);

  return (
    <>
      <footer className="w-full bg-slate-900 dark:bg-[#050914] text-slate-300 border-t border-slate-800 relative z-20 mt-auto">
        {/* Top Banner with subtle gold line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pb-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            {/* Col 1: Platform Vision */}
            <div className="md:col-span-5 space-y-4">
              <AnimatedLogo size="lg" />
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
                المنصة الأكاديمية المستقلة الأولى لطلاب القانون والعلوم الحقوقية. نوفر جميع المحاضرات، المذكرات المعتمدة بصيغة PDF، والمحاضرات المرئية المباشرة والاختبارات التفاعلية لجميع الفرق الدراسية الأربعة بجودة عالية وتحديثات فورية.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-400/90 font-medium">
                <Scale className="w-4 h-4 shrink-0" />
                <span>«العدل غاية القانون، والعلم وسيلة تحقيقه — منصة الدستور التعليمية»</span>
              </div>

              {/* Social Icons */}
              <div className="flex items-center gap-2 pt-2">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="فيسبوك"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-sky-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="تيليجرام"
                >
                  <Send className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="يوتيوب"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a
                  href="https://chat.whatsapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="جروب الدستور واتساب"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2: Dedicated Grade Routes */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider border-r-2 border-amber-500 pr-2">
                الفرق الدراسية (أقسام مخصصة)
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                {ACADEMIC_YEARS.map((year) => (
                  <li key={year.id}>
                    <Link
                      href={`/grade/${year.id}`}
                      className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-2 group text-right"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 group-hover:bg-amber-400 transition-colors" />
                      <span>{year.name} ({year.shortName})</span>
                    </Link>
                  </li>
                ))}
                <li className="pt-2 border-t border-slate-800/80">
                  <Link href="/#gpa-calculator" className="text-teal-400 hover:text-teal-300 text-xs">
                    حاسبة المعدل التراكمي (GPA)
                  </Link>
                </li>
                <li>
                  <Link href="/#legal-dictionary" className="text-sky-400 hover:text-sky-300 text-xs">
                    القاموس القانوني الفرنسي الناطق
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Prominent Team Credits Showcase */}
            <div className="md:col-span-5 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider border-r-2 border-amber-500 pr-2">
                فريق القيادة والتأسيس
              </h4>
              <TeamCreditsShowcase compact />
            </div>
          </div>

          {/* Prominent Legal Disclaimer Banner */}
          <div className="mt-10 p-4 rounded-2xl bg-slate-950/90 border border-amber-500/25 text-right space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{INDEPENDENCE_DISCLAIMER} — إخلاء مسؤولية قانوني ورسمي:</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-400">
              {PLATFORM_NAME} هي مبادرة طلابية وتعليمية رقمية مستقلة تماماً ومملوكة ملكية خاصة لإدارتها ومؤسسيها. المنصة لا تتبع أي جهة رسمية أو حكومية أو نقابية أو وزارة التعليم العالي. كافة المواد والملخصات والأسئلة المنشورة هي اجتهادات استرشادية للمساعدة الدراسية فقط لا تغني عن المراجع المقررة، ويتحمل المستخدم وحده مسؤولية استخدامه للمنصة مع حظر أي نسخ أو استغلال غير مصرح به.
            </p>
          </div>

          {/* Bottom Bar with 20-Article Legal Charter Trigger */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-right">
              <p>© 2026 {PLATFORM_NAME}. جميع الحقوق محفوظة كملكية فكرية مستقلة.</p>
              
              {/* Subtle 20-Article Legal Charter Trigger */}
              <button
                type="button"
                onClick={() => setIsContractOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold text-xs border border-amber-500/20 transition-all cursor-pointer shadow-sm"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>الخصوصيات وشروط الاستخدام والعقد القانوني 📜</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <span>صُنعت بكل</span>
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>بواسطة مازن شكري وفريق عمل منصة الدستور</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Full-Screen 20-Article Legal Charter Modal */}
      <LegalContractModal
        isOpen={isContractOpen}
        onClose={() => setIsContractOpen(false)}
      />
    </>
  );
}

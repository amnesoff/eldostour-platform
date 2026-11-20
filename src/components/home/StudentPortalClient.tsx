'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Scale,
  Search,
  MessageSquarePlus,
  Sparkles,
  BookMarked,
  Briefcase,
  ChevronLeft,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SplashScreen } from '@/components/home/SplashScreen';
import { UrgentNewsTicker } from '@/components/home/UrgentNewsTicker';
import { ExamCountdown } from '@/components/home/ExamCountdown';
import { TypewriterHeadline } from '@/components/home/TypewriterHeadline';
import { CommandPalette } from '@/components/home/CommandPalette';
import { BackgroundWatermark } from '@/components/ui/BackgroundWatermark';
import { OccasionThemeOverlay } from '@/components/ui/OccasionThemeOverlay';
import { GenderWelcomeModal } from '@/components/home/GenderWelcomeModal';
import { GpaCalculator } from '@/components/tools/GpaCalculator';
import { FrenchLegalDictionary } from '@/components/tools/FrenchLegalDictionary';
import { DailyMaximChallenge } from '@/components/tools/DailyMaximChallenge';
import { HonorRollMarquee } from '@/components/quiz/HonorRollMarquee';
import { FloatingWidgets } from '@/components/ui/FloatingWidgets';
import { ThemeCharacterWidget } from '@/components/ui/ThemeCharacterWidget';
import { StudentRequestModal } from '@/components/home/StudentRequestModal';
import { ACADEMIC_YEARS, COLLEGE_NAME, DEFAULT_SITE_SETTINGS } from '@/lib/constants';
import { SiteSettings } from '@/types';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';

export default function StudentPortalClient() {
  const { occasionTheme } = useTheme();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Fetch site settings from Supabase
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'general')
          .single();

        if (!error && data && data.value) {
          setSettings((prev) => ({ ...prev, ...(data.value as Partial<SiteSettings>) }));
        }
      } catch {
        // Fallback to default
      }
    };

    fetchSettings();
  }, []);

  const gradeIcons: Record<number, React.ReactNode> = {
    1: <BookMarked className="w-6 h-6 text-blue-500" />,
    2: <Scale className="w-6 h-6 text-amber-500" />,
    3: <Briefcase className="w-6 h-6 text-emerald-500" />,
    4: <GraduationCap className="w-6 h-6 text-purple-500" />,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070c18] text-slate-900 dark:text-slate-100 relative overflow-x-hidden">
      {/* 1. Animated Splash Screen */}
      <SplashScreen />

      {/* 2. Background Transparent Official Logo Watermark */}
      <BackgroundWatermark />

      {/* 3. Occasion Theme Overlay (Ramadan / New Year / Exams / Valentine) */}
      <OccasionThemeOverlay theme={occasionTheme || settings.active_occasion_theme || 'default'} />

      {/* 4. First-Visit Gender Theme Selector Modal */}
      <GenderWelcomeModal />

      {/* 5. Main Navbar (Sticky Top) */}
      <Navbar onOpenSearch={() => setIsCommandPaletteOpen(true)} />

      {/* 6. Urgent News Ticker (Directly below Main Navbar in normal document flow) */}
      <UrgentNewsTicker />

      {/* 7. Honor Roll Marquee */}
      <HonorRollMarquee />

      <main className="flex-1 pb-24 sm:pb-28 space-y-10 sm:space-y-16">
        {/* HERO SECTION */}
        <section className="relative pt-8 pb-10 sm:pt-14 sm:pb-16 overflow-hidden text-center">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
            {/* College Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-bold mb-4 shadow-sm"
            >
              <Scale className="w-4 h-4" />
              <span>{settings.college_name || COLLEGE_NAME}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight"
            >
              منصة <span className="bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent">الدستور</span> التعليمية
            </motion.h1>

            {/* Typewriter Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-3 text-base sm:text-xl font-bold min-h-[2rem]"
            >
              <TypewriterHeadline />
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-3 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
            >
              محاضرات، ملخصات بصيغة PDF، وفيديوهات شرح مباشرة لجميع الفرق الدراسية الأربعة بكلية الحقوق جامعة مدينة السادات، بتحديث سحابي فوري.
            </motion.p>

            {/* Quick Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>بحث سريع بالمحاضرات (Ctrl+K)</span>
              </button>

              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm"
              >
                <MessageSquarePlus className="w-4 h-4 text-amber-500" />
                <span>طلب محاضرة أو مذكرة</span>
              </button>
            </motion.div>
          </div>
        </section>

        {/* EXAM COUNTDOWN */}
        <ExamCountdown />

        {/* 4 DEDICATED GRADE CARDS (Clean 2-column mobile & 4-column desktop grid) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 sm:gap-2.5">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                <span>الفرق الدراسية المقررة</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                اضغط على فرقتك الدراسية للدخول إلى صفحة المذكرات والمحاضرات الخاصة بك
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 min-[350px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {ACADEMIC_YEARS.map((year) => (
              <Link
                key={year.id}
                href={`/grade/${year.id}`}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 sm:p-6 shadow-sm hover:shadow-2xl hover:border-amber-500/50 transition-all flex flex-col justify-between h-full"
              >
                {/* Accent top gradient bar */}
                <div className={`absolute top-0 right-0 left-0 h-1 sm:h-1.5 bg-gradient-to-r ${year.color}`} />

                <div>
                  <div className="flex items-start justify-between mb-2.5 sm:mb-4">
                    <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                      {gradeIcons[year.id]}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {year.badge}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    {year.name}
                  </h3>
                  <span className="text-[11px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                    {year.shortName}
                  </span>

                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed line-clamp-2">
                    {year.description}
                  </p>
                </div>

                <div className="mt-3 sm:mt-6 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:text-amber-500">
                  <span>دخول قسم الفرقة</span>
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 30 GOLDEN FEATURES: DAILY MAXIM & CHALLENGE */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DailyMaximChallenge />
        </section>

        {/* 30 GOLDEN FEATURES: GPA CALCULATOR & FRENCH DICTIONARY */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GpaCalculator />
          <FrenchLegalDictionary />
        </section>
      </main>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Student Request Modal */}
      <StudentRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />

      {/* Interactive Peeking Theme Character Widget */}
      <ThemeCharacterWidget />

      {/* Floating Action Widgets (Pomodoro & Scratchpad & WhatsApp) */}
      <FloatingWidgets settings={settings} />

      {/* Footer */}
      <Footer />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Scale,
  Search,
  MessageSquarePlus,
  Sparkles,
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
import { LegalStoriesBar } from '@/components/home/LegalStoriesBar';
import { FloatingWidgets } from '@/components/ui/FloatingWidgets';
import { ThemeCharacterWidget } from '@/components/ui/ThemeCharacterWidget';
import { StudentRequestModal } from '@/components/home/StudentRequestModal';
import { ACADEMIC_YEARS, COLLEGE_NAME, DEFAULT_SITE_SETTINGS } from '@/lib/constants';
import { SiteSettings } from '@/types';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';

type CinematicPhase = 'star_intro' | 'cards_slide' | 'glow_wave' | 'settled';

export default function StudentPortalClient() {
  const { occasionTheme } = useTheme();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // TASK 2: Cinematic Intro & Grade Cards Animation Phases
  const [cinematicPhase, setCinematicPhase] = useState<CinematicPhase>('star_intro');
  const [activeGlowCardIndex, setActiveGlowCardIndex] = useState<number | null>(null);

  useEffect(() => {
    // Check if intro has already played during this tab session
    const hasSeenIntro = sessionStorage.getItem('eldostour_seen_cinematic_intro');
    if (hasSeenIntro === 'true') {
      setCinematicPhase('settled');
      return;
    }

    // Phase 1 -> Phase 2 (Cards slide in after 1.8s)
    const timer1 = setTimeout(() => {
      setCinematicPhase('cards_slide');
    }, 1800);

    // Phase 2 -> Phase 3 (Sequential Glow Wave starts at 2.6s)
    const timer2 = setTimeout(() => {
      setCinematicPhase('glow_wave');
      setActiveGlowCardIndex(0); // Card 1
    }, 2600);

    const glow2 = setTimeout(() => setActiveGlowCardIndex(1), 3000); // Card 2
    const glow3 = setTimeout(() => setActiveGlowCardIndex(2), 3400); // Card 3
    const glow4 = setTimeout(() => setActiveGlowCardIndex(3), 3800); // Card 4

    // Phase 4: Settled at 4.2s
    const timerEnd = setTimeout(() => {
      setActiveGlowCardIndex(null);
      setCinematicPhase('settled');
      sessionStorage.setItem('eldostour_seen_cinematic_intro', 'true');
    }, 4200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(glow2);
      clearTimeout(glow3);
      clearTimeout(glow4);
      clearTimeout(timerEnd);
    };
  }, []);

  const skipCinematicIntro = () => {
    setCinematicPhase('settled');
    setActiveGlowCardIndex(null);
    sessionStorage.setItem('eldostour_seen_cinematic_intro', 'true');
  };

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070c18] text-slate-900 dark:text-slate-100 relative overflow-x-hidden">
      {/* 1. Animated Splash Screen */}
      <SplashScreen />

      {/* 2. TASK 2: Phase 1 Cinematic Star & Logo Intro Overlay (~1.8s) */}
      <AnimatePresence>
        {cinematicPhase === 'star_intro' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4 }}
            onClick={skipCinematicIntro}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md cursor-pointer select-none"
          >
            <div className="relative flex flex-col items-center px-4 text-center">
              {/* Radiant Golden Glow Aura */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: [0.3, 1.3, 1.05], opacity: [0, 0.95, 0.8] }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute -inset-14 rounded-full bg-gradient-to-r from-amber-500/35 via-yellow-400/45 to-amber-600/35 blur-3xl pointer-events-none"
              />

              {/* Central Golden Star & Platform Logo */}
              <motion.div
                initial={{ scale: 0, rotate: -70 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.9, type: 'spring', damping: 14 }}
                className="relative mb-5"
              >
                <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 p-1.5 shadow-2xl shadow-amber-500/60">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden border border-amber-300/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logo.png"
                      alt="شعار منصة الدستور"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.9)]"
                    />
                  </div>
                </div>
                <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
                <Sparkles className="absolute -bottom-2 -left-2 w-7 h-7 text-amber-400 animate-pulse" />
              </motion.div>

              {/* Cinematic Title & Tagline */}
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="text-2xl sm:text-4xl font-black text-white tracking-tight"
              >
                منصة <span className="bg-gradient-to-l from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">الدستور</span> التعليمية
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65, duration: 0.6 }}
                className="text-xs sm:text-sm text-amber-200/90 font-bold mt-2"
              >
                المنصة الأكاديمية المستقلة للعلوم القانونية ⚖️
              </motion.p>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.4 }}
                className="text-[10px] text-slate-400 mt-4 px-3 py-1 rounded-full bg-white/5 border border-white/10"
              >
                انقر في أي مكان للتخطي السريع
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Background Transparent Official Logo Watermark */}
      <BackgroundWatermark />

      {/* 4. Occasion Theme Overlay (Ramadan / New Year / Exams / Valentine) */}
      <OccasionThemeOverlay theme={occasionTheme || settings.active_occasion_theme || 'default'} />

      {/* 5. First-Visit Gender Theme Selector Modal */}
      <GenderWelcomeModal />

      {/* 6. Main Navbar (Sticky Top) */}
      <Navbar onOpenSearch={() => setIsCommandPaletteOpen(true)} />

      {/* 7. Urgent News Ticker (Directly below Main Navbar in normal document flow) */}
      <UrgentNewsTicker />

      {/* 8. Honor Roll Marquee */}
      <HonorRollMarquee />

      {/* 8B. Interactive Legal Stories Bar */}
      <LegalStoriesBar />

      {/* Main Content Area - TASK 3: pb-32 sm:pb-36 prevents overlap with floating Digital ID button */}
      <main className="flex-1 pb-32 sm:pb-36 space-y-10 sm:space-y-16">
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
              محاضرات، ملخصات بصيغة PDF، واختبارات تفاعلية لجميع الفرق الدراسية الأربعة بالعلوم القانونية، بتحديث سحابي فوري.
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>بحث سريع بالمحاضرات (Ctrl+K)</span>
              </button>

              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <MessageSquarePlus className="w-4 h-4 text-amber-500" />
                <span>طلب محاضرة أو مذكرة</span>
              </button>
            </motion.div>
          </div>
        </section>

        {/* EXAM COUNTDOWN */}
        <ExamCountdown />

        {/* TASK 3: 4 DEDICATED GRADE CARDS - Strictly 2 columns (grid-cols-2) on mobile, tablet & desktop */}
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

          {/* 2-Column Responsive Grid: Row 1 (الفرقة 1 | الفرقة 2), Row 2 (الفرقة 3 | الفرقة 4) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {ACADEMIC_YEARS.map((year, index) => {
              const customCover = settings.grade_covers?.[year.id];
              const isGlowing = activeGlowCardIndex === index;

              return (
                <motion.div
                  key={year.id}
                  initial={cinematicPhase === 'star_intro' ? { opacity: 0, x: 60 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: cinematicPhase === 'cards_slide' ? index * 0.12 : 0,
                    duration: 0.5,
                    ease: 'easeOut',
                  }}
                  className="relative"
                >
                  <Link
                    href={`/grade/${year.id}`}
                    className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl border shadow-md flex flex-col justify-end min-h-[220px] sm:min-h-[280px] aspect-[4/5] sm:aspect-[3/4] transition-all duration-300 ${
                      isGlowing
                        ? 'border-amber-400 ring-4 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.85)] scale-[1.03] z-20'
                        : 'border-slate-200/80 dark:border-slate-800/80 hover:shadow-2xl hover:border-amber-500/50 hover:scale-[1.02]'
                    }`}
                  >
                    {/* Accent Top Gradient Line */}
                    <div className={`absolute top-0 inset-x-0 h-1 sm:h-1.5 bg-gradient-to-r ${year.color} z-30`} />

                    {/* Top Badge */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-[9px] sm:text-[11px] font-bold text-amber-300 shadow-md">
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                      <span>{year.badge}</span>
                    </div>

                    {/* Sequential Golden Glow Shimmer Wave */}
                    {isGlowing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-tr from-amber-500/25 via-yellow-300/35 to-amber-500/25 z-25 pointer-events-none animate-pulse"
                      />
                    )}

                    {/* Card Background (Custom Uploaded Image or Aesthetic Deep Blue Gradient + Watermark) */}
                    {customCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={customCover}
                        alt={year.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1B3D] via-[#0F295A] to-[#060D1E] flex items-center justify-center overflow-hidden">
                        {/* Subtle Crest / Logo Watermark */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/logo.png"
                          alt="شعار المنصة"
                          className="w-20 h-20 sm:w-32 sm:h-32 object-contain opacity-25 group-hover:opacity-35 transition-all duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>
                    )}

                    {/* Gradient shadow for contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

                    {/* Compact, Zero-Clipping Sleek bottom translucent black glass overlay */}
                    <div className="relative z-20 w-full p-2.5 sm:p-4 bg-black/65 backdrop-blur-md border-t border-white/15 text-white transition-all duration-300 group-hover:bg-black/75">
                      <h3 className="text-sm sm:text-lg font-black text-white group-hover:text-amber-400 transition-colors tracking-tight line-clamp-1">
                        {year.name}
                      </h3>
                      <span className="text-[10px] sm:text-xs font-bold text-amber-300 block mt-0.5 line-clamp-1">
                        {year.shortName}
                      </span>

                      <p className="text-[9px] sm:text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed opacity-90">
                        {year.description}
                      </p>

                      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-xs font-bold text-amber-400 group-hover:text-amber-300">
                        <span>دخول قسم الفرقة</span>
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
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


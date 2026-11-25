'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Moon, X, Flame, Volume2, VolumeX, Heart, AlertCircle } from 'lucide-react';
import { OccasionTheme } from '@/types';

interface OccasionThemeOverlayProps {
  theme: OccasionTheme;
}

export function OccasionThemeOverlay({ theme }: OccasionThemeOverlayProps) {
  const [showGreeting, setShowGreeting] = useState(false);
  const [isCannonFiring, setIsCannonFiring] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cannonCount, setCannonCount] = useState(0);

  // Sync theme attribute to documentElement
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-occasion-theme', theme || 'default');
    }
  }, [theme]);

  // Greeting toast logic
  useEffect(() => {
    if (theme === 'default') {
      setShowGreeting(false);
      return;
    }

    const sessionKey = `eldostour_theme_toast_${theme}`;
    const seen = sessionStorage.getItem(sessionKey);
    if (!seen) {
      setShowGreeting(true);
    }
  }, [theme]);

  const dismissGreeting = () => {
    sessionStorage.setItem(`eldostour_theme_toast_${theme}`, 'true');
    setShowGreeting(false);
  };

  // Web Audio API Cannon & Chimes Synthesizer
  const playCannonSound = () => {
    if (isMuted || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // 1. Deep Boom (Low-frequency swept sine)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.9);

      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);

      // 2. Celebratory Golden Chimes Sequence
      const chimeNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chimeNotes.forEach((freq, idx) => {
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'triangle';
        chime.frequency.setValueAtTime(freq, ctx.currentTime + 0.35 + idx * 0.12);

        chimeGain.gain.setValueAtTime(0.25, ctx.currentTime + 0.35 + idx * 0.12);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85 + idx * 0.12);

        chime.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chime.start(ctx.currentTime + 0.35 + idx * 0.12);
        chime.stop(ctx.currentTime + 0.85 + idx * 0.12);
      });
    } catch {
      // Audio context policy
    }
  };

  // Trigger Cannon Fire
  const fireCannon = () => {
    setIsCannonFiring(true);
    setCannonCount((prev) => prev + 1);
    playCannonSound();
    setTimeout(() => setIsCannonFiring(false), 900);
  };

  if (!theme || theme === 'default') return null;

  return (
    <>
      {/* =======================================================================
          1. RAMADAN LUXURY THEME: Hanging Zina, Lanterns, & Crescent
          ======================================================================= */}
      {theme === 'ramadan' && (
        <div className="fixed top-0 left-0 right-0 pointer-events-none z-30 select-none overflow-hidden h-28 sm:h-36">
          {/* Top Golden Garland Strip */}
          <div className="w-full h-2.5 bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700 opacity-90 shadow-lg shadow-amber-500/20" />

          {/* Left Lantern (Swaying) */}
          <div className="absolute top-0 right-6 sm:right-24 animate-sway flex flex-col items-center">
            <div className="w-0.5 h-10 sm:h-16 bg-amber-400/80" />
            <div className="w-8 h-11 sm:w-10 sm:h-14 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 rounded-xl border border-yellow-300 shadow-xl shadow-amber-500/60 flex items-center justify-center">
              <Flame className="w-4 h-4 text-yellow-100 animate-pulse" />
            </div>
          </div>

          {/* Golden Crescent & Lantern Center */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-0.5 h-6 sm:h-10 bg-amber-400/70" />
            <div className="relative w-9 h-9 sm:w-12 sm:h-12 filter drop-shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/themes/ramadan-crescent.png"
                alt="هلال رمضان الذهبي"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Right Lantern (Swaying slow) */}
          <div className="absolute top-0 left-6 sm:left-24 animate-sway-slow flex flex-col items-center">
            <div className="w-0.5 h-12 sm:h-20 bg-amber-400/80" />
            <div className="w-8 h-11 sm:w-10 sm:h-14 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 rounded-xl border border-yellow-300 shadow-xl shadow-amber-500/60 flex items-center justify-center">
              <Flame className="w-4 h-4 text-yellow-100 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          2. NEW YEAR THEME: Gliding Flying Santa & Snowfall
          ======================================================================= */}
      {theme === 'new_year' && (
        <>
          {/* Falling Snowflakes */}
          <div className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="snowflake"
                style={{
                  left: `${(i * 5.2 + 2) % 98}%`,
                  animationDuration: `${5 + (i % 6) * 1.5}s`,
                  animationDelay: `${(i % 5) * 0.7}s`,
                  fontSize: `${11 + (i % 3) * 6}px`,
                  opacity: 0.6 + (i % 4) * 0.1,
                }}
              >
                ❄
              </div>
            ))}
          </div>

          {/* Periodic Flying Santa across screen */}
          <motion.div
            initial={{ x: '-30vw', y: 40 }}
            animate={{
              x: ['-30vw', '110vw'],
              y: [40, 20, 45, 25, 40],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              repeatDelay: 12,
              ease: 'easeInOut',
            }}
            className="fixed top-8 z-30 pointer-events-none select-none w-32 sm:w-44 h-auto filter drop-shadow-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/themes/santa-sleigh.png"
              alt="بابا نويل ورنة رأس السنة"
              className="w-full h-auto object-contain"
            />
            <div className="absolute -bottom-1 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded-full border border-amber-400/40">
              <Sparkles className="w-2.5 h-2.5" />
              <span>عام جديد سعيد! 🎄</span>
            </div>
          </motion.div>
        </>
      )}

      {/* =======================================================================
          3. VALENTINE'S DAY THEME: Floating Hearts & Rose Glow
          ======================================================================= */}
      {theme === 'valentine' && (
        <div className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden">
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: '105vh', opacity: 0 }}
              animate={{
                y: '-10vh',
                opacity: [0, 0.7, 0.8, 0],
                x: [0, (i % 2 === 0 ? 30 : -30), 0],
              }}
              transition={{
                duration: 9 + (i % 5) * 2,
                repeat: Infinity,
                delay: i * 1.2,
                ease: 'easeInOut',
              }}
              className="absolute text-rose-500/50"
              style={{ left: `${(i * 7.5 + 4) % 96}%`, fontSize: `${16 + (i % 4) * 8}px` }}
            >
              {i % 3 === 0 ? '❤️' : i % 3 === 1 ? '💖' : '🌹'}
            </motion.div>
          ))}
        </div>
      )}

      {/* =======================================================================
          CELEBRATORY GREETING TOAST / INTERACTIVE BANNER
          ======================================================================= */}
      <AnimatePresence>
        {showGreeting && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-lg pointer-events-auto"
            dir="rtl"
          >
            {/* RAMADAN BANNER (with Golden Cannon & Scroll) */}
            {theme === 'ramadan' ? (
              <div className="relative rounded-3xl bg-gradient-to-br from-[#23140C] via-[#1A0E08] to-[#120703] border-2 border-amber-500/60 p-4 sm:p-5 shadow-2xl backdrop-blur-xl text-white text-right overflow-hidden">
                {/* Close Button */}
                <button
                  onClick={dismissGreeting}
                  className="absolute top-3 left-3 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 transition-colors z-20"
                  aria-label="إغلاق التهنئة"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Banner Content Layout */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Interactive Golden Ramadan Cannon */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <motion.button
                      onClick={fireCannon}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      animate={
                        isCannonFiring
                          ? { x: [-12, 4, -2, 0], rotate: [-6, 2, 0] }
                          : { y: [0, -3, 0] }
                      }
                      transition={{ duration: 0.4 }}
                      className="relative w-28 h-24 sm:w-32 sm:h-26 cursor-pointer filter drop-shadow-xl"
                      title="اضغط لإطلاق مدفع رمضان وسماع النغمات الاحتفالية!"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/themes/ramadan-cannon.png"
                        alt="مدفع رمضان الذهبي"
                        className="w-full h-full object-contain"
                      />

                      {/* Spark / Smoke Flash Effect on firing */}
                      {isCannonFiring && (
                        <motion.div
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: 2.2, opacity: 0 }}
                          transition={{ duration: 0.6 }}
                          className="absolute -top-3 -right-2 w-10 h-10 rounded-full bg-amber-400 blur-sm pointer-events-none"
                        />
                      )}
                    </motion.button>

                    <button
                      onClick={fireCannon}
                      className="mt-1 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shadow-md flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <span>💥 اضرب المدفع!</span>
                      {cannonCount > 0 && <span className="text-[10px]">({cannonCount})</span>}
                    </button>
                  </div>

                  {/* Greeting Text on Scroll Aesthetic */}
                  <div className="flex-1 min-w-0 text-center sm:text-right">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 mb-1.5">
                      <Moon className="w-3.5 h-3.5 fill-current" />
                      <span>رمضان كريم 🌙</span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-amber-300 leading-snug">
                      تهنئة خاصة لطلاب منصة الدستور التعليمية
                    </h4>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      إدارة منصة الدستور التعليمية تتمنى لكم شهراً مباركاً حافلاً بالخير والتفوق الأكاديمي.
                    </p>

                    <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 underline font-semibold"
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{isMuted ? 'الصوت مكتوم' : 'الصوت مفعل'}</span>
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={dismissGreeting}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : theme === 'new_year' ? (
              /* NEW YEAR BANNER */
              <div className="relative rounded-3xl bg-slate-950/95 border-2 border-sky-400/50 p-4 shadow-2xl backdrop-blur-md text-white text-right flex items-center gap-3.5">
                <button
                  onClick={dismissGreeting}
                  className="absolute top-3 left-3 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-16 h-16 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/themes/snowman-peek.png"
                    alt="رجل الجليد"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-sky-400 block">عام ميلادي سعيد ❄️</span>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    كل عام وجميع طلاب العلوم القانونية بخير
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    نتمنى لكم سنة دراسية عامرة بالامتياز والنجاح المستمر.
                  </p>
                </div>
              </div>
            ) : theme === 'valentine' ? (
              /* VALENTINE BANNER */
              <div className="relative rounded-3xl bg-gradient-to-r from-rose-950/95 via-slate-950/95 to-rose-950/95 border-2 border-rose-500/50 p-4 shadow-2xl backdrop-blur-md text-white text-right flex items-center gap-3">
                <button
                  onClick={dismissGreeting}
                  className="absolute top-3 left-3 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-rose-300"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                  <Heart className="w-6 h-6 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-rose-400 block">عيد حب سعيد ❤️</span>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    حب القانون والتفوق يجمعنا
                  </h4>
                  <p className="text-xs text-rose-200/80 mt-0.5">
                    «القانون عدالة، والعدالة أسمى معاني الإنسانية والمحبة»
                  </p>
                </div>
              </div>
            ) : (
              /* EXAMS BANNER */
              <div className="relative rounded-3xl bg-slate-900/95 border-2 border-amber-500/60 p-4 shadow-2xl backdrop-blur-md text-white text-right flex items-center gap-3">
                <button
                  onClick={dismissGreeting}
                  className="absolute top-3 left-3 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-14 h-14 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/themes/student-boy-panic.png"
                    alt="موسم الامتحانات"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>طوارئ الامتحانات ⚖️</span>
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    موسم المذاكرة والتركيز المكثف
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    شد حيلك يا بطل، كل المذكرات والمراجعات جاهزة لمساعدتك!
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

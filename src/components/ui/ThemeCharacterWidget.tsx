'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CharacterWidgetSettings } from '@/types';
import { DEFAULT_CHARACTER_WIDGET_SETTINGS, CHARACTER_PRESETS } from '@/lib/constants';

interface ThemeCharacterWidgetProps {
  initialSettings?: CharacterWidgetSettings;
}

export function ThemeCharacterWidget({ initialSettings }: ThemeCharacterWidgetProps) {
  const [settings, setSettings] = useState<CharacterWidgetSettings>(
    initialSettings || DEFAULT_CHARACTER_WIDGET_SETTINGS
  );
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isWiggling, setIsWiggling] = useState(false);
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right');

  // Load dismissed state from session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('eldostour_character_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Fetch settings from Supabase
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'character_widget')
        .single();

      if (!error && data && data.value) {
        setSettings((prev) => ({ ...prev, ...(data.value as Partial<CharacterWidgetSettings>) }));
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes on site_settings
    const channel = supabase
      .channel('realtime_character_widget')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.character_widget' },
        (payload: any) => {
          if (payload.new && payload.new.value) {
            setSettings(payload.new.value as CharacterWidgetSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  // Determine active side
  useEffect(() => {
    if (settings.peek_side === 'random') {
      setActiveSide(Math.random() > 0.5 ? 'right' : 'left');
    } else {
      setActiveSide(settings.peek_side);
    }
  }, [settings.peek_side]);

  // Periodic appearance cycle
  const intervalSeconds = settings.peek_interval_seconds || 25;
  useEffect(() => {
    if (!settings.enabled || isDismissed) {
      setIsVisible(false);
      return;
    }

    // Initial entrance after 2.5s
    const initialTimer = setTimeout(() => {
      setIsVisible(true);
    }, 2500);

    // Recurring interval
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, intervalSeconds * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [settings.enabled, isDismissed, intervalSeconds]);

  // Filter active messages
  const activeMessages = (settings.messages || []).filter((m) => m.is_active);
  const currentMessage =
    activeMessages.length > 0
      ? activeMessages[currentMessageIndex % activeMessages.length]?.text
      : 'ذاكرت اللي عليك يالا؟ 👀';

  // Handle tap on character
  const handleTap = () => {
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 600);

    // Cycle to next funny message
    if (activeMessages.length > 1) {
      setCurrentMessageIndex((prev) => (prev + 1) % activeMessages.length);
    }
  };

  // Dismiss for session
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem('eldostour_character_dismissed', 'true');
  };

  if (!settings.enabled || isDismissed) return null;

  // Resolve character image
  let characterImage = '/themes/student-girl-sign.png';
  if (settings.selected_character === 'custom' && settings.custom_character_url) {
    characterImage = settings.custom_character_url;
  } else {
    const preset = CHARACTER_PRESETS.find((p) => p.id === settings.selected_character);
    if (preset) characterImage = preset.image;
  }

  const isGirlSign = settings.selected_character === 'student-girl-sign';
  const isRight = activeSide === 'right';

  return (
    <div
      dir="rtl"
      className={`fixed bottom-36 sm:bottom-40 md:bottom-32 z-40 select-none pointer-events-none transition-all duration-500 ${
        isRight ? 'right-2 sm:right-6 md:right-8' : 'left-2 sm:left-6 md:left-8'
      }`}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{
              y: 40,
              opacity: 0,
              scale: 0.88,
            }}
            animate={{
              y: 0,
              opacity: 1,
              scale: isWiggling ? 1.08 : 1,
              rotate: isWiggling ? [0, -6, 6, -4, 0] : 0,
            }}
            exit={{
              y: 50,
              opacity: 0,
              scale: 0.88,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 24,
            }}
            className="relative pointer-events-auto flex flex-col items-center cursor-pointer group"
            onClick={handleTap}
            title="اضغط لتغيير العبارة أو التفاعل مع الشخصية!"
          >
            {/* Comic Speech Bubble / Signboard Message */}
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`relative mb-1 px-3.5 py-2.5 max-w-[190px] sm:max-w-[240px] rounded-2xl shadow-2xl backdrop-blur-md text-right border ${
                isGirlSign
                  ? 'bg-amber-950/90 text-amber-200 border-amber-500/50 shadow-amber-500/20'
                  : 'bg-slate-900/95 text-white border-amber-400/50 shadow-slate-950/60'
              }`}
            >
              {/* TASK 3: High-contrast, easy-to-tap Close Button (min 32px) */}
              <button
                onClick={handleDismiss}
                className="absolute -top-3.5 -left-3.5 min-w-[32px] min-h-[32px] w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl border-2 border-white dark:border-slate-900 transition-all hover:scale-110 active:scale-95 cursor-pointer z-50 pointer-events-auto"
                title="إغلاق وإخفاء الشخصية"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </span>
                <p className="text-xs sm:text-sm font-black leading-snug tracking-tight">
                  {currentMessage}
                </p>
              </div>

              {/* Tap hint */}
              <div className="mt-1 flex items-center justify-between text-[9px] text-amber-400/80 font-bold border-t border-white/10 pt-1">
                <span>اضغط للتبديل 💬</span>
                <span className="text-slate-400">حقوق السادات ⚖️</span>
              </div>

              {/* Bubble Arrow Tail pointing to character */}
              <div
                className={`absolute -bottom-2 w-3 h-3 rotate-45 border-r border-b ${
                  isGirlSign
                    ? 'bg-amber-950/90 border-amber-500/50'
                    : 'bg-slate-900/95 border-amber-400/50'
                } ${isRight ? 'right-10' : 'left-10'}`}
              />
            </motion.div>

            {/* Character Render Container */}
            <div className="relative w-28 h-32 sm:w-36 sm:h-40 filter drop-shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={characterImage}
                alt="شخصية منصة الدستور التفاعلية"
                className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-105 transition-transform"
                loading="eager"
              />

              {/* Ambient Glow behind character */}
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-xl pointer-events-none -z-10" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ExamCountdownSettings } from '@/types';
import { calculateTimeRemaining } from '@/lib/utils';

export function ExamCountdown() {
  const [settings, setSettings] = useState<ExamCountdownSettings | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'exam_countdown')
        .single();

      if (!error && data && data.value) {
        setSettings(data.value as ExamCountdownSettings);
      }
    } catch {
      // In case table or row is not ready yet
    }
  };

  useEffect(() => {
    fetchSettings();

    // Listen to realtime updates on settings table
    const channel = supabase
      .channel('realtime_exam_settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
          filter: 'key=eq.exam_countdown',
        },
        (payload) => {
          if (payload.new && (payload.new as { value: ExamCountdownSettings }).value) {
            setSettings((payload.new as { value: ExamCountdownSettings }).value);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update timer every second
  useEffect(() => {
    if (!settings || !settings.active || !settings.target_date) return;

    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(settings.target_date);
      setTimeLeft(remaining);
    }, 1000);

    // Initial immediate calculation
    setTimeLeft(calculateTimeRemaining(settings.target_date));

    return () => clearInterval(timer);
  }, [settings]);

  // If countdown is turned off or not configured, return null (hide)
  if (!settings || !settings.active) {
    return null;
  }

  const timeUnits = [
    { label: 'أيام', value: timeLeft.days },
    { label: 'ساعات', value: timeLeft.hours },
    { label: 'دقائق', value: timeLeft.minutes },
    { label: 'ثواني', value: timeLeft.seconds },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-5xl mx-auto px-4 mt-6 sm:mt-8"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1630] to-slate-900 border border-amber-500/30 p-5 sm:p-6 shadow-xl shadow-amber-500/5">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-right">
          {/* Header & Title */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  <Calendar className="w-3 h-3" />
                  العد التنازلي للامتحانات
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                {settings.title || 'امتحانات الفصل الدراسي'}
              </h3>
            </div>
          </div>

          {/* Countdown Boxes */}
          {timeLeft.isPast ? (
            <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 py-2 rounded-xl border border-amber-500/40 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>حان موعد الامتحانات، مع تمنياتنا بالتوفيق والنجاح لجميع الطلاب!</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 sm:gap-4 w-full md:w-auto">
              {timeUnits.map((unit, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md rounded-xl p-2.5 sm:p-3 min-w-[65px] sm:min-w-[80px] border border-white/10 shadow-inner"
                >
                  <span className="text-xl sm:text-3xl font-black text-amber-400 tabular-nums">
                    {String(unit.value).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

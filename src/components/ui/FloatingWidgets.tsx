'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  FileEdit,
  Timer,
  X,
  Play,
  Pause,
  RotateCcw,
  Save,
  Check,
} from 'lucide-react';
import { SiteSettings } from '@/types';

interface FloatingWidgetsProps {
  settings?: SiteSettings;
}

export function FloatingWidgets({ settings }: FloatingWidgetsProps) {
  // Scratchpad Note State
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);

  // Pomodoro State
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [isPomoRunning, setIsPomoRunning] = useState(false);

  // Load scratchpad note
  useEffect(() => {
    const saved = localStorage.getItem('eldostour_student_notes');
    if (saved) setNoteContent(saved);
  }, []);

  // Save note
  const handleSaveNote = () => {
    localStorage.setItem('eldostour_student_notes', noteContent);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  // Pomodoro timer tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPomoRunning) {
      timer = setInterval(() => {
        setPomoSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsPomoRunning(false);
            alert('انتهت جلسة المذاكرة (25 دقيقة)! حان وقت استراحة قانونية قصيرة ☕');
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPomoRunning]);

  const formatPomoTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // WhatsApp formatting
  const rawPhone = settings?.whatsapp_number || '201000000000';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    settings?.whatsapp_message || 'مرحباً، أود الاستفسار بخصوص منصة الدستور - حقوق السادات'
  )}`;

  return (
    <>
      {/* Floating Action Buttons (Bottom Left Safe-Zone Positioning) */}
      <div className="fixed bottom-4 left-3 md:bottom-6 md:left-6 z-40 flex flex-col gap-2">
        {/* Pomodoro Timer Toggle */}
        <button
          onClick={() => setIsPomodoroOpen(!isPomodoroOpen)}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-slate-900 border border-amber-500/40 text-amber-400 hover:text-white hover:bg-amber-600 shadow-xl flex items-center justify-center transition-all active:scale-95"
          title="مؤقت المذاكرة الذكي (Pomodoro 25 min)"
          aria-label="مؤقت بومودورو"
        >
          <Timer className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Scratchpad Note Toggle */}
        <button
          onClick={() => setIsNoteOpen(!isNoteOpen)}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-slate-900 border border-slate-700 text-teal-400 hover:text-white hover:bg-teal-600 shadow-xl flex items-center justify-center transition-all active:scale-95"
          title="المفكرة والملاحظات السريعة"
          aria-label="المفكرة القانونية"
        >
          <FileEdit className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Floating WhatsApp Button */}
        {settings?.whatsapp_enabled !== false && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center transition-all active:scale-95 animate-bounce-subtle"
            title="تواصل معنا عبر واتساب"
            aria-label="واتساب"
          >
            <MessageCircle className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </a>
        )}
      </div>

      {/* Pomodoro Floating Panel */}
      {isPomodoroOpen && (
        <div className="fixed bottom-16 left-3 md:bottom-20 md:left-6 z-50 w-72 rounded-3xl bg-slate-900 border border-amber-500/40 p-4 shadow-2xl text-white text-right">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              مؤقت المذاكرة المركز (25 دقيقة)
            </span>
            <button onClick={() => setIsPomodoroOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center my-3">
            <span className="text-4xl font-black text-amber-400 tabular-nums">
              {formatPomoTime(pomoSeconds)}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsPomoRunning(!isPomoRunning)}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              {isPomoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPomoRunning ? 'إيقاف مؤقت' : 'بدء التركيز'}</span>
            </button>

            <button
              onClick={() => {
                setIsPomoRunning(false);
                setPomoSeconds(25 * 60);
              }}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              title="إعادة ضبط"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Scratchpad Note Floating Panel */}
      {isNoteOpen && (
        <div className="fixed bottom-16 left-3 md:bottom-20 md:left-6 z-50 w-80 max-w-[90vw] sm:w-96 rounded-3xl bg-slate-900 border border-teal-500/40 p-4 shadow-2xl text-white text-right flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
              <FileEdit className="w-4 h-4" />
              المفكرة القانونية السريعة (محفوظة لك)
            </span>
            <button onClick={() => setIsNoteOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            rows={6}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="اكتب ملاحظاتك، المواد التي تحتاج مراجعتها، أو أفكارك أثناء المذاكرة هنا..."
            className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none resize-none focus:border-teal-400"
          />

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={handleSaveNote}
              className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              {savedStatus ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedStatus ? 'تم الحفظ!' : 'حفظ الملاحظة'}</span>
            </button>

            <span className="text-[10px] text-slate-400">تحفظ في متصفحك تلقائياً</span>
          </div>
        </div>
      )}
    </>
  );
}

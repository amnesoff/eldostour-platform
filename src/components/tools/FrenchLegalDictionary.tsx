'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookA,
  Volume2,
  Search,
  RotateCw,
  ChevronRight,
  ChevronLeft,
  Gauge,
  Sparkles,
  Pause,
} from 'lucide-react';
import { FRENCH_LEGAL_TERMS, FrenchLegalTerm } from '@/lib/constants';
import { FrenchTermRecord } from '@/types';
import { supabase } from '@/lib/supabase';

export function FrenchLegalDictionary() {
  const [terms, setTerms] = useState<FrenchLegalTerm[]>(FRENCH_LEGAL_TERMS);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'flashcards'>('list');
  const [audioSpeed, setAudioSpeed] = useState<0.75 | 1.0>(1.0); // Feature #5
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [speakingTerm, setSpeakingTerm] = useState<string | null>(null);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch terms from Supabase
  useEffect(() => {
    const fetchDbTerms = async () => {
      try {
        const { data } = await supabase
          .from('french_terms')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const mapped: (FrenchLegalTerm & { audio_url?: string })[] = data.map((d: FrenchTermRecord) => ({
            french: d.french,
            arabic: d.arabic,
            pronunciationHint: d.pronunciation_hint || '',
            category: d.category || 'عام',
            example: d.example || '',
            audio_url: d.audio_url || undefined,
          }));
          setTerms(mapped);
        }
      } catch {
        // Fallback to constants
      }
    };

    fetchDbTerms();
  }, []);

  // Filtered terms
  const filtered = terms.filter(
    (item) =>
      item.french.toLowerCase().includes(search.toLowerCase()) ||
      item.arabic.includes(search) ||
      item.category.includes(search)
  );

  // Play pronunciation (custom audio or Web Speech API) with speed control
  const speakFrench = (item: FrenchLegalTerm & { audio_url?: string }) => {
    // If has custom uploaded audio
    if (item.audio_url) {
      if (speakingTerm === item.french) {
        activeAudioRef.current?.pause();
        setSpeakingTerm(null);
        return;
      }

      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }

      const audio = new Audio(item.audio_url);
      audio.playbackRate = audioSpeed;
      activeAudioRef.current = audio;
      setSpeakingTerm(item.french);
      audio.play();
      audio.onended = () => setSpeakingTerm(null);
      audio.onerror = () => setSpeakingTerm(null);
      return;
    }

    // Fallback: Web Speech API
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('ميزة نطق المصطلحات غير مدعومة في متصفحك الحالي.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(item.french);
      utterance.lang = 'fr-FR';
      utterance.rate = audioSpeed === 0.75 ? 0.75 : 0.95;
      setSpeakingTerm(item.french);
      utterance.onend = () => setSpeakingTerm(null);
      utterance.onerror = () => setSpeakingTerm(null);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingTerm(null);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % filtered.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
  };

  const currentFlashcard = filtered[currentCardIndex] || filtered[0];

  return (
    <div
      id="legal-dictionary"
      className="w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xl text-right text-slate-900 dark:text-white"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <BookA className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">
              القاموس القانوني الفرنسي العربي الناطق
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              المصطلحات القانونية بالفرنسية مع النطق الصوتي التفاعلي وبطاقات الاستذكار السريع
            </p>
          </div>
        </div>

        {/* View Mode & Audio Speed Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Feature #5: Audio Speed Toggle */}
          <button
            onClick={() => setAudioSpeed(audioSpeed === 1.0 ? 0.75 : 1.0)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
              audioSpeed === 0.75
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="تبديل سرعة نطق الصوت (0.75x بطيء للإتقان / 1.0x عادي)"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>سرعة الصوت: {audioSpeed}x</span>
          </button>

          {/* Feature #7: Flashcards vs List Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                viewMode === 'list'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              قائمة المصطلحات
            </button>
            <button
              onClick={() => setViewMode('flashcards')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-colors ${
                viewMode === 'flashcards'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>بطاقات تفاعلية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالفرنسية أو العربية (مثال: Droit, عقد, براءة, مسؤولية)..."
          className="w-full h-11 pr-10 pl-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm focus:border-sky-500 outline-none"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* VIEW MODE 1: INTERACTIVE FLASHCARDS (Feature #7) */}
      {viewMode === 'flashcards' ? (
        <div className="max-w-xl mx-auto py-2">
          {filtered.length > 0 && currentFlashcard ? (
            <div className="space-y-4">
              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                <span>البطاقة {currentCardIndex + 1} من {filtered.length}</span>
                <span className="text-sky-500">{currentFlashcard.category}</span>
              </div>

              {/* The Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[260px] rounded-3xl p-6 sm:p-8 cursor-pointer shadow-xl border transition-all duration-300 flex flex-col justify-between text-center select-none bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-[#09152b] dark:to-slate-950 border-sky-500/30 hover:border-sky-500/60"
              >
                {!isFlipped ? (
                  /* FRONT: French Term & Audio */
                  <div className="my-auto space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-500/20">
                      {currentFlashcard.category}
                    </span>

                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-serif tracking-wide" dir="ltr">
                      {currentFlashcard.french}
                    </h3>

                    {currentFlashcard.pronunciationHint && (
                      <p className="text-xs text-slate-400 font-semibold">
                        نطق تقريبي: ({currentFlashcard.pronunciationHint})
                      </p>
                    )}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakFrench(currentFlashcard);
                        }}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow transition-colors ${
                          speakingTerm === currentFlashcard.french
                            ? 'bg-sky-500 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-sky-500 hover:text-white'
                        }`}
                      >
                        {speakingTerm === currentFlashcard.french ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        <span>استمع للنطق ({audioSpeed}x)</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-amber-500 font-medium flex items-center justify-center gap-1 pt-2">
                      <RotateCw className="w-3 h-3" />
                      <span>اضغط على البطاقة لقلبها ومشاهدة الترجمة والمثال</span>
                    </p>
                  </div>
                ) : (
                  /* BACK: Arabic Translation & Legal Example */
                  <div className="my-auto space-y-4">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-bold block">الترجمة القانونية المعتمدة:</span>

                    <h3 className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                      {currentFlashcard.arabic}
                    </h3>

                    {currentFlashcard.example && (
                      <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic" dir="ltr">
                        &ldquo;{currentFlashcard.example}&rdquo;
                      </div>
                    )}

                    <p className="text-[11px] text-sky-500 font-medium flex items-center justify-center gap-1 pt-1">
                      <RotateCw className="w-3 h-3" />
                      <span>اضغط للعودة للمصطلح الفرنسي</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={prevCard}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>المصطلح السابق</span>
                </button>

                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors shadow-sm"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>قلب البطاقة</span>
                </button>

                <button
                  onClick={nextCard}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                >
                  <span>المصطلح التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">لا توجد مصطلحات مطابقة للبحث</div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: TERMS GRID LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-sky-500/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>

                  <button
                    onClick={() => speakFrench(item)}
                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${
                      speakingTerm === item.french
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500'
                    }`}
                    title={`استمع للنطق بالفرنسية (${audioSpeed}x)`}
                  >
                    {speakingTerm === item.french ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px]">نطق ({audioSpeed}x)</span>
                  </button>
                </div>

                <div className="flex items-baseline justify-between gap-2 mb-1" dir="ltr">
                  <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white font-serif">
                    {item.french}
                  </span>
                  {item.pronunciationHint && (
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      ({item.pronunciationHint})
                    </span>
                  )}
                </div>

                <div className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {item.arabic}
                </div>

                {item.example && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 italic leading-relaxed" dir="ltr">
                    &ldquo;{item.example}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
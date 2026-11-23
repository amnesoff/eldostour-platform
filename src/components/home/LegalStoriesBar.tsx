'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Share2,
  BookOpen,
  Scale,
  Award,
  Play,
  Pause,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LegalStory } from '@/types';

// Default curated legal stories if database has none
const DEFAULT_STORIES: LegalStory[] = [
  {
    id: 'story-1',
    title: 'مبدأ الشرعية الجنائية',
    category: 'قانون جنائي ⚖️',
    caption: 'لا جريمة ولا عقوبة إلا بنص قانوني سابق على ارتكاب الفعل، وهو صمام أمان الحرية الفردية وحصن المواطن المنيع.',
    media_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    media_type: 'image',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'story-2',
    title: 'العقد شريعة المتعاقدين',
    category: 'قانون مدني 📜',
    caption: 'القوة الملزمة للعقد تجعل بنوده قانوناً خاصاً يربط عاقديه ولا يجوز نقضه أو تعديله إلا باتفاقهما أو للأسباب المقررة قانوناً.',
    media_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    media_type: 'image',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'story-3',
    title: 'القرائن القضائية والقاطعة',
    category: 'قانون إثبات 🔍',
    caption: 'القرينة القانونية تعفي من تقررت لمصلحته من عبء الإثبات، وتعد وسيلة تشريعية بارعة لتحقيق التوازن بين الخصوم.',
    media_url: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?auto=format&fit=crop&w=1200&q=80',
    media_type: 'image',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'story-4',
    title: 'سمو القواعد الدستورية',
    category: 'قانون دستوري 🏛️',
    caption: 'الدستور هو القانون الأسمى الذي يعلو ولا يعلى عليه، وتخضع لسلطانه كافة التشريعات واللوائح دون استثناء.',
    media_url: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=80',
    media_type: 'image',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'story-5',
    title: 'نصيحة التفوق الأكاديمي',
    category: 'توجيهات الدستور ✨',
    caption: 'دراسة القانون فن ومنطق وتحليل وليست مجرد حفظ للنصوص؛ ركز على علل الأحكام وفلسفة التشريع تكن من الأوائل دائماً.',
    media_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
    media_type: 'image',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export function LegalStoriesBar() {
  const [stories, setStories] = useState<LegalStory[]>(DEFAULT_STORIES);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [readStoryIds, setReadStoryIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load viewed stories from storage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('eldostour_viewed_stories');
      if (saved) {
        setReadStoryIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch dynamic stories from Supabase
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data, error } = await supabase
          .from('legal_stories')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setStories(data as LegalStory[]);
        }
      } catch {
        // Keep defaults if table does not exist or offline
      }
    };

    fetchStories();
  }, []);

  // Story Timer & Progress Bar (5 seconds per story)
  useEffect(() => {
    if (activeStoryIndex === null || isPaused) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const stepMs = 50;
    const totalDurationMs = 5000;
    const increment = (stepMs / totalDurationMs) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Go to next story or close
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex((idx) => (idx !== null ? idx + 1 : null));
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + increment;
      });
    }, stepMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [activeStoryIndex, isPaused, stories.length]);

  const openStory = (index: number) => {
    setActiveStoryIndex(index);
    setProgress(0);
    setIsPaused(false);

    const story = stories[index];
    if (story) {
      setReadStoryIds((prev) => {
        const updated = new Set(prev).add(story.id);
        sessionStorage.setItem('eldostour_viewed_stories', JSON.stringify(Array.from(updated)));
        return updated;
      });
    }
  };

  const closeStory = () => {
    setActiveStoryIndex(null);
    setProgress(0);
    setIsPaused(false);
  };

  const nextStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
    } else {
      closeStory();
    }
  };

  const prevStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
    }
  };

  const currentStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <>
      {/* Stories Bar Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-4 select-none" dir="rtl">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-ping" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>استوريات وخواطر قانونية</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {stories.length} ومضات
          </span>
        </div>

        {/* Horizontal Scroll Bar */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
          {stories.map((story, idx) => {
            const isRead = readStoryIds.has(story.id);
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => openStory(idx)}
                className="group flex flex-col items-center gap-1.5 shrink-0 focus:outline-none transition-transform active:scale-95 snap-start"
              >
                {/* Glowing Circular Border Ring */}
                <div
                  className={`relative p-0.5 rounded-full transition-all duration-300 ${
                    isRead
                      ? 'bg-slate-300 dark:bg-slate-700 opacity-70'
                      : 'bg-gradient-to-tr from-amber-500 via-pink-500 to-rose-500 shadow-md shadow-amber-500/20 group-hover:scale-105'
                  }`}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-900 border-2 border-white dark:border-slate-950 overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={story.media_url}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 max-w-[70px] truncate text-center">
                  {story.title}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Full-Screen Interactive Story Viewer Modal */}
      <AnimatePresence>
        {currentStory && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none"
            dir="rtl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm sm:max-w-md h-[85vh] sm:h-[80vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
            >
              {/* Top Progress Bars */}
              <div className="absolute top-0 inset-x-0 z-30 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                <div className="flex items-center gap-1.5 mb-2.5">
                  {stories.map((st, i) => {
                    let fill = 0;
                    if (activeStoryIndex !== null) {
                      if (i < activeStoryIndex) fill = 100;
                      else if (i === activeStoryIndex) fill = progress;
                      else fill = 0;
                    }
                    return (
                      <div
                        key={st.id}
                        className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                      >
                        <div
                          className="h-full bg-white transition-all duration-75"
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Header: Author + Category + Controls */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-400">
                      ⚖️
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">
                        منصة الدستور التعليمية
                      </span>
                      <span className="text-[10px] text-amber-300">
                        {currentStory.category || 'ومضة قانونية'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPaused(!isPaused)}
                      className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                      title={isPaused ? 'استئناف' : 'إيقاف مؤقت'}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={closeStory}
                      className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                      title="إغلاق"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Media Container with Left/Right Click Nav */}
              <div
                className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-black cursor-pointer"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
              >
                {/* Background Full Media */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentStory.media_url}
                  alt={currentStory.title}
                  className="w-full h-full object-cover"
                />

                {/* Left/Right Tap Target Overlay */}
                <div
                  className="absolute inset-y-0 left-0 w-1/3 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextStory();
                  }}
                />
                <div
                  className="absolute inset-y-0 right-0 w-1/3 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevStory();
                  }}
                />
              </div>

              {/* Bottom Caption & Interactive Footer */}
              <div className="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent text-white space-y-2.5">
                <h4 className="text-base sm:text-lg font-black text-amber-300 drop-shadow">
                  {currentStory.title}
                </h4>

                {currentStory.caption && (
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed drop-shadow line-clamp-3">
                    {currentStory.caption}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `⚖️ ومضة قانونية من منصة الدستور التعليمية:\n\n*${currentStory.title}*\n${currentStory.caption || ''}\n\nتابع المزيد عبر المنصة:`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    <span>مشاركة عبر واتساب</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevStory}
                      disabled={activeStoryIndex === 0}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-colors"
                      title="السابق"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextStory}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="التالي"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

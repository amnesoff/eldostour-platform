'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, Sparkles, X, ImageIcon, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UrgentNewsItem } from '@/types';
import { formatDateArabic } from '@/lib/utils';
import { COLLEGE_NAME } from '@/lib/constants';

interface UrgentNewsTickerProps {
  initialNews?: UrgentNewsItem[];
}

export function UrgentNewsTicker({ initialNews = [] }: UrgentNewsTickerProps) {
  const [news, setNews] = useState<UrgentNewsItem[]>(initialNews);
  const [loading, setLoading] = useState(initialNews.length === 0);
  const [selectedNews, setSelectedNews] = useState<UrgentNewsItem | null>(null);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('urgent_news')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        setNews([]);
      } else if (data) {
        setNews(data as UrgentNewsItem[]);
      }
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();

    const channel = supabase
      .channel('realtime_urgent_news')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'urgent_news' },
        () => {
          fetchNews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Strict Rule: If no news exists in Supabase, completely hide the ticker bar!
  if (loading || news.length === 0) {
    return null;
  }

  return (
    <>
      <div
        dir="rtl"
        className="relative z-30 w-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-slate-950 shadow-md border-b border-amber-400/40 select-none overflow-hidden"
      >
        <div className="max-w-7xl mx-auto flex items-center h-10 px-3 sm:px-4">
          {/* Urgent Badge Pin */}
          <div className="flex items-center gap-1.5 bg-slate-950 text-amber-300 font-bold px-2.5 py-1 rounded-md text-xs sm:text-sm shrink-0 shadow-sm border border-amber-400/30 z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <BellRing className="w-3.5 h-3.5" />
            <span>عاجل وهام</span>
          </div>

          {/* Scrolling text marquee */}
          <div className="relative overflow-hidden w-full flex items-center mr-3 h-full">
            <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
              {news.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedNews(item)}
                  className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-950 hover:underline cursor-pointer group"
                >
                  {item.image_url && (
                    <span className="inline-flex items-center gap-1 bg-slate-950/20 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black border border-slate-950/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-4 h-4 rounded object-cover"
                      />
                      <ImageIcon className="w-3 h-3" />
                      <span>صورة</span>
                    </span>
                  )}
                  <span>{item.content}</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-900/60 inline shrink-0 group-hover:rotate-12 transition-transform" />
                </button>
              ))}

              {/* Duplicate for seamless continuous looping */}
              {news.map((item, idx) => (
                <button
                  key={`dup-${idx}`}
                  onClick={() => setSelectedNews(item)}
                  className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-950 hover:underline cursor-pointer group"
                >
                  {item.image_url && (
                    <span className="inline-flex items-center gap-1 bg-slate-950/20 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black border border-slate-950/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-4 h-4 rounded object-cover"
                      />
                      <ImageIcon className="w-3 h-3" />
                      <span>صورة</span>
                    </span>
                  )}
                  <span>{item.content}</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-900/60 inline shrink-0 group-hover:rotate-12 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes marquee {
            0% {
              transform: translateX(0%);
            }
            100% {
              transform: translateX(50%);
            }
          }
          .animate-marquee {
            display: inline-flex;
            animation: marquee 25s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>
      </div>

      {/* Selected News Announcement Modal */}
      {selectedNews && (
        <div
          dir="rtl"
          onClick={() => setSelectedNews(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-right text-white max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors z-10"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  تنبيه وإعلان عاجل
                </h3>
                <span className="text-xs text-amber-300/80">
                  {COLLEGE_NAME}
                </span>
              </div>
            </div>

            {/* Attached Announcement Image */}
            {selectedNews.image_url && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 max-h-[50vh] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedNews.image_url}
                  alt="صورة الإعلان"
                  className="w-full h-auto max-h-[50vh] object-contain rounded-xl"
                />
              </div>
            )}

            {/* Announcement Content */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm sm:text-base leading-relaxed text-slate-200">
              {selectedNews.content}
            </div>

            {/* Footer with date */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>نُشر بتاريخ: {formatDateArabic(selectedNews.created_at)}</span>
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Video,
  Award,
  ChevronLeft,
  Sparkles,
  Play,
} from 'lucide-react';
import { SubjectCover } from '@/types';

interface SubjectCoverCardProps {
  cover: SubjectCover;
  onClick: () => void;
}

export function SubjectCoverCard({ cover, onClick }: SubjectCoverCardProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Desktop Hover Handler (~1 second delay like YouTube)
  const handleMouseEnter = () => {
    if (!cover.preview_video_url) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    hoverTimeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current
          .play()
          .then(() => {
            setIsVideoPlaying(true);
          })
          .catch(() => {
            // Guardrail: Safe media playback handler
            setIsVideoPlaying(false);
          });
      }
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      try {
        videoRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
    setIsVideoPlaying(false);
  };

  // Mobile / Touch Handler (IntersectionObserver ~1.5 - 2s delay when centered)
  useEffect(() => {
    if (!cover.preview_video_url) return;
    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
            mobileTimeoutRef.current = setTimeout(() => {
              if (videoRef.current) {
                videoRef.current
                  .play()
                  .then(() => {
                    setIsVideoPlaying(true);
                  })
                  .catch(() => {
                    setIsVideoPlaying(false);
                  });
              }
            }, 1500);
          } else {
            if (mobileTimeoutRef.current) {
              clearTimeout(mobileTimeoutRef.current);
              mobileTimeoutRef.current = null;
            }
            if (videoRef.current) {
              videoRef.current.pause();
              try {
                videoRef.current.currentTime = 0;
              } catch {
                // ignore
              }
            }
            setIsVideoPlaying(false);
          }
        });
      },
      {
        threshold: [0, 0.75, 1.0],
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      if (mobileTimeoutRef.current) clearTimeout(mobileTimeoutRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [cover.preview_video_url]);

  return (
    <motion.div
      ref={containerRef}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-amber-500/50 dark:hover:border-amber-400/40 transition-all overflow-hidden cursor-pointer group select-none"
    >
      {/* 16:9 Thumbnail & Animated Preview Video Layer */}
      <div className="relative w-full aspect-video bg-slate-950 overflow-hidden">
        {/* Static Cover Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover.cover_image_url}
          alt={cover.subject_name}
          className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
            isVideoPlaying ? 'scale-100' : 'group-hover:scale-105'
          }`}
          loading="lazy"
        />

        {/* YouTube-Style Hover Preview Video */}
        {cover.preview_video_url && (
          <video
            ref={videoRef}
            src={cover.preview_video_url}
            playsInline
            muted
            loop
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none ${
              isVideoPlaying ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          />
        )}

        {/* Video Preview Indicator Badge */}
        {cover.preview_video_url && (
          <div
            className={`absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all duration-300 ${
              isVideoPlaying
                ? 'bg-amber-500 text-slate-950 border border-yellow-300 animate-pulse'
                : 'bg-slate-950/80 text-amber-400 border border-amber-400/30 group-hover:bg-amber-500 group-hover:text-slate-950'
            }`}
          >
            {isVideoPlaying ? (
              <>
                <Sparkles className="w-3 h-3 text-slate-950 animate-spin" />
                <span>معاينة حية 🎬</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>معاينة فيديو 🎬</span>
              </>
            )}
          </div>
        )}

        {/* Professor Name Tag */}
        {cover.professor_name && (
          <div className="absolute bottom-3 right-3 z-20 px-3 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 text-[11px] font-bold text-white shadow-md">
            {cover.professor_name}
          </div>
        )}

        {/* Subtle Dark Gradient at bottom of image for text contrast */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none z-10" />
      </div>

      {/* Card Info & Content Stats */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
            {cover.subject_name}
          </h3>

          {cover.description ? (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
              {cover.description}
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              انقر لاستعراض المحاضرات والـ PDF، شروحات الفيديو، وبنك الأسئلة.
            </p>
          )}
        </div>

        {/* Content Badges & Action CTA */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          {/* Quick Counter Pills */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <FileText className="w-3 h-3" />
              <span>{cover.materials_count || 0} PDF</span>
            </span>

            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Video className="w-3 h-3" />
              <span>{cover.videos_count || 0} فيديو</span>
            </span>

            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Award className="w-3 h-3" />
              <span>{cover.quizzes_count || 0} أسئلة</span>
            </span>
          </div>

          {/* Action Arrow */}
          <div className="flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 group-hover:text-amber-500 transition-colors">
            <span>دخول المادة</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

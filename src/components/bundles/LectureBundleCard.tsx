'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderArchive,
  Calendar,
  User,
  Star,
  CheckCircle2,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { LectureBundle } from '@/types';

interface LectureBundleCardProps {
  bundle: LectureBundle;
  onOpenBundle: (bundle: LectureBundle) => void;
  onOpenQuiz?: (quizId: string) => void;
}

export function LectureBundleCard({
  bundle,
  onOpenBundle,
}: LectureBundleCardProps) {
  // Feature #1: Completion Tracker
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    try {
      const completedList = JSON.parse(localStorage.getItem('eldostour_completed_bundles') || '[]');
      if (Array.isArray(completedList) && completedList.includes(bundle.id)) {
        setIsCompleted(true);
      }
    } catch {
      // ignore
    }
  }, [bundle.id]);

  const toggleCompleted = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const completedList: string[] = JSON.parse(
        localStorage.getItem('eldostour_completed_bundles') || '[]'
      );
      let updated: string[];
      if (completedList.includes(bundle.id)) {
        updated = completedList.filter((id) => id !== bundle.id);
        setIsCompleted(false);
      } else {
        updated = [...completedList, bundle.id];
        setIsCompleted(true);
      }
      localStorage.setItem('eldostour_completed_bundles', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Feature #16: Trending "الأكثر تحميلاً" Badge (if downloads >= 5 or views >= 10)
  const isTrending = (bundle.downloads_count || 0) >= 5 || (bundle.views_count || 0) >= 15;

  // Feature #14: Difficulty tag styling
  const difficultyBadge = {
    easy: { text: 'سهلة ومباشرة 🟢', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    medium: { text: 'متوسطة 🟡', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    hard: { text: 'دسمة وتحتاج تركيز 🔴', bg: 'bg-red-500/10 text-red-500 border-red-500/20' },
  }[bundle.difficulty || 'medium'];

  // Count files inside
  const filesCount = [
    bundle.video_url,
    bundle.lecture_pdf_url,
    bundle.summary_pdf_url,
    bundle.questions_pdf_url,
  ].filter(Boolean).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={() => onOpenBundle(bundle)}
      className={`relative flex flex-col rounded-3xl bg-white dark:bg-slate-900 border transition-all overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl ${
        isCompleted
          ? 'border-emerald-500/50 bg-emerald-500/[0.02]'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-amber-500/40'
      }`}
    >
      {/* Thumbnail Cover or Fallback Gradient */}
      <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-slate-950 flex items-center justify-center">
        {bundle.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bundle.thumbnail_url}
            alt={bundle.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-[#0B1736] to-slate-950 flex flex-col items-center justify-center p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-16 h-16 opacity-30 object-contain mb-2" />
            <FolderArchive className="w-8 h-8 text-amber-500/60" />
            <span className="text-xs text-slate-400 mt-1 font-bold">باقة المحاضرة الشاملة</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

        {/* Top Floating Badges */}
        <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2 z-10">
          {/* Trending Badge */}
          {isTrending ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-[10px] shadow-lg border border-amber-300">
              <Flame className="w-3 h-3 fill-current" />
              <span>الأكثر تحميلاً 🔥</span>
            </span>
          ) : (
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-amber-400 border border-white/10 font-bold">
              باقة متكاملة
            </span>
          )}

          {/* Feature #1: Completion Tracker Toggle */}
          <button
            onClick={toggleCompleted}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black backdrop-blur-md transition-all shadow-md ${
              isCompleted
                ? 'bg-emerald-500 text-white border border-emerald-400'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10'
            }`}
            title={isCompleted ? 'تمت مذاكرة هذه المحاضرة بنجاح' : 'اضغط لتحديد كمكتملة'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isCompleted ? 'تمت المذاكرة ✅' : 'تحديد كمكتملة'}</span>
          </button>
        </div>

        {/* Bottom Thumbnail Info: Subject & Files count */}
        <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-xs text-white z-10">
          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/90 text-slate-950 font-black text-[11px] shadow">
            {bundle.subjects?.name || 'مادة قانونية'}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-slate-200 text-[10px] border border-white/10">
            {filesCount} ملفات مرفقة 📁
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between text-right">
        <div>
          {/* Title */}
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-amber-500 transition-colors">
            {bundle.title}
          </h3>

          {/* Professor & Date info */}
          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-3">
            {bundle.professor_name && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span>أستاذ المادة: <strong className="text-slate-800 dark:text-slate-200">{bundle.professor_name}</strong></span>
              </div>
            )}
            {bundle.lecture_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>تاريخ المحاضرة: {bundle.lecture_date}</span>
              </div>
            )}
          </div>

          {/* Difficulty & Rating */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${difficultyBadge.bg}`}>
              {difficultyBadge.text}
            </span>

            <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{bundle.average_rating ? bundle.average_rating.toFixed(1) : '5.0'}</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">({bundle.ratings_count || 1})</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-500">
          <span className="group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
            <span>فتح باقة المحاضرة والمحتويات</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </span>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            فيديو • مذكرات • أسئلة
          </span>
        </div>
      </div>
    </motion.div>
  );
}
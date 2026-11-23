'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Video,
  Download,
  Play,
  ThumbsUp,
  Calendar,
  HardDrive,
  Sparkles,
  Flame,
  Loader2,
  Eye,
} from 'lucide-react';
import { Material } from '@/types';
import { isNewItem, formatDateArabic, formatFileSize } from '@/lib/utils';
import { studentLikeMaterial } from '@/lib/apiClient';
import { downloadDirectWatermarkedPdf } from '@/lib/pdfWatermark';

interface MaterialCardProps {
  material: Material;
  onOpenVideo?: (material: Material) => void;
  onOpenPdf?: (material: Material) => void;
}

export function MaterialCard({
  material,
  onOpenVideo,
  onOpenPdf,
}: MaterialCardProps) {
  const [likes, setLikes] = useState(material.likes_count || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check if student already liked this item in this browser
  useEffect(() => {
    const likedItems = localStorage.getItem('eldostour_liked_materials');
    if (likedItems) {
      try {
        const ids: string[] = JSON.parse(likedItems);
        if (ids.includes(material.id)) {
          setHasLiked(true);
        }
      } catch {
        // ignore parse error
      }
    }
  }, [material.id]);

  // Keep likes updated when prop changes
  useEffect(() => {
    setLikes(material.likes_count || 0);
  }, [material.likes_count]);

  const handleLike = async () => {
    if (hasLiked || isLiking) return;

    setIsLiking(true);
    // Optimistic update
    setLikes((prev) => prev + 1);
    setHasLiked(true);

    try {
      // Save local flag to prevent spamming
      const likedItems = localStorage.getItem('eldostour_liked_materials');
      const ids: string[] = likedItems ? JSON.parse(likedItems) : [];
      if (!ids.includes(material.id)) {
        ids.push(material.id);
        localStorage.setItem('eldostour_liked_materials', JSON.stringify(ids));
      }

      await studentLikeMaterial(material.id);
    } catch (err) {
      console.warn('Like increment exception:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDirectDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const studentName = localStorage.getItem('eldostour_student_name') || 'طالب كلية الحقوق';
      const studentCode = localStorage.getItem('eldostour_student_id_num') || 'DST-LAW';
      await downloadDirectWatermarkedPdf(material.file_url, material.title, {
        name: studentName,
        code: studentCode,
      });
    } catch (err) {
      console.warn('Direct download error:', err);
      // Fallback
      window.open(material.file_url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCardClick = () => {
    if (isPdf) {
      onOpenPdf?.(material);
    } else {
      onOpenVideo?.(material);
    }
  };

  const isNew = isNewItem(material.created_at, 72);
  const isTrending = (material.likes_count || 0) >= 5 || (material.views_count || 0) >= 15;
  const isPdf = material.file_type === 'pdf';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      onClick={handleCardClick}
      className="relative flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-amber-500/40 dark:hover:border-amber-400/30 transition-all overflow-hidden group cursor-pointer select-none"
    >
      {/* Top Banner & Subject Tag */}
      <div className="p-4 sm:p-5 pb-3 flex-1 flex flex-col">
        {/* Header Metadata Row: File Type + Status Badge + Subject Name */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* File Type Pill & Status Badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`p-1.5 rounded-lg shrink-0 ${
                isPdf
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
              }`}
            >
              {isPdf ? <FileText className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isPdf ? 'ملف PDF' : 'فيديو مباشر'}
            </span>

            {/* 72-Hour "NEW / جديد" or "Trending" Badge: Placed cleanly in document flow, NEVER overlaps title or subject */}
            {isNew ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] shadow-sm shadow-amber-500/20 border border-yellow-300">
                <Sparkles className="w-3 h-3 text-slate-950 animate-spin" />
                <span>جديد</span>
              </span>
            ) : isTrending ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-[10px] shadow-sm shadow-orange-500/20 border border-orange-300">
                <Flame className="w-3 h-3 fill-current text-slate-950" />
                <span>الأكثر طلباً 🔥</span>
              </span>
            ) : null}
          </div>

          {/* Subject Badge */}
          {material.subjects?.name && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700/60 max-w-[140px] truncate shrink-0">
              {material.subjects.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
          {material.title}
        </h3>

        {/* Admin Custom Note / Description (Must be clearly shown) */}
        {material.description ? (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            <p className="line-clamp-3">{material.description}</p>
          </div>
        ) : (
          <div className="mb-4" />
        )}

        {/* Meta Info: File Size & Date */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDateArabic(material.created_at)}</span>
          </div>

          {material.file_size ? (
            <div className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{formatFileSize(material.file_size)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}
          disabled={hasLiked}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            hasLiked
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
          }`}
          title={hasLiked ? 'لقد سجلت إعجابك' : 'تسجيل الإعجاب'}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
          <span>مفيد</span>
          <span className="bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md text-[10px]">
            {likes}
          </span>
        </button>

        {/* Action Button: Direct One-Tap Programmatic Download or Video Player */}
        {isPdf ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-1 group-hover:text-amber-500 transition-colors">
              <Eye className="w-3.5 h-3.5" />
              <span>انقر للمعاينة</span>
            </span>

            <button
              onClick={handleDirectDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60"
              title="تحميل مباشر إلى مجلد التنزيلات بالجهاز"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ التحميل...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل مباشر</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenVideo?.(material);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>مشاهدة الفيديو</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

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
  ExternalLink,
  Flame,
} from 'lucide-react';
import { Material } from '@/types';
import { isNewItem, formatDateArabic, formatFileSize } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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

      // Supabase RPC call or direct update
      const { error: rpcError } = await supabase.rpc('increment_likes', {
        material_id: material.id,
      });

      if (rpcError) {
        // Fallback direct update if RPC is missing
        await supabase
          .from('materials')
          .update({ likes_count: likes + 1 })
          .eq('id', material.id);
      }
    } catch (err) {
      console.warn('Like increment exception:', err);
    } finally {
      setIsLiking(false);
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
      className="relative flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-amber-500/40 dark:hover:border-amber-400/30 transition-all overflow-hidden group"
    >
      {/* 72-Hour "NEW / جديد" Glowing Badge (Feature 5 & 23) */}
      {isNew ? (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[11px] shadow-lg shadow-amber-500/30 border border-yellow-300">
          <Sparkles className="w-3 h-3 text-slate-950 animate-spin" />
          <span>جديد</span>
        </div>
      ) : isTrending ? (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-[11px] shadow-lg shadow-orange-500/30 border border-orange-300">
          <Flame className="w-3 h-3 fill-current text-slate-950" />
          <span>الأكثر طلباً 🔥</span>
        </div>
      ) : null}

      {/* Top Banner & Subject Tag */}
      <div className="p-4 sm:p-5 pb-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* File Type Pill */}
          <div className="flex items-center gap-1.5">
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
          </div>

          {/* Subject Badge */}
          {material.subjects?.name && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700/60 max-w-[150px] truncate">
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
          onClick={handleLike}
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

        {/* Action Button: PDF View/Download or Video Player */}
        {isPdf ? (
          <div className="flex items-center gap-1.5">
            {onOpenPdf && (
              <button
                onClick={() => onOpenPdf(material)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                title="معاينة المستند"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>معاينة</span>
              </button>
            )}
            <a
              href={material.file_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل PDF</span>
            </a>
          </div>
        ) : (
          <button
            onClick={() => onOpenVideo?.(material)}
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

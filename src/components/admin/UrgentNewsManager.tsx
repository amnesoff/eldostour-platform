'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BellRing,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Info,
  ImageIcon,
  X,
  ExternalLink,
} from 'lucide-react';
import { UrgentNewsItem } from '@/types';
import { formatDateArabic } from '@/lib/utils';
import { supabase, uploadNewsImage, deleteStorageFile } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';

interface UrgentNewsManagerProps {
  news: UrgentNewsItem[];
  onRefresh: () => void;
}

export function UrgentNewsManager({ news, onRefresh }: UrgentNewsManagerProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  // Add news item
  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsAdding(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      let imageUrl = '';
      let imageStoragePath = '';

      if (imageFile) {
        const uploadRes = await uploadNewsImage(imageFile, (p) => setUploadProgress(p));
        if (uploadRes) {
          imageUrl = uploadRes.publicUrl;
          imageStoragePath = uploadRes.storagePath;
        }
      }

      const { error: insertError } = await supabase.from('urgent_news').insert({
        content: content.trim(),
        image_url: imageUrl,
        image_storage_path: imageStoragePath,
        is_active: true,
      });

      if (insertError) throw insertError;

      setSuccess('تمت إضافة الخبر العاجل والإعلان بنجاح وسيظهر فوراً في الشريط العلوي للطلاب!');
      setContent('');
      clearImage();
      onRefresh();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`خطأ أثناء إضافة الخبر: ${err?.message || ''}`);
    } finally {
      setIsAdding(false);
      setUploadProgress(0);
    }
  };

  // Toggle active status
  const handleToggleActive = async (item: UrgentNewsItem) => {
    try {
      const { error } = await supabase
        .from('urgent_news')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert(`خطأ أثناء تحديث حالة الخبر: ${err?.message || ''}`);
    }
  };

  // Delete news item
  const handleDeleteNews = async (item: UrgentNewsItem) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر العاجل؟')) return;

    try {
      if (item.image_storage_path) {
        await deleteStorageFile(item.image_storage_path);
      }

      const { error } = await supabase.from('urgent_news').delete().eq('id', item.id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert(`خطأ أثناء حذف الخبر: ${err?.message || ''}`);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              إدارة شريط الأخبار العاجلة والتنبيهات
            </h3>
            <p className="text-xs text-slate-400">
              إضافة أو حذف التنبيهات المنبثقة في الشريط المتحرك أعلى منصة الطلاب
            </p>
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="mb-6 flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>ملاحظة هامة:</strong> إذا لم توجد أي أخبار نشطة أو تم حذف جميع الأخبار، فسيتم إخفاء شريط الأخبار العاجلة تلقائياً وبشكل كامل من بوابة الطلاب دون ترك أي مساحة فارغة.
        </span>
      </div>

      {/* Add News Form */}
      <form onSubmit={handleAddNews} className="space-y-4 mb-8">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            نص التنبيه أو الخبر العاجل:
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="مثال: تنبيه لطلاب الفرقة الثانية: تم رفع جدول امتحانات الفصل الدراسي الأول المعتمد رسمياً..."
            required
            rows={2}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-sm text-white outline-none resize-none"
          />
        </div>

        {/* Optional Image Upload for News Announcement */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            صورة أو بوستر مرفق مع الإعلان (اختياري - يظهر بجانب الخبر في شريط التنبيهات):
          </label>
          
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition-colors">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>{imageFile ? 'تغيير الصورة المرفقة' : 'رفع صورة الإعلان / المستند'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            {imagePreview && (
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="معاينة الصورة"
                  className="w-8 h-8 rounded-lg object-cover border border-amber-500/30"
                />
                <span className="text-xs text-slate-300 max-w-[150px] truncate">
                  {imageFile?.name}
                </span>
                <button
                  type="button"
                  onClick={clearImage}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="إلغاء الصورة"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-2 w-full max-w-xs bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isAdding || !content.trim()}
            className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري النشر ورفع المرفقات...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>نشر الخبر العاجل</span>
              </>
            )}
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Existing News List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-300 mb-2">
          الأخبار والتنبيهات الحالية ({news.length}):
        </h4>

        {news.length > 0 ? (
          news.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                item.is_active
                  ? 'bg-slate-950/80 border-slate-800'
                  : 'bg-slate-950/40 border-slate-800/40 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    item.is_active
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <BellRing className="w-4 h-4" />
                </span>

                {/* News Image Thumbnail if attached */}
                {item.image_url ? (
                  <button
                    onClick={() => setPreviewModalImage(item.image_url || null)}
                    className="relative w-12 h-12 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 group hover:opacity-90 transition-opacity"
                    title="اضغط لتكبير صورة الإعلان"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt="صورة الإعلان"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                    </div>
                  </button>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {item.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-slate-500">
                      تاريخ النشر: {formatDateArabic(item.created_at)}
                    </span>
                    {item.image_url && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        مرفق صورة إعلان 🖼️
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    item.is_active
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title={item.is_active ? 'تعطيل الخبر' : 'تفعيل الخبر'}
                >
                  {item.is_active ? (
                    <>
                      <ToggleRight className="w-4 h-4" />
                      <span>نشط</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" />
                      <span>معطل</span>
                    </>
                  )}
                </button>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteNews(item)}
                  className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-colors"
                  title="حذف الخبر والمرفقات"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <EmptyState
            title="لا توجد أخبار عاجلة"
            description="الشريط مخفي حالياً على واجهة الطلاب لعدم وجود أي تنبيهات نشطة."
            icon="file"
          />
        )}
      </div>

      {/* Image Preview Modal */}
      {previewModalImage && (
        <div
          onClick={() => setPreviewModalImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-4 overflow-hidden shadow-2xl"
          >
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-4 left-4 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewModalImage}
              alt="صورة الإعلان بالحجم الكامل"
              className="w-full max-h-[80vh] object-contain rounded-2xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}

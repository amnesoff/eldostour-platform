'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImageIcon,
  X,
  ExternalLink,
  UploadCloud,
  Check,
} from 'lucide-react';
import { LegalStory } from '@/types';
import { supabase } from '@/lib/supabase';
import { uploadToCloudStorage } from '@/lib/cloudUpload';
import { adminDbMutate } from '@/lib/apiClient';

const CATEGORIES = [
  'نصيحة قانونية ⚖️',
  'قانون مدني 📜',
  'قانون جنائي 🏛️',
  'قانون إثبات 🔍',
  'قانون دستوري 🏛️',
  'سؤال اليوم 🎯',
  'تنبيه هام ⚡',
  'توجيهات الدستور ✨',
];

export function LegalStoriesManager() {
  const [stories, setStories] = useState<LegalStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('legal_stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (!fetchErr && data) {
        setStories(data as LegalStory[]);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    }
  };

  const clearSelectedMedia = () => {
    setMediaFile(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى كتابة عنوان الومضة / الاستوري');
      return;
    }

    if (!mediaFile) {
      setError('يرجى اختيار صورة أو فيديو قصير للرفع');
      return;
    }

    setIsAdding(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      // 1. Upload to Cloudinary (Primary 25GB Free Storage) with Supabase fallback
      const mediaUrl = await uploadToCloudStorage(
        mediaFile,
        'legal_stories',
        (p) => setUploadProgress(p)
      );

      const isVideo =
        mediaFile.type.includes('video') ||
        ['.mp4', '.webm', '.mov'].some((ext) =>
          mediaFile.name.toLowerCase().endsWith(ext)
        );

      // 2. Insert into Supabase table via secure server route
      const mutateRes = await adminDbMutate({
        table: 'legal_stories',
        mutation: 'insert',
        data: {
          title: title.trim(),
          category,
          caption: caption.trim(),
          media_url: mediaUrl,
          media_type: isVideo ? 'video' : 'image',
          is_active: true,
        },
      });

      if (!mutateRes.success) {
        throw new Error(mutateRes.error || 'فشل حفظ الاستوري في قاعدة البيانات');
      }

      setSuccess('تم رفع ونشر الاستوري بنجاح عبر التخزين السحابي Cloudinary!');
      setTitle('');
      setCaption('');
      clearSelectedMedia();
      fetchStories();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'فشل رفع الاستوري');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStory = async (id: string, storyTitle: string) => {
    if (!confirm(`هل أنت متأكد من حذف استوري "${storyTitle}"؟`)) return;

    setDeletingId(id);
    try {
      const delRes = await adminDbMutate({ table: 'legal_stories', mutation: 'delete', id });
      if (delRes.success) {
        setStories((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert('فشل حذف الاستوري');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStoryActive = async (id: string, currentStatus?: boolean) => {
    const nextVal = !currentStatus;
    try {
      const updRes = await adminDbMutate({
        table: 'legal_stories',
        mutation: 'update',
        id,
        data: { is_active: nextVal },
      });

      if (updRes.success) {
        setStories((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_active: nextVal } : s))
        );
      }
    } catch {
      alert('فشل تغيير حالة الاستوري');
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-rose-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>رافع ومحرر الاستوريات القانونية (Cloudinary 25GB)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            انشر ومضات قانونية وقواعد قضائية مصورة لطلاب المنصة مع رفع سحابي فائق السرعة
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
          Cloudinary Cloud: wn9a8xca
        </div>
      </div>

      {/* Upload Form */}
      <form
        onSubmit={handleCreateStory}
        className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl"
      >
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-pink-400" />
          <span>إضافة استوري / ومضة قانونية جديدة</span>
        </h3>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              عنوان الاستوري / الومضة *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مبدأ لا جريمة إلا بنص..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white text-xs outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              التصنيف القانوني
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white text-xs outline-none transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            الشرح / النص التفصيلي للاستوري (اختياري)
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            placeholder="اكتب خلاصة القاعدة أو النصيحة التي ستظهر أسفل الاستوري..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white text-xs outline-none transition-colors"
          />
        </div>

        {/* Media File Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            ملف الوسائط (صورة أو فيديو قصير بدقة عالية) *
          </label>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/mp4,video/webm"
            onChange={handleMediaSelect}
            className="hidden"
          />

          {!mediaPreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-950/50 hover:bg-slate-950 transition-all text-slate-400 hover:text-white"
            >
              <ImageIcon className="w-8 h-8 text-amber-400" />
              <span className="text-xs font-bold">
                انقر لاختيار صورة أو فيديو (JPG / PNG / WebP / MP4)
              </span>
              <span className="text-[10px] text-slate-500">
                يتم الرفع سحابياً إلى Cloudinary بنطاق ترددي 25GB مجاني
              </span>
            </button>
          ) : (
            <div className="relative w-full max-w-xs h-48 rounded-2xl overflow-hidden border border-amber-500/40 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaPreview}
                alt="معاينة"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={clearSelectedMedia}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600/90 text-white hover:bg-rose-600 transition-colors"
                title="إلغاء الملف"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Upload Button + Progress Bar */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-amber-300 font-mono">
              <span>جارِ الرفع إلى Cloudinary...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-pink-500 transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isAdding}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-500/20 active:scale-98 transition-all disabled:opacity-50"
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جارِ الرفع السحابي والنشر...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>نشر الاستوري الآن 🚀</span>
            </>
          )}
        </button>
      </form>

      {/* Existing Stories List */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
          <span>الاستوريات المنشورة حالياً</span>
          <span className="text-xs text-slate-400 font-mono">
            {stories.length} استوري
          </span>
        </h3>

        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            جارِ تحميل الاستوريات...
          </div>
        ) : stories.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            لا توجد استوريات مخصصة مرفوعة حالياً. تعرض المنصة الاستوريات القانونية الافتراضية.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {stories.map((st) => (
              <div
                key={st.id}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 relative group"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={st.media_url}
                    alt={st.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-white truncate">
                    {st.title}
                  </span>
                  <span className="text-[10px] text-amber-400 block truncate">
                    {st.category}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(st.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleStoryActive(st.id, st.is_active)}
                    className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                      st.is_active
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                    title={st.is_active ? 'تعطيل الاستوري' : 'تفعيل الاستوري'}
                  >
                    {st.is_active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteStory(st.id, st.title)}
                    disabled={deletingId === st.id}
                    className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-colors disabled:opacity-50"
                    title="حذف نهائي"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

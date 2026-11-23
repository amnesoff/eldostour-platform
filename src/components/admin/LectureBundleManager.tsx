'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { LectureBundle, AcademicYearId, Subject, Quiz, VideoChapter } from '@/types';
import { ACADEMIC_YEARS, COLLEGE_NAME, PLATFORM_NAME } from '@/lib/constants';
import { supabase, uploadThumbnail, uploadMaterialFile } from '@/lib/supabase';

interface LectureBundleManagerProps {
  subjects: Subject[];
  quizzes?: Quiz[];
  onRefresh?: () => void;
}

export function LectureBundleManager({
  subjects,
  quizzes = [],
  onRefresh,
}: LectureBundleManagerProps) {
  const [bundles, setBundles] = useState<LectureBundle[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [lectureDate, setLectureDate] = useState('');
  const [year, setYear] = useState<AcademicYearId>(1);
  const [subjectId, setSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [relatedQuizId, setRelatedQuizId] = useState('');

  // Attached Media Files
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [lecturePdfFile, setLecturePdfFile] = useState<File | null>(null);
  const [summaryPdfFile, setSummaryPdfFile] = useState<File | null>(null);
  const [questionsPdfFile, setQuestionsPdfFile] = useState<File | null>(null);

  // Video Chapters (Feature #10)
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterTime, setChapterTime] = useState('');

  // Telegram Notifier Settings (Feature #11)
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChannelId, setTelegramChannelId] = useState('');
  const [isPublishingTelegram, setIsPublishingTelegram] = useState(false);

  // Load bundles
  const loadBundles = async () => {
    try {
      const { data } = await supabase
        .from('lecture_bundles')
        .select('*, subjects(name)')
        .order('created_at', { ascending: false });

      if (data) setBundles(data as LectureBundle[]);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadBundles();
    // Load Telegram keys from localStorage
    const savedToken = localStorage.getItem('eldostour_tg_token') || '';
    const savedChannel = localStorage.getItem('eldostour_tg_channel') || '';
    setTelegramBotToken(savedToken);
    setTelegramChannelId(savedChannel);
  }, []);

  const availableSubjects = subjects.filter((s) => s.year === year);
  const availableQuizzes = quizzes.filter((q) => q.year === year);

  // Add chapter to list
  const handleAddChapter = () => {
    if (!chapterTitle.trim() || !chapterTime.trim()) return;
    // Parse MM:SS or HH:MM:SS to seconds
    const parts = chapterTime.trim().split(':').map(Number);
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      seconds = parts[0] || 0;
    }

    setChapters((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        title: chapterTitle.trim(),
        timeFormatted: chapterTime.trim(),
        timeSeconds: seconds,
      },
    ]);
    setChapterTitle('');
    setChapterTime('');
  };

  // Create Bundle
  const handleCreateBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;

    setIsAdding(true);
    setSuccess('');
    setError('');

    try {
      // 1. Upload Thumbnail if selected
      let finalThumbUrl = '';
      let finalThumbPath = '';
      if (thumbnailFile) {
        const thumbRes = await uploadThumbnail(thumbnailFile);
        if (thumbRes) {
          finalThumbUrl = thumbRes.publicUrl;
          finalThumbPath = thumbRes.storagePath;
        }
      }

      // 2. Upload Video or use URL
      let finalVideoUrl = videoUrlInput.trim();
      let finalVideoPath = '';
      if (videoFile) {
        const vRes = await uploadMaterialFile(videoFile, 'video', year);
        if (vRes) {
          finalVideoUrl = vRes.publicUrl;
          finalVideoPath = vRes.storagePath;
        }
      }

      // 3. Upload Lecture PDF
      let finalLecPdfUrl = '';
      let finalLecPdfPath = '';
      if (lecturePdfFile) {
        const lRes = await uploadMaterialFile(lecturePdfFile, 'pdf', year);
        if (lRes) {
          finalLecPdfUrl = lRes.publicUrl;
          finalLecPdfPath = lRes.storagePath;
        }
      }

      // 4. Upload Summary PDF
      let finalSumPdfUrl = '';
      let finalSumPdfPath = '';
      if (summaryPdfFile) {
        const sRes = await uploadMaterialFile(summaryPdfFile, 'pdf', year);
        if (sRes) {
          finalSumPdfUrl = sRes.publicUrl;
          finalSumPdfPath = sRes.storagePath;
        }
      }

      // 5. Upload Questions PDF
      let finalQuesPdfUrl = '';
      let finalQuesPdfPath = '';
      if (questionsPdfFile) {
        const qRes = await uploadMaterialFile(questionsPdfFile, 'pdf', year);
        if (qRes) {
          finalQuesPdfUrl = qRes.publicUrl;
          finalQuesPdfPath = qRes.storagePath;
        }
      }

      // 6. Insert Bundle into Database
      const { error: insErr } = await supabase.from('lecture_bundles').insert({
        title: title.trim(),
        professor_name: professorName.trim(),
        lecture_date: lectureDate.trim(),
        year,
        subject_id: subjectId,
        difficulty,
        related_quiz_id: relatedQuizId || null,
        thumbnail_url: finalThumbUrl,
        thumbnail_storage_path: finalThumbPath,
        video_url: finalVideoUrl,
        video_storage_path: finalVideoPath,
        video_chapters: chapters,
        lecture_pdf_url: finalLecPdfUrl,
        lecture_pdf_storage_path: finalLecPdfPath,
        summary_pdf_url: finalSumPdfUrl,
        summary_pdf_storage_path: finalSumPdfPath,
        questions_pdf_url: finalQuesPdfUrl,
        questions_pdf_storage_path: finalQuesPdfPath,
      });

      if (insErr) throw insErr;

      setSuccess('تم إنشاء باقة المحاضرة الشاملة بنجاح!');
      setTitle('');
      setProfessorName('');
      setLectureDate('');
      setThumbnailFile(null);
      setVideoFile(null);
      setVideoUrlInput('');
      setLecturePdfFile(null);
      setSummaryPdfFile(null);
      setQuestionsPdfFile(null);
      setChapters([]);
      loadBundles();
      onRefresh?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ باقة المحاضرة');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete Bundle
  const handleDeleteBundle = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الباقة بالكامل؟')) return;
    try {
      await supabase.from('lecture_bundles').delete().eq('id', id);
      loadBundles();
      onRefresh?.();
    } catch (err: any) {
      alert(`خطأ: ${err?.message || ''}`);
    }
  };

  // Feature #11: Auto-Telegram Channel Notifier
  const handlePublishTelegram = async (bundle: LectureBundle) => {
    if (!telegramBotToken.trim() || !telegramChannelId.trim()) {
      alert('يرجى كتابة رمز البوت (Bot Token) ومعرّف القناة (Channel ID) في الأسفل أولاً.');
      return;
    }

    // Save tokens locally
    localStorage.setItem('eldostour_tg_token', telegramBotToken.trim());
    localStorage.setItem('eldostour_tg_channel', telegramChannelId.trim());

    setIsPublishingTelegram(true);
    const subName = bundle.subjects?.name || 'مادة تخصصية';
    const textMessage = `📚 *${PLATFORM_NAME}* - ${COLLEGE_NAME}\n\n🏛️ *تم رفع باقة محاضرة جديدة:*\n📖 *العنوان:* ${bundle.title}\n👨‍🏫 *الأستاذ:* ${bundle.professor_name || 'هيئة التدريس'}\n🏷️ *الفرقة:* الفرقة ${bundle.year} (${subName})\n\n📂 *المحتويات المتوفرة بالباقة:*\n${bundle.video_url ? '🎥 فيديو الشرح المباشر\n' : ''}${bundle.lecture_pdf_url ? '📄 PDF المحاضرة الأساسية\n' : ''}${bundle.summary_pdf_url ? '✨ PDF الملخص المركز\n' : ''}${bundle.questions_pdf_url ? '❓ PDF الأسئلة والتدريبات\n' : ''}\n🔗 تصفح المحاضرة الآن على المنصة:\n${window.location.origin}/grade/${bundle.year}`;

    try {
      const res = await fetch(`https://api.telegram.org/bot${telegramBotToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChannelId.trim(),
          text: textMessage,
          parse_mode: 'Markdown',
        }),
      });

      const resJson = await res.json();
      if (resJson.ok) {
        alert('✅ تم نشر المحاضرة بنجاح على قناة تيليجرام!');
      } else {
        alert(`❌ فشل النشر على تيليجرام: ${resJson.description || 'تأكد من صلاحيات البوت في القناة'}`);
      }
    } catch (err: any) {
      alert(`خطأ في الاتصال بتيليجرام: ${err?.message || ''}`);
    } finally {
      setIsPublishingTelegram(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              إدارة حزم وباقات المحاضرات (غلاف مخصص + 4 تبويبات)
            </h3>
            <p className="text-xs text-slate-400">
              رفع باقة محاضرة متكاملة تضم الغلاف، فيديو الشرح، PDF المحاضرة، PDF الملخص، وPDF الأسئلة
            </p>
          </div>
        </div>
      </div>

      {/* CREATE BUNDLE FORM */}
      <form onSubmit={handleCreateBundle} className="p-4 sm:p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-5">
        <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>إنشاء باقة محاضرة جديدة:</span>
        </h4>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان المحاضرة:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: المحاضرة الأولى - مصادر الالتزام"
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">اسم أستاذ المادة:</label>
            <input
              type="text"
              value={professorName}
              onChange={(e) => setProfessorName(e.target.value)}
              placeholder="مثال: أ.د. محمد الشافعي"
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ المحاضرة:</label>
            <input
              type="text"
              value={lectureDate}
              onChange={(e) => setLectureDate(e.target.value)}
              placeholder="مثال: 15 نوفمبر 2026"
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">الفرقة الدراسية:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value) as AcademicYearId)}
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">المادة الدراسية:</label>
            <select
              value={subjectId}
              required
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
            >
              <option value="">اختر المادة...</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">مستوى الصعوبة:</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
            >
              <option value="easy">سهلة ومباشرة 🟢</option>
              <option value="medium">متوسطة 🟡</option>
              <option value="hard">دسمة وتحتاج تركيز 🔴</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-300 mb-1">ربط باختبار تفاعلي (اختياري):</label>
            <select
              value={relatedQuizId}
              onChange={(e) => setRelatedQuizId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
            >
              <option value="">بدون اختبار مرتبط</option>
              {availableQuizzes.map((q) => (
                <option key={q.id} value={q.id}>{q.title} ({q.duration_minutes} دقيقة)</option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Attached Files Upload Grid */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <span className="block text-xs font-bold text-slate-300">
            ملفات ومحتويات الباقة (قم برفع المتوفر منها):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Custom Cover Thumbnail */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="font-bold text-amber-400 block">غلاف المحاضرة المخصص:</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-400"
              />
              {thumbnailFile && <span className="text-[10px] text-emerald-400">تم اختيار: {thumbnailFile.name}</span>}
            </div>

            {/* 2. Explanation Video */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="font-bold text-blue-400 block">فيديو الشرح (ملف أو رابط):</span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-400"
              />
              <input
                type="url"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="أو أدخل رابط فيديو مباشر..."
                className="w-full h-7 px-2 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-white outline-none mt-1"
              />
            </div>

            {/* 3. Lecture PDF */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="font-bold text-red-400 block">PDF المحاضرة الأساسية:</span>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setLecturePdfFile(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-400"
              />
              {lecturePdfFile && <span className="text-[10px] text-emerald-400">تم اختيار: {lecturePdfFile.name}</span>}
            </div>

            {/* 4. Summary & Questions PDFs */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="font-bold text-emerald-400 block">PDF الملخص + PDF الأسئلة:</span>
              <div className="space-y-1">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSummaryPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-[10px] text-slate-400"
                  title="ملف الملخص"
                />
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setQuestionsPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-[10px] text-slate-400"
                  title="ملف الأسئلة"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature #10: Video Chapters Builder */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <span className="block text-xs font-bold text-slate-300">
            فصول المحاضرة / Timestamps (اختياري لمقاطع الفيديو):
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="عنوان الفصل (مثال: الركن المادي للجريمة)"
              className="flex-1 min-w-[180px] h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
            />
            <input
              type="text"
              value={chapterTime}
              onChange={(e) => setChapterTime(e.target.value)}
              placeholder="التوقيت (مثال: 12:30 أو 01:15:00)"
              className="w-32 h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none font-mono"
            />
            <button
              type="button"
              onClick={handleAddChapter}
              className="px-3 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-colors"
            >
              + إضافة فصل
            </button>
          </div>

          {chapters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {chapters.map((ch, idx) => (
                <span
                  key={ch.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                >
                  <span className="font-bold text-amber-400">{ch.timeFormatted}</span>
                  <span>{ch.title}</span>
                  <button
                    type="button"
                    onClick={() => setChapters((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-300 font-black ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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

        <button
          type="submit"
          disabled={isAdding || !title.trim() || !subjectId}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all shadow-md"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>حفظ ورفع باقة المحاضرة</span>
        </button>
      </form>

      {/* Feature #11: Telegram Channel Auto-Notifier Settings */}
      <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/60 space-y-3">
        <div className="flex items-center gap-2 text-sky-400">
          <Send className="w-4 h-4" />
          <h4 className="text-xs font-bold">إعدادات النشر التلقائي على قناة تيليجرام:</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Telegram Bot Token:</label>
            <input
              type="password"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
              className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Channel Username / ID:</label>
            <input
              type="text"
              value={telegramChannelId}
              onChange={(e) => setTelegramChannelId(e.target.value)}
              placeholder="@eldostour_law"
              className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono outline-none"
            />
          </div>
        </div>
      </div>

      {/* Existing Bundles List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-300">باقات المحاضرات المضافة ({bundles.length}):</h4>
        {bundles.map((b) => (
          <div
            key={b.id}
            className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              {b.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.thumbnail_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-amber-500 shrink-0">
                  <FolderArchive className="w-6 h-6" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                    {b.subjects?.name || 'مادة'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    الفرقة {b.year} {b.professor_name ? `• ${b.professor_name}` : ''}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{b.title}</h4>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {/* 1-Click Telegram publish */}
              <button
                onClick={() => handlePublishTelegram(b)}
                disabled={isPublishingTelegram}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-colors"
                title="نشر إشعار المحاضرة على قناة تيليجرام"
              >
                <Send className="w-3.5 h-3.5" />
                <span>نشر تيليجرام</span>
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDeleteBundle(b.id)}
                className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                title="حذف الباقة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
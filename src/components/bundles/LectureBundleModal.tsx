'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Video,
  FileText,
  Download,
  Star,
  Moon,
  Sun,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { LectureBundle, VideoChapter } from '@/types';
import { studentIncrementDownload, studentRateLecture } from '@/lib/apiClient';
import { COLLEGE_NAME } from '@/lib/constants';

interface LectureBundleModalProps {
  bundle: LectureBundle | null;
  onClose: () => void;
  onOpenQuiz?: (quizId: string) => void;
}

export function LectureBundleModal({
  bundle,
  onClose,
  onOpenQuiz,
}: LectureBundleModalProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'lecture_pdf' | 'summary_pdf' | 'questions_pdf'>('video');
  const [isNightReader, setIsNightReader] = useState(false);
  const [studentWatermark, setStudentWatermark] = useState('');
  const [isDownloadingPack, setIsDownloadingPack] = useState(false);

  // Video player state & Resume timestamp (Feature #9)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [savedResumeTime, setSavedResumeTime] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // 5-Star Rating State (Feature #14)
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);

  // Determine initial active tab based on what's available
  useEffect(() => {
    if (!bundle) return;

    if (bundle.video_url) {
      setActiveTab('video');
    } else if (bundle.lecture_pdf_url) {
      setActiveTab('lecture_pdf');
    } else if (bundle.summary_pdf_url) {
      setActiveTab('summary_pdf');
    } else if (bundle.questions_pdf_url) {
      setActiveTab('questions_pdf');
    }

    // Load student name for watermark (Feature #8)
    const name = localStorage.getItem('eldostour_student_name') || 'طالب كلية الحقوق';
    const studentId = localStorage.getItem('eldostour_student_id_num') || 'DST-LAW';
    setStudentWatermark(`${name} • ${studentId} • منصة الدستور`);

    // Check saved video resume time (Feature #9)
    const savedTime = localStorage.getItem(`eldostour_video_pos_${bundle.id}`);
    if (savedTime && Number(savedTime) > 15) {
      setSavedResumeTime(Number(savedTime));
      setShowResumePrompt(true);
    } else {
      setShowResumePrompt(false);
      setSavedResumeTime(null);
    }

    // Check if user already rated this bundle
    const ratedBundles = JSON.parse(localStorage.getItem('eldostour_rated_bundles') || '{}');
    if (ratedBundles[bundle.id]) {
      setUserRating(ratedBundles[bundle.id]);
      setHasRated(true);
    } else {
      setUserRating(0);
      setHasRated(false);
    }
  }, [bundle]);

  if (!bundle) return null;

  // Handle Video time updates to save position
  const handleTimeUpdate = () => {
    if (videoRef.current && bundle) {
      const cur = Math.floor(videoRef.current.currentTime);
      if (cur > 5) {
        localStorage.setItem(`eldostour_video_pos_${bundle.id}`, String(cur));
      }
    }
  };

  // Resume video playback
  const handleResumePlayback = () => {
    if (videoRef.current && savedResumeTime) {
      videoRef.current.currentTime = savedResumeTime;
      videoRef.current.play();
    }
    setShowResumePrompt(false);
  };

  // Seek to specific chapter
  const handleSeekToChapter = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  // Feature #2: Download Full Lecture Pack Button
  const handleDownloadFullPack = async () => {
    const pdfUrls: { name: string; url: string }[] = [];
    if (bundle.lecture_pdf_url) {
      pdfUrls.push({ name: `${bundle.title} - المحاضرة الأساسية.pdf`, url: bundle.lecture_pdf_url });
    }
    if (bundle.summary_pdf_url) {
      pdfUrls.push({ name: `${bundle.title} - الملخص المركز.pdf`, url: bundle.summary_pdf_url });
    }
    if (bundle.questions_pdf_url) {
      pdfUrls.push({ name: `${bundle.title} - بنك الأسئلة والتدريبات.pdf`, url: bundle.questions_pdf_url });
    }

    if (pdfUrls.length === 0) {
      alert('لا توجد ملفات PDF مرفقة للتحميل في هذه الباقة.');
      return;
    }

    setIsDownloadingPack(true);
    try {
      for (let i = 0; i < pdfUrls.length; i++) {
        const item = pdfUrls[i];
        const a = document.createElement('a');
        a.href = item.url;
        a.download = item.name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 600));
      }

      // Increment downloads in Supabase
      await studentIncrementDownload(bundle.id);
    } catch (err) {
      console.warn('Pack download error:', err);
    } finally {
      setIsDownloadingPack(false);
    }
  };

  // Feature #14: Submit 5-star rating
  const handleRate = async (star: number) => {
    if (hasRated) return;
    setUserRating(star);
    setHasRated(true);

    try {
      const ratedBundles = JSON.parse(localStorage.getItem('eldostour_rated_bundles') || '{}');
      ratedBundles[bundle.id] = star;
      localStorage.setItem('eldostour_rated_bundles', JSON.stringify(ratedBundles));

      const sName = localStorage.getItem('eldostour_student_name') || 'طالب منصة الدستور';
      await studentRateLecture(bundle.id, star, sName);
    } catch {
      // ignore
    }
  };

  // Parse chapters
  const chapters: VideoChapter[] = Array.isArray(bundle.video_chapters) ? bundle.video_chapters : [];

  // Active PDF URL based on activeTab
  const currentPdfUrl =
    activeTab === 'lecture_pdf'
      ? bundle.lecture_pdf_url
      : activeTab === 'summary_pdf'
      ? bundle.summary_pdf_url
      : activeTab === 'questions_pdf'
      ? bundle.questions_pdf_url
      : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md text-right text-slate-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">
                    {bundle.subjects?.name || 'مادة تخصصية'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {COLLEGE_NAME}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 truncate max-w-md sm:max-w-xl">
                  {bundle.title}
                </h3>
              </div>
            </div>

            {/* Feature #2: Download Full Pack Action */}
            <button
              onClick={handleDownloadFullPack}
              disabled={isDownloadingPack}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              title="تحميل جميع ملفات المحاضرة والملخص والأسئلة دفعة واحدة"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{isDownloadingPack ? 'جارٍ التحميل...' : 'تحميل باقة المحاضرة كاملة'}</span>
            </button>
          </div>

          {/* 4 DISTINCT TABS HEADER (Part 1.2) */}
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs font-bold">
            {/* Tab 1: Video */}
            <button
              onClick={() => setActiveTab('video')}
              disabled={!bundle.video_url}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all border ${
                activeTab === 'video'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : bundle.video_url
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500'
                  : 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-950 text-slate-400 border-transparent'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>1. فيديو الشرح المباشر</span>
              {!bundle.video_url && <span className="text-[10px] text-slate-400">(غير متوفر)</span>}
            </button>

            {/* Tab 2: Lecture PDF */}
            <button
              onClick={() => setActiveTab('lecture_pdf')}
              disabled={!bundle.lecture_pdf_url}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all border ${
                activeTab === 'lecture_pdf'
                  ? 'bg-red-600 text-white border-red-500 shadow-md'
                  : bundle.lecture_pdf_url
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-500'
                  : 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-950 text-slate-400 border-transparent'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>2. PDF المحاضرة الأساسية</span>
              {!bundle.lecture_pdf_url && <span className="text-[10px] text-slate-400">(غير متوفر)</span>}
            </button>

            {/* Tab 3: Summary PDF */}
            <button
              onClick={() => setActiveTab('summary_pdf')}
              disabled={!bundle.summary_pdf_url}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all border ${
                activeTab === 'summary_pdf'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : bundle.summary_pdf_url
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                  : 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-950 text-slate-400 border-transparent'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>3. PDF الملخص المركز</span>
              {!bundle.summary_pdf_url && <span className="text-[10px] text-slate-400">(غير متوفر)</span>}
            </button>

            {/* Tab 4: Questions PDF */}
            <button
              onClick={() => setActiveTab('questions_pdf')}
              disabled={!bundle.questions_pdf_url}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all border ${
                activeTab === 'questions_pdf'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : bundle.questions_pdf_url
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-500'
                  : 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-950 text-slate-400 border-transparent'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>4. PDF الأسئلة والتدريبات</span>
              {!bundle.questions_pdf_url && <span className="text-[10px] text-slate-400">(غير متوفر)</span>}
            </button>
          </div>

          {/* MAIN TAB CONTENT DISPLAY */}
          <div className="flex-1 relative overflow-hidden my-2 rounded-2xl bg-slate-950 flex flex-col">
            {activeTab === 'video' && bundle.video_url ? (
              <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden">
                {/* Video Area */}
                <div className="flex-1 relative flex flex-col items-center justify-center bg-black">
                  {/* Feature #9: Resume Video Timestamp Prompt */}
                  {showResumePrompt && savedResumeTime && (
                    <div className="absolute top-4 right-4 z-20 p-3 rounded-2xl bg-slate-900/95 border border-amber-500 text-white text-xs shadow-2xl flex items-center gap-3 backdrop-blur-md">
                      <div>
                        <span className="font-bold block text-amber-400">استئناف المشاهدة:</span>
                        <span>توقفت سابقاً عند الدقيقة {Math.floor(savedResumeTime / 60)}:{('0' + (savedResumeTime % 60)).slice(-2)}</span>
                      </div>
                      <button
                        onClick={handleResumePlayback}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استئناف</span>
                      </button>
                      <button
                        onClick={() => setShowResumePrompt(false)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    src={bundle.video_url}
                    controls
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Feature #10: Video Chapters Sidebar */}
                {chapters.length > 0 && (
                  <div className="w-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-r border-slate-800 p-3 overflow-y-auto shrink-0 text-right">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2 pb-1 border-b border-slate-800">
                      <Clock className="w-3.5 h-3.5" />
                      <span>فصول المحاضرة ومحاور الشرح:</span>
                    </span>
                    <div className="space-y-1.5">
                      {chapters.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => handleSeekToChapter(ch.timeSeconds)}
                          className="w-full p-2 rounded-xl bg-slate-950/70 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-right transition-colors flex items-center justify-between text-xs"
                        >
                          <span className="text-white truncate font-medium flex-1">{ch.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold ml-1.5 shrink-0">
                            {ch.timeFormatted}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : currentPdfUrl ? (
              /* PDF VIEWER WITH ANTI-LEAK WATERMARK & NIGHT INVERTER */
              <div className="relative w-full h-full flex flex-col bg-slate-900">
                {/* PDF Toolbar */}
                <div className="h-10 px-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    {/* Feature #15: PDF Night Reader Inverter Toggle */}
                    <button
                      onClick={() => setIsNightReader(!isNightReader)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border ${
                        isNightReader
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                      title="عكس ألوان ملف الـ PDF لقراءة مريحة ليلاً"
                    >
                      {isNightReader ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      <span>{isNightReader ? 'إلغاء الوضع الليلي' : 'وضع القراءة الليلي (Invert)'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={currentPdfUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>تنزيل الملف</span>
                    </a>
                  </div>
                </div>

                {/* PDF Frame Container */}
                <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-900">
                  {/* Feature #8: Anti-Leak Student Watermark Overlay */}
                  <div className="absolute inset-0 z-10 pointer-events-none select-none flex flex-wrap items-center justify-around overflow-hidden opacity-[0.08] dark:opacity-[0.06] rotate-[-25deg] scale-125">
                    {Array.from({ length: 16 }).map((_, idx) => (
                      <div key={idx} className="p-8 text-center">
                        <span className="text-lg font-black text-white block">{studentWatermark}</span>
                        <span className="text-xs text-amber-300">{COLLEGE_NAME}</span>
                      </div>
                    ))}
                  </div>

                  {/* PDF Embed / Iframe */}
                  <iframe
                    src={`${currentPdfUrl}#toolbar=1`}
                    className={`w-full h-full border-0 transition-all ${
                      isNightReader ? 'filter invert-[0.92] hue-rotate-180 brightness-95 contrast-125' : ''
                    }`}
                    title={bundle.title}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-600 mb-2" />
                <p className="text-sm font-bold">هذا القسم غير متوفر حالياً في باقة المحاضرة</p>
                <p className="text-xs text-slate-500 mt-1">اختر قسماً آخر من التبويبات بالأعلى للمشاهدة.</p>
              </div>
            )}
          </div>

          {/* BOTTOM SECTION: Linked Quiz Banner + 5-Star Rating */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Feature #3: Linked Lecture Quiz Prompt */}
            {bundle.related_quiz_id ? (
              <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-purple-300">
                  اختبر مدى فهمك لهذه المحاضرة الآن:
                </span>
                <button
                  onClick={() => {
                    onClose();
                    if (bundle.related_quiz_id && onOpenQuiz) {
                      onOpenQuiz(bundle.related_quiz_id);
                    }
                  }}
                  className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  بدء الاختبار التفاعلي 📝
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                المحاضرة منسقة ومعتمدة من فريق إشراف منصة الدستور
              </div>
            )}

            {/* Feature #14: 5-Star Rating Widget */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">تقييمك للمحاضرة:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={hasRated}
                    onMouseEnter={() => !hasRated && setHoverRating(star)}
                    onMouseLeave={() => !hasRated && setHoverRating(0)}
                    onClick={() => handleRate(star)}
                    className="p-1 hover:scale-125 transition-transform"
                    title={`تقييم ${star} من 5`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (hoverRating || userRating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {hasRated && <span className="text-emerald-400 text-[11px] font-bold">شكراً لتقييمك!</span>}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
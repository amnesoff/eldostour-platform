'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  Video,
  Download,
  CheckSquare,
  Search,
  Sparkles,
  Award,
  RefreshCw,
  ChevronLeft,
  Lock,
  Flag,
  UserPlus,
} from 'lucide-react';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { BugReportModal } from '@/components/tools/BugReportModal';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BackgroundWatermark } from '@/components/ui/BackgroundWatermark';
import { OccasionThemeOverlay } from '@/components/ui/OccasionThemeOverlay';
import { MaterialCard } from '@/components/home/MaterialCard';
import { VideoModal } from '@/components/home/VideoModal';
import { PdfModal } from '@/components/home/PdfModal';
import { QuizPlayerModal } from '@/components/quiz/QuizPlayerModal';
import { SubjectCoverCard } from '@/components/covers/SubjectCoverCard';
import { ThemeCharacterWidget } from '@/components/ui/ThemeCharacterWidget';
import { EmptyState } from '@/components/ui/EmptyState';
import { FloatingWidgets } from '@/components/ui/FloatingWidgets';
import { ACADEMIC_YEARS, COLLEGE_NAME } from '@/lib/constants';
import {
  AcademicYearId,
  Subject,
  Material,
  Quiz,
  SubjectCover,
  QuizQuestion,
  SiteSettings,
} from '@/types';
import { DEFAULT_SITE_SETTINGS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';

interface GradeWorkspaceClientProps {
  gradeId: AcademicYearId;
}

export default function GradeWorkspaceClient({ gradeId }: GradeWorkspaceClientProps) {
  const { occasionTheme } = useTheme();
  const gradeInfo = ACADEMIC_YEARS.find((y) => y.id === gradeId) || ACADEMIC_YEARS[0];

  // Database States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [covers, setCovers] = useState<SubjectCover[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // LEVEL 1 vs LEVEL 2 Navigation State
  // selectedCover === null -> LEVEL 1 (Subject Covers Grid)
  // selectedCover !== null -> LEVEL 2 (Inside Selected Subject)
  const [selectedCover, setSelectedCover] = useState<SubjectCover | null>(null);

  // LEVEL 2: 3 Fixed Square Tabs: 'pdf' (Right) | 'video' (Middle) | 'questions' (Left)
  const [selectedSubjectTab, setSelectedSubjectTabState] = useState<'pdf' | 'video' | 'questions'>('pdf');

  // Multi-Select Download Mode (in PDF Tab)
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedForDownload, setSelectedForDownload] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPracticeQuiz, setIsGeneratingPracticeQuiz] = useState(false);

  // Modals
  const [activeVideo, setActiveVideo] = useState<Material | null>(null);
  const [activePdf, setActivePdf] = useState<Material | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [reportingMaterial, setReportingMaterial] = useState<Material | null>(null);

  // Student Auth & Guest Mode
  const { student, isGuest, openAuthModal } = useStudentAuth();

  const handleOpenPdf = (mat: Material) => {
    if (isGuest) {
      openAuthModal('register');
      return;
    }
    setActivePdf(mat);
  };

  const handleOpenVideo = (mat: Material) => {
    if (isGuest) {
      openAuthModal('register');
      return;
    }
    setActiveVideo(mat);
  };

  const handleOpenQuiz = (q: Quiz) => {
    if (isGuest) {
      openAuthModal('register');
      return;
    }
    setActiveQuiz(q);
  };

  // Fallback synthesized covers if no subject_covers exist in DB yet
  const displayCovers: SubjectCover[] = useMemo(() => {
    if (covers.length > 0) return covers;

    // Synthesize from existing subjects to avoid empty screen before admin uploads covers
    return subjects.map((sub) => {
      const subMats = materials.filter((m) => m.subject_id === sub.id);
      const subQs = quizzes.filter((q) => q.subject_id === sub.id);
      return {
        id: `subject-${sub.id}`,
        subject_name: sub.name,
        year: gradeId,
        subject_id: sub.id,
        cover_image_url: '/logo.png',
        preview_video_url: '',
        professor_name: '',
        description: 'انقر لاستعراض المحاضرات والـ PDF، شروحات الفيديو، وبنك الأسئلة.',
        materials_count: subMats.filter((m) => m.file_type === 'pdf').length,
        videos_count: subMats.filter((m) => m.file_type === 'video').length,
        quizzes_count: subQs.length,
        created_at: sub.created_at,
      };
    });
  }, [covers, subjects, materials, quizzes, gradeId]);

  // URL Query Sync and Browser Back-Button (popstate) Handler (TASK 1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const subParam = params.get('subject');

    if (subParam && displayCovers.length > 0) {
      const found = displayCovers.find((c) => c.id === subParam);
      if (found) {
        setSelectedCover(found);
      }
    } else if (!subParam) {
      // Entering /grade/[id] without ?subject MUST ALWAYS start at Level 1
      setSelectedCover(null);
    }
  }, [displayCovers]);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const subParam = params.get('subject');
      if (subParam && displayCovers.length > 0) {
        const found = displayCovers.find((c) => c.id === subParam);
        setSelectedCover(found || null);
      } else {
        setSelectedCover(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [displayCovers]);

  const setSelectedSubjectTab = (tab: 'pdf' | 'video' | 'questions') => {
    setSelectedSubjectTabState(tab);
    try {
      sessionStorage.setItem(`eldostour_grade_${gradeId}_subject_tab`, tab);
    } catch {
      // ignore
    }
  };

  const handleSelectCover = (cov: SubjectCover | null) => {
    if (cov && isGuest) {
      openAuthModal('register');
      return;
    }
    setSelectedCover(cov);
    setSearchQuery('');
    setMultiSelectMode(false);
    setSelectedForDownload([]);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (cov) {
        url.searchParams.set('subject', cov.id);
        window.history.pushState({ subjectId: cov.id }, '', url.toString());
      } else {
        url.searchParams.delete('subject');
        window.history.pushState({}, '', url.toString());
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load Data for this Grade
  const loadGradeData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      // 1. Fetch Subject Covers
      const { data: covData } = await supabase
        .from('subject_covers')
        .select('*')
        .eq('year', gradeId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      // 2. Fetch Subjects
      const { data: subData } = await supabase
        .from('subjects')
        .select('*')
        .eq('year', gradeId)
        .order('name', { ascending: true });

      if (subData) setSubjects(subData as Subject[]);

      // 3. Fetch Materials for this grade
      const { data: matData } = await supabase
        .from('materials')
        .select('*, subjects(name)')
        .eq('year', gradeId)
        .order('created_at', { ascending: false });

      const fetchedMaterials = (matData as Material[]) || [];
      setMaterials(fetchedMaterials);

      // 4. Fetch Quizzes for this grade (Strictly excluding correct_answer to prevent student cheating)
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*, subjects(name), quiz_questions(id, quiz_id, question_text, question_type, options, order_index)')
        .eq('year', gradeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const mappedQuizzes = ((quizData as any[]) || []).map((q: any) => ({
        ...q,
        questions: q.quiz_questions || [],
        question_count: q.quiz_questions?.length || 0,
      })) as Quiz[];
      setQuizzes(mappedQuizzes);

      // 5. Fetch General Settings
      const { data: sData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'general')
        .single();
      if (sData?.value) {
        setSettings((prev) => ({ ...prev, ...(sData.value as Partial<SiteSettings>) }));
      }

      // Map covers with counts
      const rawCovers = (covData as SubjectCover[]) || [];
      const computedCovers = rawCovers.map((cov) => {
        const isCoverItem = (m: Material) =>
          m.cover_id === cov.id ||
          (cov.subject_id && m.subject_id === cov.subject_id) ||
          m.subjects?.name?.trim().toLowerCase() === cov.subject_name.trim().toLowerCase();

        const linkedPdfs = fetchedMaterials.filter((m) => isCoverItem(m) && m.file_type === 'pdf').length;
        const linkedVids = fetchedMaterials.filter((m) => isCoverItem(m) && m.file_type === 'video').length;
        const linkedQs = mappedQuizzes.filter(
          (q) =>
            q.cover_id === cov.id ||
            (cov.subject_id && q.subject_id === cov.subject_id) ||
            q.subjects?.name?.trim().toLowerCase() === cov.subject_name.trim().toLowerCase()
        ).length;

        return {
          ...cov,
          materials_count: linkedPdfs,
          videos_count: linkedVids,
          quizzes_count: linkedQs,
        };
      });

      setCovers(computedCovers);
    } catch (err) {
      console.warn('Load grade data exception:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [gradeId]);

  useEffect(() => {
    loadGradeData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`grade_realtime_${gradeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subject_covers', filter: `year=eq.${gradeId}` }, () => {
        loadGradeData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials', filter: `year=eq.${gradeId}` }, () => {
        loadGradeData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes', filter: `year=eq.${gradeId}` }, () => {
        loadGradeData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gradeId, loadGradeData]);

  // Filtered covers for Level 1 Search
  const filteredCovers = useMemo(() => {
    if (!searchQuery.trim()) return displayCovers;
    const q = searchQuery.toLowerCase().trim();
    return displayCovers.filter(
      (c) =>
        c.subject_name.toLowerCase().includes(q) ||
        c.professor_name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [displayCovers, searchQuery]);

  // Helper to test if item belongs to selected cover
  const isItemInSelectedCover = useCallback(
    (itemCoverId?: string | null, itemSubjectId?: string, itemSubjectName?: string) => {
      if (!selectedCover) return false;
      if (itemCoverId && itemCoverId === selectedCover.id) return true;
      if (selectedCover.subject_id && itemSubjectId === selectedCover.subject_id) return true;
      if (
        itemSubjectName &&
        itemSubjectName.trim().toLowerCase() === selectedCover.subject_name.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    },
    [selectedCover]
  );

  // Content for Level 2 (Selected Subject)
  const subjectPdfs = useMemo(() => {
    if (!selectedCover) return [];
    return materials.filter(
      (m) =>
        m.file_type === 'pdf' &&
        isItemInSelectedCover(m.cover_id, m.subject_id, m.subjects?.name) &&
        (!searchQuery.trim() ||
          m.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          m.description?.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    );
  }, [materials, selectedCover, isItemInSelectedCover, searchQuery]);

  const subjectVideos = useMemo(() => {
    if (!selectedCover) return [];
    return materials.filter(
      (m) =>
        m.file_type === 'video' &&
        isItemInSelectedCover(m.cover_id, m.subject_id, m.subjects?.name) &&
        (!searchQuery.trim() ||
          m.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          m.description?.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    );
  }, [materials, selectedCover, isItemInSelectedCover, searchQuery]);

  const subjectQuizzes = useMemo(() => {
    if (!selectedCover) return [];
    return quizzes.filter(
      (q) =>
        isItemInSelectedCover(q.cover_id, q.subject_id, q.subjects?.name) &&
        (!searchQuery.trim() ||
          q.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          q.description?.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    );
  }, [quizzes, selectedCover, isItemInSelectedCover, searchQuery]);

  // Bulk Download Handlers
  const toggleSelectForDownload = (id: string) => {
    setSelectedForDownload((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllDownloads = () => {
    const allPdfIds = subjectPdfs.map((m) => m.id);
    if (selectedForDownload.length === allPdfIds.length) {
      setSelectedForDownload([]);
    } else {
      setSelectedForDownload(allPdfIds);
    }
  };

  const handleBulkDownload = async () => {
    const selectedItems = materials.filter((m) => selectedForDownload.includes(m.id));
    if (selectedItems.length === 0) return;

    setIsDownloading(true);
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      try {
        const a = document.createElement('a');
        a.href = item.file_url;
        a.download = `${item.title}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.warn('Download error:', err);
      }
    }
    setIsDownloading(false);
  };

  // Random Practice Quiz within this subject
  const handleStartRandomPracticeQuiz = async () => {
    setIsGeneratingPracticeQuiz(true);
    try {
      const subjectQuestions: QuizQuestion[] = [];
      subjectQuizzes.forEach((q) => {
        if (q.questions && q.questions.length > 0) {
          subjectQuestions.push(...q.questions);
        }
      });

      if (subjectQuestions.length === 0) {
        alert('لا توجد أسئلة مضافة في بنك أسئلة هذه المادة حالياً.');
        return;
      }

      const shuffled = [...subjectQuestions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);

      const practiceQuiz: Quiz = {
        id: 'practice-random',
        title: `اختبار تدريبي سريع - ${selectedCover?.subject_name || ''} 🎲`,
        description: 'اختبار تم توليده عشوائياً من بنك أسئلة المادة لاختبار معلوماتك وتثبيت القواعد القانونية.',
        year: gradeId,
        subject_id: selectedCover?.subject_id || (subjects[0]?.id || ''),
        duration_minutes: 15,
        is_active: true,
        created_at: new Date().toISOString(),
        questions: selected,
      };

      setActiveQuiz(practiceQuiz);
    } catch {
      alert('حدث خطأ أثناء توليد الاختبار العشوائي');
    } finally {
      setIsGeneratingPracticeQuiz(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070c18] text-slate-900 dark:text-slate-100 relative overflow-x-hidden" dir="rtl">
      <BackgroundWatermark />
      <OccasionThemeOverlay theme={occasionTheme || 'default'} />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <nav className="flex items-center gap-2">
            <Link href="/" className="hover:text-amber-500 transition-colors font-medium">
              الرئيسية
            </Link>
            <span>/</span>
            {selectedCover ? (
              <button
                onClick={() => handleSelectCover(null)}
                className="hover:text-amber-500 transition-colors font-medium"
              >
                {gradeInfo.name}
              </button>
            ) : (
              <span className="text-amber-500 font-bold">{gradeInfo.name}</span>
            )}

            {selectedCover && (
              <>
                <span>/</span>
                <span className="text-amber-500 font-bold truncate max-w-[180px] sm:max-w-none">
                  {selectedCover.subject_name}
                </span>
              </>
            )}
          </nav>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all active:scale-95 shrink-0"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </Link>
        </div>

        {/* ==================================================================== */}
        {/* LEVEL 1 — Academic Year Landing View (Subject Covers Grid) */}
        {/* ==================================================================== */}
        {!selectedCover && (
          <div className="space-y-6">
            {/* Grade Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#0B132B] to-slate-900 border border-amber-500/30 p-6 sm:p-8 text-white shadow-xl">
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                      {gradeInfo.badge}
                    </span>
                    <span className="text-xs text-amber-300/80 font-medium">
                      {COLLEGE_NAME}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    {gradeInfo.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                    {gradeInfo.description}
                  </p>
                </div>

                {/* Refresh and Counter */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 text-amber-300 border border-white/10">
                    {displayCovers.length} مواد دراسية
                  </span>

                  <button
                    onClick={() => loadGradeData(true)}
                    disabled={isRefreshing}
                    className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                    title="تحديث فوري"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Search Input for Subject Covers */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`ابحث عن مادة أو دكتور في ${gradeInfo.name}...`}
                className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 outline-none shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* Frosted Blur Guest Notice Banner */}
            {isGuest && (
              <div
                onClick={() => openAuthModal('register')}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-2 border-amber-500/40 text-center shadow-2xl cursor-pointer hover:border-amber-400 transition-all group my-2"
              >
                <div className="max-w-md mx-auto space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-md group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6 animate-bounce" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    للاستفادة من المحاضرات والملخصات يرجى تسجيل الدخول أو إنشاء حساب
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    أنت في وضع معاينة الزائر (Guest Preview). انضم إلينا وسجل الآن برقم هاتفك للوصول الكامل لكافة المحاضرات والمذكرات وبنك الأسئلة ⚖️
                  </p>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>انضم لينا واعمل صفحة الآن</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Subject Covers Grid (Large Cards with YouTube-Style Animated Previews) */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
                <span className="text-sm font-semibold">جارٍ تحميل مواد {gradeInfo.name}...</span>
              </div>
            ) : filteredCovers.length === 0 ? (
              <EmptyState
                icon="book"
                title="لا توجد مواد مضافة حالياً"
                description={
                  searchQuery
                    ? 'لم يتم العثور على مواد تطابق بحثك. جرب كلمات بحث أخرى.'
                    : `لم يتم رفع مواد دراسية لـ ${gradeInfo.name} حتى الآن.`
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCovers.map((cov) => (
                  <SubjectCoverCard
                    key={cov.id}
                    cover={cov}
                    onClick={() => handleSelectCover(cov)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* LEVEL 2 — Inside a Selected Subject (3 Fixed Square Tabs) */}
        {/* ==================================================================== */}
        {selectedCover && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Bar: Back to Subjects Button + Subject Name + Search */}
            <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Prominent Back to Subjects Button */}
                <button
                  onClick={() => handleSelectCover(null)}
                  className="flex items-center gap-2 px-4 sm:px-5 h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all active:scale-95 shrink-0 min-h-[48px]"
                  title="العودة لقائمة المواد"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>← العودة للمواد</span>
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {gradeInfo.name}
                    </span>
                    {selectedCover.professor_name && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {selectedCover.professor_name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedCover.subject_name}
                  </h2>
                </div>
              </div>

              {/* Search Inside this Subject */}
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث داخل هذه المادة..."
                  className="w-full h-11 pr-10 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:border-amber-500 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* 3 Fixed Side-by-Side Square-Styled Buttons (Strict RTL Order) */}
            {/* 1st (Right): المحاضرات والـ PDF | 2nd (Middle): شرح الفيديوهات | 3rd (Left): بنك الأسئلة */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full">
              {/* 1st (Right): المحاضرات والـ PDF */}
              <button
                type="button"
                onClick={() => setSelectedSubjectTab('pdf')}
                className={`flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl border transition-all text-center min-h-[96px] sm:min-h-[116px] group active:scale-95 ${
                  selectedSubjectTab === 'pdf'
                    ? 'bg-red-500 text-white border-red-400 shadow-xl shadow-red-500/30 ring-2 ring-red-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-red-400/50 hover:bg-red-500/[0.03]'
                }`}
              >
                <div
                  className={`p-2 rounded-xl mb-1.5 transition-transform group-hover:scale-110 ${
                    selectedSubjectTab === 'pdf' ? 'bg-white/20' : 'bg-red-500/10'
                  }`}
                >
                  <FileText
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      selectedSubjectTab === 'pdf' ? 'text-white' : 'text-red-500'
                    }`}
                  />
                </div>
                <span className="text-xs sm:text-sm font-black tracking-tight line-clamp-1">
                  المحاضرات والـ PDF
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                    selectedSubjectTab === 'pdf'
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {subjectPdfs.length} ملف
                </span>
              </button>

              {/* 2nd (Middle): شرح الفيديوهات */}
              <button
                type="button"
                onClick={() => setSelectedSubjectTab('video')}
                className={`flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl border transition-all text-center min-h-[96px] sm:min-h-[116px] group active:scale-95 ${
                  selectedSubjectTab === 'video'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-600/30 ring-2 ring-blue-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400/50 hover:bg-blue-600/[0.03]'
                }`}
              >
                <div
                  className={`p-2 rounded-xl mb-1.5 transition-transform group-hover:scale-110 ${
                    selectedSubjectTab === 'video' ? 'bg-white/20' : 'bg-blue-500/10'
                  }`}
                >
                  <Video
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      selectedSubjectTab === 'video' ? 'text-white' : 'text-blue-500'
                    }`}
                  />
                </div>
                <span className="text-xs sm:text-sm font-black tracking-tight line-clamp-1">
                  شرح الفيديوهات
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                    selectedSubjectTab === 'video'
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {subjectVideos.length} فيديو
                </span>
              </button>

              {/* 3rd (Left): بنك الأسئلة */}
              <button
                type="button"
                onClick={() => setSelectedSubjectTab('questions')}
                className={`flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl border transition-all text-center min-h-[96px] sm:min-h-[116px] group active:scale-95 ${
                  selectedSubjectTab === 'questions'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-xl shadow-purple-600/30 ring-2 ring-purple-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-400/50 hover:bg-purple-600/[0.03]'
                }`}
              >
                <div
                  className={`p-2 rounded-xl mb-1.5 transition-transform group-hover:scale-110 ${
                    selectedSubjectTab === 'questions' ? 'bg-white/20' : 'bg-purple-500/10'
                  }`}
                >
                  <Award
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      selectedSubjectTab === 'questions' ? 'text-white' : 'text-purple-500'
                    }`}
                  />
                </div>
                <span className="text-xs sm:text-sm font-black tracking-tight line-clamp-1">
                  بنك الأسئلة
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                    selectedSubjectTab === 'questions'
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {subjectQuizzes.length} اختبار
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: المحاضرات والـ PDF */}
            {selectedSubjectTab === 'pdf' && (
              <div className="space-y-4">
                {/* PDF Actions Bar */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      محاضرات وملخصات الـ PDF المتاحة ({subjectPdfs.length})
                    </span>
                  </div>

                  {subjectPdfs.length > 0 && (
                    <button
                      onClick={() => {
                        setMultiSelectMode(!multiSelectMode);
                        setSelectedForDownload([]);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        multiSelectMode
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-500'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{multiSelectMode ? 'إلغاء التحديد' : 'تحديد للتنزيل دفعة واحدة'}</span>
                    </button>
                  )}
                </div>

                {/* Floating Multi-Download Action Bar */}
                {multiSelectMode && (
                  <div className="sticky top-20 z-30 p-3 rounded-2xl bg-teal-900/90 text-white border border-teal-400 shadow-xl flex items-center justify-between gap-3 text-xs backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAllDownloads}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold"
                      >
                        <span>تحديد الكل</span>
                      </button>
                      <span>تم تحديد: {selectedForDownload.length} ملف</span>
                    </div>

                    <button
                      onClick={handleBulkDownload}
                      disabled={selectedForDownload.length === 0 || isDownloading}
                      className="px-4 py-1.5 rounded-xl bg-white text-teal-950 font-black flex items-center gap-1.5 hover:bg-teal-100 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDownloading ? 'جارٍ التنزيل...' : 'تنزيل المحدد دفعة واحدة'}</span>
                    </button>
                  </div>
                )}

                {subjectPdfs.length === 0 ? (
                  <EmptyState
                    icon="file"
                    title="لا توجد محاضرات PDF مضافة في هذه المادة حالياً"
                    description="سيتم إضافة ملفات المحاضرات والملخصات من قبل إدارة المنصة قريباً."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subjectPdfs.map((material) => (
                      <div key={material.id} className="relative">
                        {multiSelectMode && (
                          <button
                            type="button"
                            onClick={() => toggleSelectForDownload(material.id)}
                            className={`absolute top-3 right-3 z-20 p-2 rounded-xl backdrop-blur-md transition-all ${
                              selectedForDownload.includes(material.id)
                                ? 'bg-teal-600 text-white shadow-lg'
                                : 'bg-slate-950/70 text-slate-300 hover:text-white'
                            }`}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                        )}

                        <MaterialCard
                          material={material}
                          onOpenPdf={(mat) => handleOpenPdf(mat)}
                          onOpenVideo={(mat) => handleOpenVideo(mat)}
                          onReport={(mat) => setReportingMaterial(mat)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: شرح الفيديوهات */}
            {selectedSubjectTab === 'video' && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  شروحات الفيديو المباشرة للمادة ({subjectVideos.length})
                </div>

                {subjectVideos.length === 0 ? (
                  <EmptyState
                    icon="file"
                    title="لا توجد شروحات فيديو مضافة في هذه المادة حالياً"
                    description="سيتم رفع الشروحات المرئية للمادة قريباً."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subjectVideos.map((material) => (
                      <MaterialCard
                        key={material.id}
                        material={material}
                        onOpenVideo={(mat) => handleOpenVideo(mat)}
                        onOpenPdf={(mat) => handleOpenPdf(mat)}
                        onReport={(mat) => setReportingMaterial(mat)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: بنك الأسئلة */}
            {selectedSubjectTab === 'questions' && (
              <div className="space-y-5">
                {/* Random Practice Quiz Feature for this Subject */}
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-950 to-slate-900 border border-purple-500/30 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500 text-white font-black text-[11px] shadow-sm">
                        بنك الأسئلة الذكي
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        اختبار تدريبي عشوائي ({selectedCover.subject_name})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                      اختبر مستواك الآن بسحب 10 أسئلة عشوائية من أسئلة هذه المادة لتثبيت القواعد والتحضير للامتحانات.
                    </p>
                  </div>

                  <button
                    onClick={handleStartRandomPracticeQuiz}
                    disabled={isGeneratingPracticeQuiz || subjectQuizzes.length === 0}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 flex items-center gap-2 shrink-0 disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>{isGeneratingPracticeQuiz ? 'جارٍ التوليد...' : 'بدء اختبار عشوائي 🎲'}</span>
                  </button>
                </div>

                {/* Quizzes Grid */}
                {subjectQuizzes.length === 0 ? (
                  <EmptyState
                    icon="book"
                    title="لا توجد اختبارات أو بنوك أسئلة مضافة في هذه المادة حالياً"
                    description="سيتم إضافة بنوك الأسئلة والاختبارات التفاعلية قريباً."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subjectQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-xl hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              <Award className="w-4 h-4" />
                            </span>

                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {quiz.duration_minutes} دقيقة
                            </span>
                          </div>

                          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {quiz.title}
                          </h4>

                          {quiz.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                              {quiz.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500 font-semibold">
                            {quiz.question_count || quiz.questions?.length || 0} سؤال
                          </span>

                          <button
                            onClick={() => handleOpenQuiz(quiz)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all active:scale-95"
                          >
                            <span>بدء الاختبار</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Video Modal */}
      {activeVideo && (
        <VideoModal
          material={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}

      {/* PDF Viewer Modal */}
      {activePdf && (
        <PdfModal
          material={activePdf}
          onClose={() => setActivePdf(null)}
        />
      )}

      {/* Quiz Player Modal */}
      {activeQuiz && (
        <QuizPlayerModal
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onSubmissionSuccess={() => {
            loadGradeData();
          }}
        />
      )}

      {/* Student Bug & Typo Report Modal */}
      <BugReportModal
        isOpen={Boolean(reportingMaterial)}
        onClose={() => setReportingMaterial(null)}
        reportType="lecture"
        targetId={reportingMaterial?.id || ''}
        targetTitle={reportingMaterial?.title || 'محاضرة'}
      />

      {/* Interactive Peeking Character Widget */}
      <ThemeCharacterWidget />

      {/* Floating Action Widgets */}
      <FloatingWidgets settings={settings} />

      {/* Footer */}
      <Footer />
    </div>
  );
}

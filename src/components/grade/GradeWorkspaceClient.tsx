'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  Video,
  Flame,
  Download,
  CheckSquare,
  Square,
  Search,
  Sparkles,
  Award,
  Layers,
  RefreshCw,
  FolderArchive,
  Shuffle,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BackgroundWatermark } from '@/components/ui/BackgroundWatermark';
import { OccasionThemeOverlay } from '@/components/ui/OccasionThemeOverlay';
import { MaterialCard } from '@/components/home/MaterialCard';
import { VideoModal } from '@/components/home/VideoModal';
import { PdfModal } from '@/components/home/PdfModal';
import { QuizPlayerModal } from '@/components/quiz/QuizPlayerModal';
import { LectureBundleCard } from '@/components/bundles/LectureBundleCard';
import { LectureBundleModal } from '@/components/bundles/LectureBundleModal';
import { ThemeCharacterWidget } from '@/components/ui/ThemeCharacterWidget';
import { EmptyState } from '@/components/ui/EmptyState';
import { FloatingWidgets } from '@/components/ui/FloatingWidgets';
import { ACADEMIC_YEARS, COLLEGE_NAME } from '@/lib/constants';
import { AcademicYearId, Subject, Material, Quiz, LectureBundle, QuizQuestion } from '@/types';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';

interface GradeWorkspaceClientProps {
  gradeId: AcademicYearId;
}

export default function GradeWorkspaceClient({ gradeId }: GradeWorkspaceClientProps) {
  const { occasionTheme } = useTheme();
  const gradeInfo = ACADEMIC_YEARS.find((y) => y.id === gradeId) || ACADEMIC_YEARS[0];

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bundles, setBundles] = useState<LectureBundle[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPracticeQuiz, setIsGeneratingPracticeQuiz] = useState(false);

  // Filters with session persistence on refresh
  const [activeTab, setActiveTabState] = useState<'all' | 'bundles' | 'pdf' | 'video' | 'summary' | 'quizzes'>('all');

  useEffect(() => {
    const saved = sessionStorage.getItem(`eldostour_grade_${gradeId}_tab`);
    if (saved && ['all', 'bundles', 'pdf', 'video', 'summary', 'quizzes'].includes(saved)) {
      setActiveTabState(saved as any);
    }
  }, [gradeId]);

  const setActiveTab = (tab: 'all' | 'bundles' | 'pdf' | 'video' | 'summary' | 'quizzes') => {
    setActiveTabState(tab);
    sessionStorage.setItem(`eldostour_grade_${gradeId}_tab`, tab);
  };
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cramMode, setCramMode] = useState(false);

  // Multi-Select Download Mode
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedForDownload, setSelectedForDownload] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Modals
  const [activeVideo, setActiveVideo] = useState<Material | null>(null);
  const [activePdf, setActivePdf] = useState<Material | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeBundle, setActiveBundle] = useState<LectureBundle | null>(null);

  // Load data for this grade only
  const loadGradeData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      // 1. Fetch Subjects for this grade
      const { data: subData } = await supabase
        .from('subjects')
        .select('*')
        .eq('year', gradeId)
        .order('name', { ascending: true });

      if (subData) setSubjects(subData as Subject[]);

      // 2. Fetch Materials for this grade
      const { data: matData } = await supabase
        .from('materials')
        .select('*, subjects(name)')
        .eq('year', gradeId)
        .order('created_at', { ascending: false });

      if (matData) setMaterials(matData as Material[]);

      // 3. Fetch Lecture Bundles for this grade (Part 1.2)
      const { data: bData } = await supabase
        .from('lecture_bundles')
        .select('*, subjects(name)')
        .eq('year', gradeId)
        .order('created_at', { ascending: false });

      if (bData) setBundles(bData as LectureBundle[]);

      // 4. Fetch Quizzes for this grade
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*, subjects(name), quiz_questions(*)')
        .eq('year', gradeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (quizData) {
        // Map questions
        const mappedQuizzes = quizData.map((q: any) => ({
          ...q,
          questions: q.quiz_questions || [],
        }));
        setQuizzes(mappedQuizzes as Quiz[]);
      }
    } catch {
      // Keep clean empty states
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials', filter: `year=eq.${gradeId}` }, () => {
        loadGradeData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects', filter: `year=eq.${gradeId}` }, () => {
        loadGradeData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gradeId, loadGradeData]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      // Tab filter
      if (activeTab === 'pdf' && item.file_type !== 'pdf') return false;
      if (activeTab === 'video' && item.file_type !== 'video') return false;
      if (activeTab === 'summary' && item.category !== 'summary' && !item.title.includes('ملخص')) return false;

      // Subject filter
      if (selectedSubjectId !== 'all' && item.subject_id !== selectedSubjectId) return false;

      // Cram Mode (Night-before-exam) filter
      if (cramMode && !item.is_cram && !item.title.includes('مراجعة') && !item.title.includes('ليلة الامتحان')) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mTitle = item.title?.toLowerCase().includes(q);
        const mDesc = item.description?.toLowerCase().includes(q);
        const mSub = item.subjects?.name?.toLowerCase().includes(q);
        if (!mTitle && !mDesc && !mSub) return false;
      }

      return true;
    });
  }, [materials, activeTab, selectedSubjectId, cramMode, searchQuery]);

  // Filtered bundles
  const filteredBundles = useMemo(() => {
    return bundles.filter((b) => {
      if (selectedSubjectId !== 'all' && b.subject_id !== selectedSubjectId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bTitle = b.title?.toLowerCase().includes(q);
        const bProf = b.professor_name?.toLowerCase().includes(q);
        const bSub = b.subjects?.name?.toLowerCase().includes(q);
        if (!bTitle && !bProf && !bSub) return false;
      }
      return true;
    });
  }, [bundles, selectedSubjectId, searchQuery]);

  // Feature #4: Auto-Generated Random Question Bank ("Random Practice Quiz")
  const handleStartRandomPracticeQuiz = async () => {
    setIsGeneratingPracticeQuiz(true);
    try {
      let allQuestions: QuizQuestion[] = [];
      quizzes.forEach((q) => {
        if (q.questions && q.questions.length > 0) {
          allQuestions.push(...q.questions);
        }
      });

      if (allQuestions.length === 0) {
        const { data: dbQ } = await supabase
          .from('quiz_questions')
          .select('*')
          .limit(30);
        if (dbQ) allQuestions = dbQ as QuizQuestion[];
      }

      if (allQuestions.length === 0) {
        alert('لا توجد أسئلة مضافة في بنك أسئلة هذه الفرقة حالياً.');
        return;
      }

      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);

      const practiceQuiz: Quiz = {
        id: 'practice-random',
        title: `اختبار تدريبي عشوائي - ${gradeInfo.name} 🎲`,
        description: 'اختبار تم توليده عشوائياً من بنك أسئلة الفرقة لاختبار معلوماتك وتثبيت القواعد.',
        year: gradeId,
        subject_id: selectedSubjectId !== 'all' ? selectedSubjectId : (subjects[0]?.id || ''),
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

  // Toggle single download selection
  const toggleSelectForDownload = (id: string) => {
    setSelectedForDownload((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all visible downloadable materials
  const handleSelectAllDownloads = () => {
    const downloadables = filteredMaterials
      .filter((m) => m.file_type === 'pdf')
      .map((m) => m.id);
    if (selectedForDownload.length === downloadables.length) {
      setSelectedForDownload([]);
    } else {
      setSelectedForDownload(downloadables);
    }
  };

  // Perform bulk download
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
        // Small delay to prevent browser popup block
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.warn('Download error:', err);
      }
    }
    setIsDownloading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070c18] text-slate-900 dark:text-slate-100 relative">
      <BackgroundWatermark />
      <OccasionThemeOverlay theme={occasionTheme || 'default'} />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dynamic Breadcrumbs & Back Button */}
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <nav className="flex items-center gap-2">
            <Link href="/" className="hover:text-amber-500 transition-colors">
              الرئيسية
            </Link>
            <span>/</span>
            <span className="text-amber-500 font-bold">{gradeInfo.name}</span>
            {selectedSubjectId !== 'all' && (
              <>
                <span>/</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {subjects.find((s) => s.id === selectedSubjectId)?.name}
                </span>
              </>
            )}
          </nav>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all active:scale-95"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </Link>
        </div>

        {/* Grade Banner */}
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

            {/* Quick Actions (Cram Mode + Multi-Download + Sync) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Cram Mode Toggle (وضع ليلة الامتحان) */}
              <button
                onClick={() => setCramMode(!cramMode)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  cramMode
                    ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/30 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                }`}
                title="وضع ليلة الامتحان: تصفية المراجعات النهائية والملخصات المركزة فقط"
              >
                <Flame className="w-4 h-4 text-yellow-300" />
                <span>{cramMode ? 'وضع ليلة الامتحان مفعل' : 'وضع ليلة الامتحان'}</span>
              </button>

              {/* Multi-Download Toggle */}
              <button
                onClick={() => {
                  setMultiSelectMode(!multiSelectMode);
                  setSelectedForDownload([]);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  multiSelectMode
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>{multiSelectMode ? 'إلغاء التحديد' : 'تحديد للتنزيل'}</span>
              </button>

              {/* Refresh */}
              <button
                onClick={() => loadGradeData(true)}
                disabled={isRefreshing}
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                title="تحديث فوري"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
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

        {/* Workspace Tabs: All, Bundles, PDFs, Videos, Summaries, Quizzes */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>الكل ({materials.length + bundles.length})</span>
          </button>

          {/* Bundles Tab */}
          <button
            onClick={() => setActiveTab('bundles')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
              activeTab === 'bundles'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <FolderArchive className="w-4 h-4 text-amber-500" />
            <span>باقات المحاضرات ({bundles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
              activeTab === 'pdf'
                ? 'bg-red-500 text-white border-red-400 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-red-500" />
            <span>محاضرات PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
              activeTab === 'video'
                ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Video className="w-4 h-4 text-blue-500" />
            <span>فيديوهات مباشرة</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
              activeTab === 'summary'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>ملخصات ومراجعات</span>
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
              activeTab === 'quizzes'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-purple-500" />
            <span>اختبارات الفرقة ({quizzes.length})</span>
          </button>
        </div>

        {/* Subjects Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
              selectedSubjectId === 'all'
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            جميع المواد
          </button>

          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
                selectedSubjectId === sub.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`ابحث داخل ${gradeInfo.name} بالاسم أو المادة...`}
            className="w-full h-11 pr-10 pl-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm focus:border-amber-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Main Content Area */}
        {activeTab === 'quizzes' ? (
          /* Quizzes List for this Grade + Feature #4 Random Question Bank */
          <div className="space-y-6">
            {/* Feature #4: Auto-Generated Random Question Bank ("Random Practice Quiz") */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-950 to-slate-900 border border-purple-500/30 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500 text-white font-black text-[11px] shadow-sm">
                    بنك الأسئلة الذكي
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    اختبار تدريبي عشوائي (Random Practice Quiz)
                  </h3>
                </div>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  توليد اختبار تدريبي فوري بسحب 10 أسئلة عشوائية من جميع موضوعات {gradeInfo.name} لتثبيت المعلومة واختبار مستواك قبل الامتحان.
                </p>
              </div>

              <button
                onClick={handleStartRandomPracticeQuiz}
                disabled={isGeneratingPracticeQuiz}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                <Shuffle className="w-4 h-4" />
                <span>بدء اختبار عشوائي للتمرين 🎲</span>
              </button>
            </div>

            {quizzes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizzes.map((q) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
                          {q.subjects?.name || 'مادة تخصصية'}
                        </span>
                        <span className="text-xs text-slate-400">
                          ⏱️ {q.duration_minutes || 15} دقيقة
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                        {q.title}
                      </h3>
                      {q.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                          {q.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveQuiz(q)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-4 h-4" />
                      <span>بدء الاختبار التفاعلي</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد اختبارات مضافة لهذه الفرقة حالياً"
                description="سيقوم المشرفون برفع اختبارات تدريبية دورية لقياس المستوى."
                icon="book"
              />
            )}
          </div>
        ) : activeTab === 'bundles' ? (
          /* Bundles Only Grid (Part 1.2) */
          <div>
            {filteredBundles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBundles.map((b) => (
                  <LectureBundleCard
                    key={b.id}
                    bundle={b}
                    onOpenBundle={setActiveBundle}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد باقات محاضرات مضافة لهذه الفرقة حالياً"
                description="سيتم إدراج باقات المحاضرات الشاملة ذات الأغلفة المخصصة وفيديوهات الشرح هنا فور نشرها."
                icon="file"
              />
            )}
          </div>
        ) : (
          /* Materials Grid (All, PDFs, Videos, Summaries) */
          <div className="space-y-8">
            {/* In 'all' tab: Show bundles section at top if any exist */}
            {activeTab === 'all' && filteredBundles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      باقات المحاضرات الشاملة (فيديو + ملخصات + أسئلة):
                    </h3>
                  </div>
                  <span className="text-xs text-amber-500 font-bold">
                    {filteredBundles.length} باقة معتمدة
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredBundles.map((b) => (
                    <LectureBundleCard
                      key={b.id}
                      bundle={b}
                      onOpenBundle={setActiveBundle}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Individual Materials List */}
            <div>
              {activeTab === 'all' && filteredBundles.length > 0 && (
                <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-200 dark:border-slate-800">
                  <FileText className="w-5 h-5 text-red-500" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    المحاضرات الفردية والمذكرات:
                  </h3>
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="h-56 rounded-3xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse border border-slate-200 dark:border-slate-800"
                    />
                  ))}
                </div>
              ) : filteredMaterials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredMaterials.map((item) => {
                    const isSelected = selectedForDownload.includes(item.id);
                    return (
                      <div key={item.id} className="relative">
                        {/* Checkbox for Multi-Select Download */}
                        {multiSelectMode && item.file_type === 'pdf' && (
                          <button
                            onClick={() => toggleSelectForDownload(item.id)}
                            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl bg-slate-950/80 border border-teal-400 text-white flex items-center justify-center shadow-lg"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-teal-400 fill-teal-400/20" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        )}

                        <MaterialCard
                          material={item}
                          onOpenVideo={setActiveVideo}
                          onOpenPdf={setActivePdf}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : activeTab !== 'all' || filteredBundles.length === 0 ? (
                <EmptyState
                  title={
                    cramMode
                      ? 'لا توجد مراجعات مخصصة لليلة الامتحان حالياً'
                      : searchQuery.trim()
                      ? 'لا توجد نتائج مطابقة للبحث'
                      : `لا توجد محاضرات مضافة في ${gradeInfo.name} حالياً`
                  }
                  description={
                    cramMode
                      ? 'قم بإلغاء وضع ليلة الامتحان لمشاهدة جميع المحاضرات العادية.'
                      : 'سيقوم مشرفو المنصة برفع المحاضرات والمذكرات المعتمدة هنا فور صدورها.'
                  }
                  icon="file"
                />
              ) : null}
            </div>
          </div>
        )}
      </main>

      {/* Floating Widgets (Pomodoro & Scratchpad) */}
      <FloatingWidgets />

      {/* Video Modal */}
      <VideoModal
        material={activeVideo}
        onClose={() => setActiveVideo(null)}
      />

      {/* PDF Modal */}
      <PdfModal
        material={activePdf}
        onClose={() => setActivePdf(null)}
      />

      {/* Lecture Bundle Modal (Part 1.2) */}
      <LectureBundleModal
        bundle={activeBundle}
        onClose={() => setActiveBundle(null)}
        onOpenQuiz={(quizId) => {
          const q = quizzes.find((x) => x.id === quizId);
          if (q) setActiveQuiz(q);
        }}
      />

      {/* Quiz Modal */}
      <QuizPlayerModal
        quiz={activeQuiz}
        onClose={() => setActiveQuiz(null)}
        onSubmissionSuccess={() => loadGradeData(false)}
      />

      {/* Interactive Peeking Theme Character Widget */}
      <ThemeCharacterWidget />

      <Footer />
    </div>
  );
}

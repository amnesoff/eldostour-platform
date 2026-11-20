'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  Layers,
  BookOpen,
  BellRing,
  Clock,
  FileText,
  Video,
  RefreshCw,
  Award,
  Settings,
  MessageSquare,
  FolderArchive,
  BookA,
  Sparkles,
} from 'lucide-react';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { BulkUploader } from '@/components/admin/BulkUploader';
import { LectureBundleManager } from '@/components/admin/LectureBundleManager';
import { FrenchTermsManager } from '@/components/admin/FrenchTermsManager';
import { MaterialsTable } from '@/components/admin/MaterialsTable';
import { SubjectsManager } from '@/components/admin/SubjectsManager';
import { UrgentNewsManager } from '@/components/admin/UrgentNewsManager';
import { ExamCountdownManager } from '@/components/admin/ExamCountdownManager';
import { CmsManager } from '@/components/admin/CmsManager';
import { QuizzesManager } from '@/components/admin/QuizzesManager';
import { RequestsManager } from '@/components/admin/RequestsManager';
import { ThemeCharacterManager } from '@/components/admin/ThemeCharacterManager';
import { supabase } from '@/lib/supabase';
import { Material, Subject, UrgentNewsItem, ExamCountdownSettings } from '@/types';

type AdminTab =
  | 'upload'
  | 'bundles'
  | 'materials'
  | 'quizzes'
  | 'french'
  | 'themes'
  | 'cms'
  | 'requests'
  | 'subjects'
  | 'news'
  | 'countdown';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function AdminDashboardClient() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTabState] = useState<AdminTab>('upload');

  // Tab Persistence across F5 page reloads
  useEffect(() => {
    const saved = sessionStorage.getItem('eldostour_admin_active_tab') as AdminTab | null;
    if (
      saved &&
      [
        'upload',
        'bundles',
        'materials',
        'quizzes',
        'french',
        'themes',
        'cms',
        'requests',
        'subjects',
        'news',
        'countdown',
      ].includes(saved)
    ) {
      setActiveTabState(saved);
    }
  }, []);

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    sessionStorage.setItem('eldostour_admin_active_tab', tab);
  };

  // Database Data States
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [news, setNews] = useState<UrgentNewsItem[]>([]);
  const [countdownSettings, setCountdownSettings] = useState<ExamCountdownSettings | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-logout & Activity Tracking
  const [lastActivity, setLastActivity] = useState<number>(() => Date.now());

  // Logout handler
  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('eldostour_admin_auth');
    sessionStorage.removeItem('eldostour_admin_login_time');
    setIsAuthenticated(false);
  }, []);

  // Check authentication on initial load
  useEffect(() => {
    const authStatus = sessionStorage.getItem('eldostour_admin_auth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Inactivity 30-minute timer listener
  useEffect(() => {
    if (!isAuthenticated) return;

    const recordActivity = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener('mousemove', recordActivity);
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('touchstart', recordActivity);
    window.addEventListener('scroll', recordActivity);
    window.addEventListener('click', recordActivity);

    const checkInterval = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        alert('تم تسجيل الخروج تلقائياً بعد 30 دقيقة من عدم النشاط لحماية لوحة التحكم.');
        handleLogout();
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
      window.removeEventListener('scroll', recordActivity);
      window.removeEventListener('click', recordActivity);
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, lastActivity, handleLogout]);

  // Load All Admin Data
  const loadAdminData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      // 1. Fetch Materials
      const { data: mats } = await supabase
        .from('materials')
        .select(`
          *,
          subjects (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (mats) setMaterials(mats as Material[]);

      // 2. Fetch Subjects
      const { data: subs } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (subs) setSubjects(subs as Subject[]);

      // 3. Fetch News
      const { data: nws } = await supabase
        .from('urgent_news')
        .select('*')
        .order('created_at', { ascending: false });

      if (nws) setNews(nws as UrgentNewsItem[]);

      // 4. Fetch Exam Countdown Settings
      const { data: sett } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'exam_countdown')
        .single();

      if (sett && sett.value) {
        setCountdownSettings(sett.value as ExamCountdownSettings);
      }
    } catch (err) {
      console.warn('Error fetching admin data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Realtime Subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    loadAdminData();

    const channel = supabase
      .channel('admin_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
        loadAdminData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => {
        loadAdminData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'urgent_news' }, () => {
        loadAdminData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        loadAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, loadAdminData]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Calculate quick stats
  const totalMaterials = materials.length;
  const totalPdfs = materials.filter((m) => m.file_type === 'pdf').length;
  const totalVideos = materials.filter((m) => m.file_type === 'video').length;
  const totalSubjects = subjects.length;
  const activeNewsCount = news.filter((n) => n.is_active).length;

  const tabs = [
    { id: 'upload', label: 'رفع الملفات السريع', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'bundles', label: 'باقات المحاضرات (غلاف + 4 تبويبات)', icon: <FolderArchive className="w-4 h-4" /> },
    { id: 'materials', label: 'إدارة المحاضرات (تحديد وحذف)', count: totalMaterials, icon: <Layers className="w-4 h-4" /> },
    { id: 'quizzes', label: 'الاختبارات وبناء الأسئلة والتكريم', icon: <Award className="w-4 h-4" /> },
    { id: 'french', label: 'القاموس الفرنسي الصوتي', icon: <BookA className="w-4 h-4" /> },
    { id: 'themes', label: 'الثيمات والشخصيات التفاعلية', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
    { id: 'cms', label: 'المظهر والـ CMS والواتساب', icon: <Settings className="w-4 h-4" /> },
    { id: 'requests', label: 'طلبات الطلاب', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'subjects', label: 'المواد الدراسية', count: totalSubjects, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'news', label: 'الأخبار العاجلة', count: activeNewsCount, icon: <BellRing className="w-4 h-4" /> },
    { id: 'countdown', label: 'عداد الامتحانات', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#070c18] text-slate-100 select-none selection:bg-amber-500/20">
      <AdminHeader onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Quick Stats Overview Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-right">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              إجمالي المحاضرات
            </span>
            <span className="text-2xl font-black text-white">{totalMaterials}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-right">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-red-400" />
              ملفات PDF
            </span>
            <span className="text-2xl font-black text-red-400">{totalPdfs}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-right">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <Video className="w-3.5 h-3.5 text-blue-400" />
              فيديوهات مباشرة
            </span>
            <span className="text-2xl font-black text-blue-400">{totalVideos}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-right">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              المواد المقررة
            </span>
            <span className="text-2xl font-black text-emerald-400">{totalSubjects}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-right col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              أخبار نشطة
            </span>
            <span className="text-2xl font-black text-amber-400">{activeNewsCount}</span>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                        isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => loadAdminData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors shrink-0"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">مزامنة</span>
          </button>
        </div>

        {/* Active Tab View */}
        <div className="pt-2">
          {activeTab === 'upload' && (
            <BulkUploader
              subjects={subjects}
              onUploadSuccess={() => loadAdminData(false)}
            />
          )}

          {activeTab === 'bundles' && (
            <LectureBundleManager
              subjects={subjects}
              onRefresh={() => loadAdminData(false)}
            />
          )}

          {activeTab === 'materials' && (
            <MaterialsTable
              materials={materials}
              subjects={subjects}
              onRefresh={() => loadAdminData(false)}
            />
          )}

          {activeTab === 'quizzes' && (
            <QuizzesManager
              subjects={subjects}
              onRefresh={() => loadAdminData(false)}
            />
          )}

          {activeTab === 'french' && (
            <FrenchTermsManager />
          )}

          {activeTab === 'themes' && (
            <ThemeCharacterManager onSettingsUpdated={() => loadAdminData(false)} />
          )}

          {activeTab === 'cms' && (
            <CmsManager onRefresh={() => loadAdminData(false)} />
          )}

          {activeTab === 'requests' && <RequestsManager />}

          {activeTab === 'subjects' && (
            <SubjectsManager
              subjects={subjects}
              materials={materials}
              onRefresh={() => loadAdminData(false)}
            />
          )}

          {activeTab === 'news' && (
            <UrgentNewsManager
              news={news}
              onRefresh={() => loadAdminData(false)}
            />
          )}

          {activeTab === 'countdown' && (
            <ExamCountdownManager initialSettings={countdownSettings} />
          )}
        </div>
      </main>
    </div>
  );
}

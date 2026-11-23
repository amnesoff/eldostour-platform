'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { notFound } from 'next/navigation';
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
  Users,
  ShieldAlert,
  Phone,
} from 'lucide-react';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { BulkUploader } from '@/components/admin/BulkUploader';
import { SubjectCoversManager } from '@/components/admin/SubjectCoversManager';
import { FrenchTermsManager } from '@/components/admin/FrenchTermsManager';
import { MaterialsTable } from '@/components/admin/MaterialsTable';
import { SubjectsManager } from '@/components/admin/SubjectsManager';
import { UrgentNewsManager } from '@/components/admin/UrgentNewsManager';
import { ExamCountdownManager } from '@/components/admin/ExamCountdownManager';
import { CmsManager } from '@/components/admin/CmsManager';
import { QuizzesManager } from '@/components/admin/QuizzesManager';
import { StudentsDirectory } from '@/components/admin/StudentsDirectory';
import { SecurityCenterManager } from '@/components/admin/SecurityCenterManager';
import { RequestsManager } from '@/components/admin/RequestsManager';
import { ThemeCharacterManager } from '@/components/admin/ThemeCharacterManager';
import { supabase } from '@/lib/supabase';
import { Material, Subject, UrgentNewsItem, ExamCountdownSettings, AdminSession } from '@/types';

type AdminTab =
  | 'upload'
  | 'covers'
  | 'bundles'
  | 'materials'
  | 'quizzes'
  | 'students'
  | 'security'
  | 'french'
  | 'themes'
  | 'cms'
  | 'requests'
  | 'subjects'
  | 'news'
  | 'countdown';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AdminDashboardClientProps {
  gateType?: 'super_admin' | 'staff';
  isDirectAdminRoute?: boolean;
}

export default function AdminDashboardClient({
  gateType = 'super_admin',
  isDirectAdminRoute = false,
}: AdminDashboardClientProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [activeTab, setActiveTabState] = useState<AdminTab>('upload');
  const [staffVisibleTabs, setStaffVisibleTabs] = useState<Record<string, boolean>>({
    materials: true,
    quizzes: true,
    covers: true,
  });
  const [securityAlert, setSecurityAlert] = useState<{
    target: string;
    details: string;
    ip: string;
    time: string;
  } | null>(null);

  // Tab Persistence across F5 page reloads
  useEffect(() => {
    const saved = sessionStorage.getItem('eldostour_admin_active_tab') as AdminTab | null;
    if (
      saved &&
      [
        'upload',
        'covers',
        'bundles',
        'materials',
        'quizzes',
        'students',
        'security',
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
    sessionStorage.removeItem('eldostour_admin_session');
    sessionStorage.removeItem('eldostour_admin_login_time');
    sessionStorage.removeItem('eldostour_admin_last_activity');
    sessionStorage.removeItem('eldostour_vault_unlocked');
    sessionStorage.removeItem('eldostour_vault_unlock_time');
    setIsAuthenticated(false);
    setAdminSession(null);
  }, []);

  // Check authentication on initial load
  useEffect(() => {
    const authStatus = sessionStorage.getItem('eldostour_admin_auth');
    const sessionStr = sessionStorage.getItem('eldostour_admin_session');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
      if (sessionStr) {
        try {
          setAdminSession(JSON.parse(sessionStr));
        } catch (e) {
          console.warn('Failed to parse admin session:', e);
        }
      }
    } else {
      setIsAuthenticated(false);
      setAdminSession(null);
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

      // 5. Fetch Security Settings & Staff Visible Tabs
      const { data: secRow } = await supabase
        .from('admin_security')
        .select('staff_visible_tabs')
        .eq('id', 'primary')
        .maybeSingle();

      if (secRow?.staff_visible_tabs) {
        setStaffVisibleTabs(secRow.staff_visible_tabs);
      }

      // 6. Check Recent Failed Attempts (last 24 hours)
      const { data: recentFails } = await supabase
        .from('admin_security_logs')
        .select('*')
        .or('event_type.eq.failed_login,event_type.eq.lockout')
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentFails && recentFails.length > 0) {
        const f = recentFails[0];
        const failTime = new Date(f.created_at).getTime();
        if (Date.now() - failTime < 24 * 60 * 60 * 1000) {
          setSecurityAlert({
            target: f.username || 'غير معروف',
            details: f.details || 'محاولة دخول غير مصرح بها',
            ip: f.ip_address || 'غير محدد',
            time: new Date(f.created_at).toLocaleTimeString('ar-EG'),
          });
        }
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

    const panicChannel = supabase
      .channel('admin_security_panic_version_sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'admin_security' },
        (payload) => {
          const newVersion = payload.new?.session_version;
          const currentVersion = adminSession?.session_version || 1;
          if (newVersion && newVersion > currentVersion) {
            alert('⚠️ تم تفعيل إغلاق الطوارئ المركزي من قبل الإدارة العليا. تم إنهاء كافة الجلسات النشطة لحماية المنصة.');
            handleLogout();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(panicChannel);
    };
  }, [isAuthenticated, loadAdminData, adminSession, handleLogout]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isDirectAdminRoute) {
      notFound();
    }
    return (
      <AdminLogin
        gateType={gateType}
        onSuccess={() => {
          const sessionStr = sessionStorage.getItem('eldostour_admin_session');
          if (sessionStr) {
            try {
              setAdminSession(JSON.parse(sessionStr));
            } catch (e) {
              console.warn(e);
            }
          }
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Calculate quick stats
  const totalMaterials = materials.length;
  const totalPdfs = materials.filter((m) => m.file_type === 'pdf').length;
  const totalVideos = materials.filter((m) => m.file_type === 'video').length;
  const totalSubjects = subjects.length;
  const activeNewsCount = news.filter((n) => n.is_active).length;

  const rawTabs = [
    { id: 'upload' as AdminTab, label: 'رفع الملفات السريع', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'covers' as AdminTab, label: 'إدارة أغلفة المواد ومعاينة الفيديو', icon: <FolderArchive className="w-4 h-4 text-amber-400" /> },
    { id: 'materials' as AdminTab, label: 'إدارة المحاضرات (تحديد وحذف)', count: totalMaterials, icon: <Layers className="w-4 h-4" /> },
    { id: 'quizzes' as AdminTab, label: 'الاختبارات وبناء الأسئلة والتكريم', icon: <Award className="w-4 h-4" /> },
    { id: 'students' as AdminTab, label: 'سجل الطلاب والكارنيهات', icon: <Users className="w-4 h-4 text-emerald-400" /> },
    ...(adminSession?.is_super_admin
      ? [
          {
            id: 'security' as AdminTab,
            label: 'مركز الأمان وإدارة المشرفين',
            icon: <ShieldAlert className="w-4 h-4 text-purple-400" />,
          },
        ]
      : []),
    { id: 'french' as AdminTab, label: 'القاموس الفرنسي الصوتي', icon: <BookA className="w-4 h-4" /> },
    { id: 'themes' as AdminTab, label: 'الثيمات والشخصيات التفاعلية', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
    { id: 'cms' as AdminTab, label: 'الـ CMS والواتساب والتواصل', icon: <Settings className="w-4 h-4" /> },
    { id: 'requests' as AdminTab, label: 'طلبات الطلاب', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'subjects' as AdminTab, label: 'المواد الدراسية', count: totalSubjects, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'news' as AdminTab, label: 'الأخبار العاجلة', count: activeNewsCount, icon: <BellRing className="w-4 h-4" /> },
    { id: 'countdown' as AdminTab, label: 'عداد الامتحانات', icon: <Clock className="w-4 h-4" /> },
  ];

  // Tab Filtering for Sub-Admins
  const tabs = adminSession?.is_super_admin
    ? rawTabs
    : rawTabs.filter((t) => staffVisibleTabs[t.id] !== false);

  return (
    <div className="min-h-screen flex flex-col bg-[#070c18] text-slate-100 select-none selection:bg-amber-500/20">
      <AdminHeader onLogout={handleLogout} adminSession={adminSession} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Security Alert Banner (Red) with WhatsApp Notification */}
        {securityAlert && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center justify-between flex-wrap gap-3 text-right" dir="rtl">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
              <div className="text-xs leading-relaxed">
                <strong className="block text-white font-bold">⚠️ إنذار أمني: رصد محاولات دخول فاشلة غير مصرح بها</strong>
                المستهدف: ({securityAlert.target}) • {securityAlert.details} • IP: <span className="font-mono text-amber-300">{securityAlert.ip}</span> • الوقت: {securityAlert.time}
              </div>
            </div>
            <a
              href={`https://wa.me/201000000000?text=${encodeURIComponent(
                `⚠️ إنذار أمني من منصة الدستور: تم رصد محاولة دخول فاشلة على لوحة التحكم.\nالمستهدف: ${securityAlert.target}\nالتفاصيل: ${securityAlert.details}\nIP: ${securityAlert.ip}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>إبلاغ المشرف العام فوراً عبر واتساب 💬</span>
            </a>
          </div>
        )}

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

          {activeTab === 'covers' && (
            <SubjectCoversManager
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

          {activeTab === 'students' && (
            <StudentsDirectory adminSession={adminSession} />
          )}

          {activeTab === 'security' && (
            <SecurityCenterManager onRefresh={() => loadAdminData(false)} />
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

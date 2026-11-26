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
  ArrowRight,
  Download,
  AlertTriangle,
  Flag,
  Database,
  Flame,
  CheckCircle2,
  ChevronLeft,
  FileCheck,
  ShieldCheck,
  Package,
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
import { BugReportsManager } from '@/components/admin/BugReportsManager';
import { LegalStoriesManager } from '@/components/admin/LegalStoriesManager';
import { LectureBundleManager } from '@/components/admin/LectureBundleManager';
import { ThemeCharacterManager } from '@/components/admin/ThemeCharacterManager';
import { supabase } from '@/lib/supabase';
import { adminGetSecurityData, adminGetFullBackup } from '@/lib/apiClient';
import { Material, Subject, UrgentNewsItem, ExamCountdownSettings, AdminSession } from '@/types';

export type AdminModuleId =
  | 'materials'
  | 'stories'
  | 'quizzes'
  | 'students'
  | 'security'
  | 'reports'
  | 'requests'
  | 'settings'
  | 'backup';

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
  
  // Navigation: null = Hub view (Grid of Cards), or specific module ID
  const [activeModule, setActiveModuleState] = useState<AdminModuleId | null>(null);
  
  // Sub-tabs for compound modules
  const [materialsSubTab, setMaterialsSubTab] = useState<'table' | 'bundles' | 'upload' | 'covers' | 'subjects'>('table');
  const [settingsSubTab, setSettingsSubTab] = useState<'cms' | 'countdown' | 'french' | 'themes' | 'news'>('cms');

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

  // Backup State
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');

  // Live Counts for Feature Cards
  const [moduleCounts, setModuleCounts] = useState({
    materials: 0,
    stories: 0,
    quizzes: 0,
    students: 0,
    pendingStudents: 0,
    reports: 0,
    requests: 0,
  });

  // Restore navigation state from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('eldostour_admin_active_module') as AdminModuleId | null;
    if (
      saved &&
      ['materials', 'stories', 'quizzes', 'students', 'security', 'reports', 'requests', 'settings', 'backup'].includes(saved)
    ) {
      setActiveModuleState(saved);
    }
  }, []);

  const setActiveModule = (mod: AdminModuleId | null) => {
    setActiveModuleState(mod);
    if (mod) {
      sessionStorage.setItem('eldostour_admin_active_module', mod);
    } else {
      sessionStorage.removeItem('eldostour_admin_active_module');
    }
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
    sessionStorage.removeItem('eldostour_admin_active_module');
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

  // Load All Admin Data & Live Counts
  const loadAdminData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      // 1. Fetch Materials
      const { data: mats } = await supabase
        .from('materials')
        .select('*, subjects(name)')
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

      // 5. Fetch Live Counts for Cards (Stories, Quizzes, Students, Reports, Requests)
      try {
        const [
          { count: storiesCount },
          { count: quizzesCount },
          { count: studentsCount },
          { count: pendingCount },
          { count: reportsCount },
          { count: requestsCount },
        ] = await Promise.all([
          supabase.from('legal_stories').select('*', { count: 'exact', head: true }),
          supabase.from('quizzes').select('*', { count: 'exact', head: true }),
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_approved', false),
          supabase.from('bug_reports').select('*', { count: 'exact', head: true }),
          supabase.from('student_requests').select('*', { count: 'exact', head: true }),
        ]);

        setModuleCounts({
          materials: mats?.length || 0,
          stories: storiesCount || 0,
          quizzes: quizzesCount || 0,
          students: studentsCount || 0,
          pendingStudents: pendingCount || 0,
          reports: reportsCount || 0,
          requests: requestsCount || 0,
        });
      } catch {
        // Fallback for counts
      }

      // 6. Security settings & Alerts
      try {
        const secRes = await adminGetSecurityData();
        if (secRes?.securitySettings?.staff_visible_tabs) {
          setStaffVisibleTabs(secRes.securitySettings.staff_visible_tabs);
        }

        if (secRes?.logs && secRes.logs.length > 0) {
          const recentFails = secRes.logs.filter(
            (l: any) => l.event_type === 'failed_login' || l.event_type === 'lockout'
          );
          if (recentFails.length > 0) {
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
        }
      } catch (secErr) {
        console.warn('Could not load security tab config:', secErr);
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
  }, [isAuthenticated, loadAdminData, adminSession, handleLogout]);

  // Full Backup Download Handler
  const handleDownloadFullBackup = async () => {
    setIsExportingBackup(true);
    setBackupSuccessMsg('');
    try {
      const res = await adminGetFullBackup();
      if (!res?.success || !res?.backup) {
        throw new Error(res?.error || 'فشل استخراج النسخة الاحتياطية');
      }

      const jsonStr = JSON.stringify(res.backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aldostour_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupSuccessMsg('تم تحميل النسخة الاحتياطية بنجاح!');
      setTimeout(() => setBackupSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء تحميل النسخة الاحتياطية');
    } finally {
      setIsExportingBackup(false);
    }
  };

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

  // The 9 Primary Admin Cards for the Grid Hub
  const HUB_CARDS: {
    id: AdminModuleId;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    badge?: string;
    count?: number | string;
    isSuperAdminOnly?: boolean;
    onClick?: () => void;
  }[] = [
    {
      id: 'materials',
      title: 'إدارة المحاضرات والملفات',
      description: 'رفع وإدارة المذكرات PDF، فيديوهات الشرح، الحزم التعليمية وتوزيع المواد',
      icon: <Layers className="w-7 h-7 text-amber-400" />,
      color: 'from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-400',
      count: totalMaterials,
      badge: `${totalMaterials} محاضرة`,
    },
    {
      id: 'stories',
      title: 'إدارة الستوري والحالات القانونية',
      description: 'نشر ومضات واستوريهات قانونية سريعة مصورة وفيديو للطلاب عبر Cloudinary',
      icon: <Sparkles className="w-7 h-7 text-pink-400" />,
      color: 'from-pink-500/20 via-pink-500/10 to-transparent border-pink-500/30 hover:border-pink-400',
      count: moduleCounts.stories,
      badge: `${moduleCounts.stories} ومضة`,
    },
    {
      id: 'quizzes',
      title: 'إدارة الامتحانات والكويزات',
      description: 'بنك الأسئلة، الاختبارات التفاعلية، تصحيح الأخطاء، وتكريم الأوائل',
      icon: <Award className="w-7 h-7 text-emerald-400" />,
      color: 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/30 hover:border-emerald-400',
      count: moduleCounts.quizzes,
      badge: `${moduleCounts.quizzes} اختبار`,
    },
    {
      id: 'students',
      title: 'سجل الطلاب والتفعيل',
      description: 'اعتماد الحسابات، البحث السريع بالموبايل، الخزنة المشفرة، والكارنيهات الرقمية',
      icon: <Users className="w-7 h-7 text-blue-400" />,
      color: 'from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30 hover:border-blue-400',
      count: moduleCounts.students,
      badge: moduleCounts.pendingStudents > 0 ? `(${moduleCounts.pendingStudents}) معلق ⏳` : `${moduleCounts.students} طالب`,
    },
    {
      id: 'security',
      title: 'مركز الأمان والطوارئ',
      description: 'مفاتيح الطوارئ، المشرفين الفرعيين، مصفوفة الصلاحيات، وسجلات الأمان 3FA',
      icon: <ShieldAlert className="w-7 h-7 text-purple-400" />,
      color: 'from-purple-500/20 via-purple-500/10 to-transparent border-purple-500/30 hover:border-purple-400',
      badge: 'حماية 3FA',
      isSuperAdminOnly: true,
    },
    {
      id: 'reports',
      title: 'بلاغات الطلاب والأخطاء',
      description: 'مراجعة البلاغات الواردة عن أخطاء المحاضرات أو الأسئلة وتحديث حالتها',
      icon: <Flag className="w-7 h-7 text-rose-400" />,
      color: 'from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 hover:border-rose-400',
      count: moduleCounts.reports,
      badge: `${moduleCounts.reports} بلاغ`,
    },
    {
      id: 'requests',
      title: 'طلبات الطلاب والاقتراحات',
      description: 'متابعة استفسارات ومقترحات الطلاب والمذكرات المطلوبة والرد عليها',
      icon: <MessageSquare className="w-7 h-7 text-cyan-400" />,
      color: 'from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/30 hover:border-cyan-400',
      count: moduleCounts.requests,
      badge: `${moduleCounts.requests} طلب`,
    },
    {
      id: 'settings',
      title: 'إعدادات المنصة والعد التنازلي والقاموس',
      description: 'إعدادات الـ CMS، أرقام الواتساب، عداد الامتحانات، والقاموس الصوتي الفرنسي',
      icon: <Settings className="w-7 h-7 text-teal-400" />,
      color: 'from-teal-500/20 via-teal-500/10 to-transparent border-teal-500/30 hover:border-teal-400',
      badge: `${totalSubjects} مادة`,
    },
    {
      id: 'backup',
      title: 'النسخ الاحتياطي للبيانات (Backup)',
      description: 'تحميل نسخة احتياطية كاملة (JSON/CSV) لكافة الطلاب والمحاضرات والامتحانات',
      icon: <Database className="w-7 h-7 text-amber-300" />,
      color: 'from-amber-600/20 via-amber-600/10 to-transparent border-amber-600/30 hover:border-amber-300',
      badge: 'نسخة احتياطية 📦',
    },
  ];

  // Filter cards for sub-admins using strict granular permissions
  const gPerms = adminSession?.permissions?.granular;
  const isFounder = Boolean(adminSession?.is_super_admin);

  const canSeeCard = (id: AdminModuleId): boolean => {
    if (isFounder) return true;
    if (!gPerms) {
      if (id === 'security' || id === 'backup') return false;
      return true;
    }
    switch (id) {
      case 'materials':
        return Boolean(gPerms.materials?.view);
      case 'stories':
        return Boolean(gPerms.stories?.view);
      case 'quizzes':
        return Boolean(gPerms.quizzes?.view);
      case 'students':
        return Boolean(gPerms.students?.view);
      case 'security':
        return Boolean(gPerms.security_backups?.view);
      case 'backup':
        return Boolean(gPerms.security_backups?.download_backup);
      case 'reports':
        return Boolean(gPerms.requests_reports?.view && gPerms.requests_reports?.resolve_reports);
      case 'requests':
        return Boolean(gPerms.requests_reports?.view && gPerms.requests_reports?.respond_requests);
      case 'settings':
        return Boolean(gPerms.news_cms?.view);
      default:
        return false;
    }
  };

  const visibleCards = HUB_CARDS.filter((card) => {
    if (card.isSuperAdminOnly && !isFounder) return false;
    return canSeeCard(card.id);
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#070c18] text-slate-100 select-none selection:bg-amber-500/20">
      <AdminHeader onLogout={handleLogout} adminSession={adminSession} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
              href={`https://wa.me/201122144007?text=${encodeURIComponent(
                `⚠️ إنذار أمني من منصة الدستور: تم رصد محاولة دخول فاشلة على لوحة التحكم.\nالمستهدف: ${securityAlert.target}\nالتفاصيل: ${securityAlert.details}\nIP: ${securityAlert.ip}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>إبلاغ الإدارة فوراً عبر واتساب 💬</span>
            </a>
          </div>
        )}

        {/* ============================================================== */}
        {/* HUB VIEW: Responsive Grid of Large Feature Cards */}
        {/* ============================================================== */}
        {activeModule === null ? (
          <div className="space-y-6 text-right" dir="rtl">
            {/* Top Hub Welcome & Quick Refresh */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span>لوحة التحكم الرئيسية — منصة الدستور التعليمية</span>
                </h1>
                <p className="text-xs text-slate-400">
                  إدارة المحتوى والمحاضرات، اعتماد الطلاب الجدد، متابعة الاختبارات، والبلاغات الأمنية
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => loadAdminData(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer min-h-[44px]"
                >
                  <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>تحديث البيانات</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFullBackup}
                  disabled={isExportingBackup}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 min-h-[44px]"
                  title="تحميل نسخة احتياطية فورية لبيانات المنصة"
                >
                  {isExportingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>نسخة احتياطية سريعة</span>
                </button>
              </div>
            </div>

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

            {/* THE RESPONSIVE CARD-GRID HUB (grid-cols-2 sm:grid-cols-3 lg:grid-cols-4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
              {visibleCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setActiveModule(card.id)}
                  className={`group relative p-5 rounded-3xl bg-gradient-to-br ${card.color} border transition-all duration-200 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-[1.02] flex flex-col justify-between min-h-[170px] active:scale-[0.99]`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveModule(card.id);
                    }
                  }}
                >
                  {/* Top Row: Icon + Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      {card.icon}
                    </div>

                    {card.badge && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] font-bold text-slate-200">
                        {card.badge}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4 space-y-1">
                    <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors flex items-center justify-between">
                      <span>{card.title}</span>
                      <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* DEDICATED MODULE VIEW WITH PROMINENT "← العودة للوحة الرئيسية" */
          /* ============================================================== */
          <div className="space-y-6 text-right" dir="rtl">
            {/* Top Navigation Bar inside Module */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModule(null)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 shrink-0 min-h-[44px]"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للوحة الرئيسية</span>
                </button>

                <div className="h-6 w-px bg-slate-800 hidden sm:block" />

                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    {HUB_CARDS.find((c) => c.id === activeModule)?.icon}
                    <span>{HUB_CARDS.find((c) => c.id === activeModule)?.title}</span>
                  </h2>
                </div>
              </div>

              {/* Module-Specific Sub-Navigation Tabs (Wrapped, No Horizontal Swipe) */}
              {activeModule === 'materials' && (
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setMaterialsSubTab('table')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                      materialsSubTab === 'table'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    جدول المحاضرات ({totalMaterials})
                  </button>
                  {(isFounder || !gPerms || gPerms.materials?.bundles) && (
                    <button
                      type="button"
                      onClick={() => setMaterialsSubTab('bundles')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                        materialsSubTab === 'bundles'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      حزم المحاضرات (Bundles)
                    </button>
                  )}
                  {(isFounder || !gPerms || gPerms.materials?.add) && (
                    <button
                      type="button"
                      onClick={() => setMaterialsSubTab('upload')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                        materialsSubTab === 'upload'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      الرفع السريع ☁️
                    </button>
                  )}
                  {(isFounder || !gPerms || gPerms.materials?.bundles) && (
                    <button
                      type="button"
                      onClick={() => setMaterialsSubTab('subjects')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                        materialsSubTab === 'subjects' || materialsSubTab === 'covers'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      المواد المقررة ({totalSubjects})
                    </button>
                  )}
                </div>
              )}

              {activeModule === 'settings' && (
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  {(isFounder || !gPerms || gPerms.news_cms?.edit_whatsapp || gPerms.news_cms?.switch_themes) && (
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('cms')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                        settingsSubTab === 'cms'
                          ? 'bg-teal-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      الـ CMS والواتساب
                    </button>
                  )}
                  {(isFounder || !gPerms || gPerms.news_cms?.edit_french_countdown) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSettingsSubTab('countdown')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                          settingsSubTab === 'countdown'
                            ? 'bg-teal-500 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                        }`}
                      >
                        عداد الامتحانات
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsSubTab('french')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                          settingsSubTab === 'french'
                            ? 'bg-teal-500 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                        }`}
                      >
                        القاموس الفرنسي
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('themes')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                      settingsSubTab === 'themes'
                        ? 'bg-teal-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    الشخصيات التفاعلية
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('news')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] cursor-pointer ${
                      settingsSubTab === 'news'
                        ? 'bg-teal-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    الأخبار العاجلة
                  </button>
                </div>
              )}
            </div>

            {/* MODULE CONTENT */}
            <div className="pt-2">
              {/* 1. Materials & Bundles Module */}
              {activeModule === 'materials' && (
                <>
                  {materialsSubTab === 'table' && (
                    <MaterialsTable
                      materials={materials}
                      subjects={subjects}
                      onRefresh={() => loadAdminData(false)}
                    />
                  )}
                  {materialsSubTab === 'bundles' && (
                    <LectureBundleManager
                      subjects={subjects}
                      onRefresh={() => loadAdminData(false)}
                    />
                  )}
                  {materialsSubTab === 'upload' && (
                    <BulkUploader
                      subjects={subjects}
                      onUploadSuccess={() => loadAdminData(false)}
                    />
                  )}
                  {(materialsSubTab === 'subjects' || materialsSubTab === 'covers') && (
                    <SubjectsManager
                      subjects={subjects}
                      materials={materials}
                      adminSession={adminSession}
                      onRefresh={() => loadAdminData(false)}
                    />
                  )}
                </>
              )}

              {/* 2. Legal Stories Module */}
              {activeModule === 'stories' && <LegalStoriesManager />}

              {/* 3. Quizzes & Tests Module */}
              {activeModule === 'quizzes' && (
                <QuizzesManager
                  subjects={subjects}
                  onRefresh={() => loadAdminData(false)}
                />
              )}

              {/* 4. Students Directory Module */}
              {activeModule === 'students' && (
                <StudentsDirectory adminSession={adminSession} />
              )}

              {/* 5. Security Center Module */}
              {activeModule === 'security' && (
                <SecurityCenterManager onRefresh={() => loadAdminData(false)} />
              )}

              {/* 6. Bug Reports Module */}
              {activeModule === 'reports' && <BugReportsManager />}

              {/* 7. Student Requests Module */}
              {activeModule === 'requests' && <RequestsManager />}

              {/* 8. Settings & French & Countdown Module */}
              {activeModule === 'settings' && (
                <>
                  {settingsSubTab === 'cms' && <CmsManager onRefresh={() => loadAdminData(false)} />}
                  {settingsSubTab === 'countdown' && (
                    <ExamCountdownManager initialSettings={countdownSettings} />
                  )}
                  {settingsSubTab === 'french' && <FrenchTermsManager />}
                  {settingsSubTab === 'themes' && (
                    <ThemeCharacterManager onSettingsUpdated={() => loadAdminData(false)} />
                  )}
                  {settingsSubTab === 'news' && (
                    <UrgentNewsManager
                      news={news}
                      onRefresh={() => loadAdminData(false)}
                    />
                  )}
                </>
              )}

              {/* 9. Backup Module Dedicated View */}
              {activeModule === 'backup' && (
                <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-right max-w-2xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                      <Database className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">النسخ الاحتياطي لقاعدة بيانات المنصة (JSON / CSV)</h3>
                      <p className="text-xs text-slate-400">حفظ نسخة احتياطية آمنة وشاملة لكافة السجلات والمحتوى</p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    يتيح لك هذا القسم تنزيل أرشيف كامل لقاعدة البيانات يتضمن الطلاب المسجلين (مع استبعاد الهاشات وكلمات المرور الحساسة أمنياً)، المواد الدراسية، المحاضرات والمذكرات، الكويزات والأسئلة، والومضات القانونية.
                  </p>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>إجمالي المحاضرات المحفوظة:</span>
                      <strong className="text-amber-400 font-mono">{totalMaterials}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>إجمالي الطلاب في السجل:</span>
                      <strong className="text-blue-400 font-mono">{moduleCounts.students}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>إجمالي الكويزات والأسئلة:</span>
                      <strong className="text-emerald-400 font-mono">{moduleCounts.quizzes}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>إجمالي الومضات القانونية:</span>
                      <strong className="text-pink-400 font-mono">{moduleCounts.stories}</strong>
                    </div>
                  </div>

                  {backupSuccessMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{backupSuccessMsg}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadFullBackup}
                      disabled={isExportingBackup}
                      className="w-full min-h-[48px] h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isExportingBackup ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                      <span>تحميل النسخة الاحتياطية الآن (aldostour_full_backup.json) 📥</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Copy,
  Check,
  Phone,
  LifeBuoy,
  AlertTriangle,
  Layers,
  Award,
  FolderArchive,
  BookA,
  Sparkles,
  Settings,
  MessageSquare,
  BookOpen,
  BellRing,
  Users,
  UploadCloud,
  Lock,
} from 'lucide-react';
import {
  adminGetSecurityData,
  adminUpdateSecuritySettings,
  adminChangeSuperCredentials,
  adminUpdateVault,
  adminGenerateRecoveryCodes,
  adminManageSubAdmin,
  adminResetAllStudentPasswords,
} from '@/lib/apiClient';
import { hashSha256, logAdminSecurityEvent } from '@/lib/authUtils';
import { SubAdminUser, AdminSecurityLog, AdminSecuritySettings } from '@/types';

interface SecurityCenterManagerProps {
  onRefresh?: () => void;
}

// 5-second timeout helper to prevent infinite loading spinner
const fetchWithTimeout = async <T,>(queryPromise: PromiseLike<T>, ms = 5000): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout')), ms);
  });
  try {
    return await Promise.race([Promise.resolve(queryPromise), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
};

const ALL_TABS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'materials', label: 'المحاضرات والمذكرات', icon: <Layers className="w-4 h-4" /> },
  { id: 'covers', label: 'أغلفة المواد وفيديوهات المعاينة', icon: <FolderArchive className="w-4 h-4 text-amber-400" /> },
  { id: 'quizzes', label: 'الاختبارات والتكريم', icon: <Award className="w-4 h-4 text-emerald-400" /> },
  { id: 'students', label: 'سجل الطلاب والكارنيهات', icon: <Users className="w-4 h-4 text-blue-400" /> },
  { id: 'vault', label: 'خزنة بيانات الطلاب المشفرة', icon: <Lock className="w-4 h-4 text-purple-400" /> },
  { id: 'security', label: 'مركز الأمان وإدارة المشرفين', icon: <Shield className="w-4 h-4 text-rose-400" /> },
  { id: 'french', label: 'القاموس الفرنسي الصوتي', icon: <BookA className="w-4 h-4" /> },
  { id: 'themes', label: 'الثيمات والشخصيات التفاعلية', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
  { id: 'cms', label: 'الـ CMS والواتساب والتواصل', icon: <Settings className="w-4 h-4" /> },
  { id: 'requests', label: 'طلبات الطلاب', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'subjects', label: 'المواد الدراسية', icon: <BookOpen className="w-4 h-4 text-teal-400" /> },
  { id: 'news', label: 'الأخبار العاجلة', icon: <BellRing className="w-4 h-4 text-amber-400" /> },
  { id: 'countdown', label: 'عداد الامتحانات', icon: <Clock className="w-4 h-4" /> },
  { id: 'upload', label: 'رفع الملفات السريع', icon: <UploadCloud className="w-4 h-4" /> },
];

export function SecurityCenterManager({ onRefresh }: SecurityCenterManagerProps) {
  const [securitySettings, setSecuritySettings] = useState<AdminSecuritySettings | null>(null);
  const [subAdmins, setSubAdmins] = useState<SubAdminUser[]>([]);
  const [logs, setLogs] = useState<AdminSecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Super Admin Credentials Edit Modal
  const [isEditSuperAdminModalOpen, setIsEditSuperAdminModalOpen] = useState(false);
  const [newSuperUsername, setNewSuperUsername] = useState('');
  const [newSuperPassword, setNewSuperPassword] = useState('');
  const [newSuperPin, setNewSuperPin] = useState('');
  const [isSavingSuperCreds, setIsSavingSuperCreds] = useState(false);

  // Sub-Admin Create/Edit Modal
  const [isSubAdminModalOpen, setIsSubAdminModalOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdminUser | null>(null);
  const [subUsername, setSubUsername] = useState('');
  const [subPassword, setSubPassword] = useState('');
  const [subPin, setSubPin] = useState('');
  const [canManageStudents, setCanManageStudents] = useState(false);
  const [canManageContent, setCanManageContent] = useState(true);
  const [canDeleteContent, setCanDeleteContent] = useState(false);
  const [canAccessStudentVault, setCanAccessStudentVault] = useState(false);
  const [isSavingSubAdmin, setIsSavingSubAdmin] = useState(false);

  // WhatsApp Approval Number
  const [whatsappApprovalNumber, setWhatsappApprovalNumber] = useState('');
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);

  // Dynamic Secret Portals
  const [superAdminSlug, setSuperAdminSlug] = useState('command-mazen');
  const [superAdminKey, setSuperAdminKey] = useState('dustour2006');
  const [staffPortalSlug, setStaffPortalSlug] = useState('staff-portal');
  const [staffPortalKey, setStaffPortalKey] = useState('team2026');
  const [isSavingPortals, setIsSavingPortals] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState<string | null>(null);

  // Master Recovery Codes Modal
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [generatedPlainCodes, setGeneratedPlainCodes] = useState<string[]>([]);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Status Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Stable ref to onRefresh to avoid re-render loops
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  // Guard: only do the initial fetch once
  const hasFetchedRef = useRef(false);

  // Load Data with 5-second timeout fallback
  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial && hasFetchedRef.current) return;
    if (isInitial) hasFetchedRef.current = true;

    setIsLoading(true);
    try {
      const secRes = await adminGetSecurityData();
      if (secRes?.success && secRes?.securitySettings) {
        const s = secRes.securitySettings as AdminSecuritySettings;
        setSecuritySettings(s);
        setNewSuperUsername(s.admin_username || '');
        setWhatsappApprovalNumber(s.whatsapp_approval_number || '');
        setSuperAdminSlug(s.super_admin_slug || 'command-mazen');
        setSuperAdminKey(s.super_admin_key || 'dustour2006');
        setStaffPortalSlug(s.staff_portal_slug || 'staff-portal');
        setStaffPortalKey(s.staff_portal_key || 'team2026');
      } else if (secRes?.error) {
        setErrorMsg(secRes.error);
      }
      if (secRes?.subAdmins) {
        setSubAdmins(secRes.subAdmins as SubAdminUser[]);
      }
      if (secRes?.logs) {
        setLogs(secRes.logs as AdminSecurityLog[]);
      }
    } catch (err: any) {
      console.warn('Could not load security center data:', err);
      setErrorMsg(err?.message || 'فشل الاتصال بمركز الأمان');
    } finally {
      setIsLoading(false);
      onRefreshRef.current?.();
    }
  }, []); // stable — no deps that change between renders

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Toggle Tab in Staff Tab Matrix
  const handleToggleTabVisibility = async (tabId: string) => {
    if (!securitySettings) return;
    const currentTabs = securitySettings.staff_visible_tabs || {
      materials: true,
      quizzes: true,
      covers: true,
    };
    const nextState = !currentTabs[tabId];
    const updatedTabs = { ...currentTabs, [tabId]: nextState };

    try {
      await adminUpdateSecuritySettings({ staff_visible_tabs: updatedTabs });
      setSecuritySettings((prev) => (prev ? { ...prev, staff_visible_tabs: updatedTabs } : null));

      setSuccessMsg(`تم تحديث صلاحية وصول التبويب (${tabId}) بنجاح!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrorMsg('فشل تحديث صلاحية التبويب');
    }
  };

  // Toggle Manual Student Approval
  const handleToggleManualApproval = async () => {
    const currentVal = Boolean(
      securitySettings?.manual_approval_enabled || securitySettings?.require_student_approval
    );
    const nextVal = !currentVal;

    // Optimistic UI update
    setSecuritySettings((prev) =>
      prev
        ? { ...prev, manual_approval_enabled: nextVal, require_student_approval: nextVal }
        : ({
            id: 1,
            admin_username: 'Dr. Mazen 2006',
            vault_enabled: true,
            session_version: 1,
            manual_approval_enabled: nextVal,
            require_student_approval: nextVal,
            registration_paused: false,
            platform_lockdown: false,
          } as any)
    );

    try {
      const res = await adminUpdateSecuritySettings({
        manual_approval_enabled: nextVal,
        require_student_approval: nextVal,
      });

      if (!res?.success) throw new Error(res?.error || 'فشل تحديث إعداد مراجعة واعتماد الطلاب');

      setSuccessMsg(
        `تم ${nextVal ? 'تفعيل نظام مراجعة واعتماد الطلاب ⏳' : 'تفعيل التسجيل المباشر التلقائي ✅'} بنجاح!`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setSecuritySettings((prev) =>
        prev ? { ...prev, manual_approval_enabled: currentVal, require_student_approval: currentVal } : null
      );
      setErrorMsg(err?.message || 'فشل تحديث إعداد مراجعة واعتماد الطلاب');
    }
  };

  // Toggle Registration Paused
  const handleToggleRegistrationPaused = async () => {
    const currentVal = Boolean(securitySettings?.registration_paused);
    const nextVal = !currentVal;

    // Optimistic UI update
    setSecuritySettings((prev) =>
      prev
        ? { ...prev, registration_paused: nextVal }
        : ({
            id: 1,
            admin_username: 'Dr. Mazen 2006',
            vault_enabled: true,
            session_version: 1,
            manual_approval_enabled: false,
            registration_paused: nextVal,
            platform_lockdown: false,
          } as any)
    );

    try {
      const res = await adminUpdateSecuritySettings({ registration_paused: nextVal });
      if (!res?.success) throw new Error(res?.error || 'فشل تحديث حالة التسجيل');

      setSuccessMsg(`تم ${nextVal ? 'إيقاف التسجيل مؤقتاً ⏸️' : 'فتح التسجيل للطلاب ✅'} بنجاح!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setSecuritySettings((prev) => (prev ? { ...prev, registration_paused: currentVal } : null));
      setErrorMsg(err?.message || 'فشل تحديث حالة التسجيل');
    }
  };

  // Toggle Platform Lockdown / Maintenance Mode
  const handleTogglePlatformLockdown = async () => {
    const currentVal = Boolean(
      securitySettings?.platform_lockdown ||
        securitySettings?.platform_locked ||
        securitySettings?.maintenance_mode
    );
    const nextVal = !currentVal;
    if (nextVal) {
      const confirmLock = confirm(
        'هل أنت متأكد من تفعيل وضع قفل المنصة الشامل (صيانة طارئة)؟ سيتم منع الطلاب والزوار من الوصول للدروس.'
      );
      if (!confirmLock) return;
    }

    // Optimistic UI update
    setSecuritySettings((prev) =>
      prev
        ? {
            ...prev,
            platform_lockdown: nextVal,
            platform_locked: nextVal,
            maintenance_mode: nextVal,
          }
        : ({
            id: 1,
            admin_username: 'Dr. Mazen 2006',
            vault_enabled: true,
            session_version: 1,
            manual_approval_enabled: false,
            registration_paused: false,
            platform_lockdown: nextVal,
            platform_locked: nextVal,
            maintenance_mode: nextVal,
          } as any)
    );

    try {
      const res = await adminUpdateSecuritySettings({
        platform_lockdown: nextVal,
        platform_locked: nextVal,
        maintenance_mode: nextVal,
      });

      if (!res?.success) throw new Error(res?.error || 'فشل تحديث وضع القفل');

      setSuccessMsg(`تم ${nextVal ? 'تفعيل قفل المنصة الشامل 🔒' : 'إلغاء قفل المنصة وإعادتها للعمل 🟢'} بنجاح!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setSecuritySettings((prev) =>
        prev
          ? {
              ...prev,
              platform_lockdown: currentVal,
              platform_locked: currentVal,
              maintenance_mode: currentVal,
            }
          : null
      );
      setErrorMsg(err?.message || 'فشل تحديث وضع القفل');
    }
  };

  // Central Emergency Panic Logout
  const handleCentralEmergencyPanic = async () => {
    if (!securitySettings) return;
    const conf = confirm(
      'تحذير أمني شديد: سيتم إنهاء كافة جلسات المشرفين والطلاب النشطة حالياً فوراً وإلغاء صلاحيتها عبر زيادة إصدار الجلسة. هل تود المتابعة؟'
    );
    if (!conf) return;

    try {
      await adminUpdateSecuritySettings({
        session_version: (securitySettings.session_version || 1) + 1,
      });

      alert('تم إنهاء كافة الجلسات النشطة في المنصة بنجاح!');
      loadData();
    } catch {
      setErrorMsg('فشل تنفيذ إغلاق الطوارئ');
    }
  };

  // Emergency: Reset All Student Passwords to Unified Password (AlDustour@2006@999#111#111)
  const [isResettingAllPasswords, setIsResettingAllPasswords] = useState(false);
  const handleResetAllStudentPasswords = async () => {
    const conf = confirm(
      '⚠️ تحذير أمني عاجل وفائق الحساسية ⚠️\n\n' +
      'هل أنت متأكد تماماً من رغبتك في إعادة ضبط كلمات مرور كافة الطلاب المسجلين بالمنصة فورياً للباسورد الموحد:\n' +
      'AlDustour@2006@999#111#111\n\n' +
      '• سيتم إبطال كافة الجلسات السابقة للطلاب فوراً.\n' +
      '• عند تسجيل أي طالب دخوله سيتم قفل المنصة أمامه وإلزامه بتعيين كلمة مرور شخصية قوية (8 خانات كحد أدنى) قبل السماح له بالوصول لأي محتوى.\n\n' +
      'هل تود المتابعة والتنفيذ الآن؟'
    );
    if (!conf) return;

    setIsResettingAllPasswords(true);
    try {
      const res = await adminResetAllStudentPasswords();
      if (res.success) {
        alert(
          `✅ تم بنجاح تصفير وإعادة تعيين كلمات مرور كافة الطلاب (${res.resetCount} طالب) إلى الباسورد الموحد:\n` +
          `${res.unifiedPassword}\n\n` +
          'تم تفعيل وضع التحديث الإلزامي لكلمة المرور لكافة الحسابات بنجاح!'
        );
        loadData();
      } else {
        alert('فشل إعادة تعيين كلمات المرور: ' + (res.error || 'خطأ غير متوقع'));
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء تنفيذ العملية: ' + err.message);
    } finally {
      setIsResettingAllPasswords(false);
    }
  };

  // Save WhatsApp Approval Number
  const handleSaveWhatsAppApprovalNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsApp(true);
    try {
      const cleanPhone = whatsappApprovalNumber.replace(/\D/g, '');
      await adminUpdateSecuritySettings({ whatsapp_approval_number: cleanPhone });

      setSecuritySettings((prev) => (prev ? { ...prev, whatsapp_approval_number: cleanPhone } : null));
      setSuccessMsg('تم حفظ رقم واتساب اعتماد طلبات الطلاب بنجاح! 📱');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('فشل حفظ رقم الواتساب');
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  // Save Dynamic Portal Slugs & Keys
  const handleSavePortals = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPortals(true);
    try {
      const cleanSuperSlug = superAdminSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      const cleanSuperKey = superAdminKey.trim();
      const cleanStaffSlug = staffPortalSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      const cleanStaffKey = staffPortalKey.trim();

      if (!cleanSuperSlug || !cleanSuperKey || !cleanStaffSlug || !cleanStaffKey) {
        setErrorMsg('يرجى ملء كافة مسارات ومفاتيح البوابات');
        setIsSavingPortals(false);
        return;
      }

      await adminUpdateSecuritySettings({
        super_admin_slug: cleanSuperSlug,
        super_admin_key: cleanSuperKey,
        staff_portal_slug: cleanStaffSlug,
        staff_portal_key: cleanStaffKey,
      });

      setSecuritySettings((prev) =>
        prev
          ? {
              ...prev,
              super_admin_slug: cleanSuperSlug,
              super_admin_key: cleanSuperKey,
              staff_portal_slug: cleanStaffSlug,
              staff_portal_key: cleanStaffKey,
            }
          : null
      );

      setSuccessMsg('تم حفظ وتحديث مسارات البوابات السرية بنجاح! 🔐');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('فشل حفظ مسارات البوابات');
    } finally {
      setIsSavingPortals(false);
    }
  };

  // Generate 5 Master Recovery Codes
  const handleGenerateRecoveryCodes = async () => {
    const conf = confirm(
      'سيتم توليد 5 أكواد استرداد رئيسية جديدة (One-Time) وإلغاء أي أكواد قديمة متبقية. هل تود المتابعة؟'
    );
    if (!conf) return;

    setIsGeneratingCodes(true);
    try {
      const res = await adminGenerateRecoveryCodes();
      if (res.success && res.rawCodes) {
        setGeneratedPlainCodes(res.rawCodes);
        setIsRecoveryModalOpen(true);
        setCopiedCodes(false);
        loadData();
      } else {
        setErrorMsg('فشل توليد أكواد الاسترداد');
      }
    } catch {
      setErrorMsg('فشل توليد أكواد الاسترداد');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPortal(id);
    setTimeout(() => setCopiedPortal(null), 2500);
  };

  // Save Super Admin Credentials
  const handleSaveSuperAdminCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuperUsername.trim()) return;
    setIsSavingSuperCreds(true);
    setErrorMsg('');

    try {
      if (newSuperPin.trim() && !/^\d{6}$/.test(newSuperPin.trim())) {
        setErrorMsg('رمز الأمان السداسي (PIN) يجب أن يتكون من 6 أرقام بالضبط');
        setIsSavingSuperCreds(false);
        return;
      }

      await adminChangeSuperCredentials(
        newSuperPassword.trim() || undefined,
        newSuperPin.trim() || undefined
      );

      if (newSuperUsername.trim() !== securitySettings?.admin_username) {
        await adminUpdateSecuritySettings({ admin_username: newSuperUsername.trim() });
      }

      setSuccessMsg('تم تحديث بيانات اعتماد المشرف العام بنجاح!');
      setIsEditSuperAdminModalOpen(false);
      setNewSuperPassword('');
      setNewSuperPin('');
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حفظ بيانات الاعتماد');
    } finally {
      setIsSavingSuperCreds(false);
    }
  };

  // Open Sub-Admin Create/Edit Modal
  const handleOpenSubAdminModal = (user?: SubAdminUser) => {
    if (user) {
      setEditingSubAdmin(user);
      setSubUsername(user.username);
      setSubPassword('');
      setSubPin('');
      setCanManageStudents(user.can_manage_students);
      setCanManageContent(user.can_manage_content);
      setCanDeleteContent(user.can_delete_content);
      setCanAccessStudentVault(user.can_access_student_vault);
    } else {
      setEditingSubAdmin(null);
      setSubUsername('');
      setSubPassword('');
      setSubPin('');
      setCanManageStudents(false);
      setCanManageContent(true);
      setCanDeleteContent(false);
      setCanAccessStudentVault(false);
    }
    setIsSubAdminModalOpen(true);
  };

  // Save Sub-Admin
  const handleSaveSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subUsername.trim()) return;
    setIsSavingSubAdmin(true);

    try {
      if (subPin.trim() && !/^\d{6}$/.test(subPin.trim())) {
        setErrorMsg('رمز الـ PIN للمشرف يجب أن يتكون من 6 أرقام');
        setIsSavingSubAdmin(false);
        return;
      }

      if (editingSubAdmin) {
        const res = await adminManageSubAdmin('update', {
          id: editingSubAdmin.id,
          username: subUsername.trim(),
          password: subPassword.trim() || undefined,
          pin: subPin.trim() || undefined,
          can_manage_students: canManageStudents,
          can_manage_content: canManageContent,
          can_delete_content: canDeleteContent,
          can_access_student_vault: canAccessStudentVault,
        });
        if (!res.success) throw new Error(res.error || 'فشل تحديث بيانات المشرف');
        setSuccessMsg(`تم تحديث بيانات المشرف (${subUsername.trim()}) بنجاح!`);
      } else {
        if (!subPassword.trim() || !subPin.trim()) {
          setErrorMsg('كلمة المرور ورمز الـ PIN مطلوبان للمشرف الجديد');
          setIsSavingSubAdmin(false);
          return;
        }
        const res = await adminManageSubAdmin('create', {
          username: subUsername.trim(),
          password: subPassword.trim(),
          pin: subPin.trim(),
          can_manage_students: canManageStudents,
          can_manage_content: canManageContent,
          can_delete_content: canDeleteContent,
          can_access_student_vault: canAccessStudentVault,
        });
        if (!res.success) throw new Error(res.error || 'فشل إنشاء حساب المشرف');
        setSuccessMsg(`تم إنشاء حساب المشرف (${subUsername.trim()}) بنجاح!`);
      }

      setIsSubAdminModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حفظ المشرف');
    } finally {
      setIsSavingSubAdmin(false);
    }
  };

  // Delete Sub-Admin
  const handleDeleteSubAdmin = async (admin: SubAdminUser) => {
    const conf = confirm(`هل أنت متأكد من حذف حساب المشرف (${admin.username}) نهائياً؟`);
    if (!conf) return;

    try {
      const res = await adminManageSubAdmin('delete', { id: admin.id });
      if (!res.success) throw new Error(res.error || 'فشل حذف المشرف');
      setSuccessMsg(`تم حذف المشرف (${admin.username}) بنجاح`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حذف المشرف');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
        <p className="text-sm font-bold">جاري تحميل إعدادات الحماية المركزية والمشرفين...</p>
      </div>
    );
  }

  const staffTabs = securitySettings?.staff_visible_tabs || {
    materials: true,
    quizzes: true,
    covers: true,
  };

  return (
    <div className="space-y-8 select-none" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOP EMERGENCY SWITCHES BAR */}
      <div className="p-5 rounded-3xl bg-slate-900/95 border border-amber-500/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">مفاتيح الطوارئ والإغلاق المركزي الفوري</h3>
              <p className="text-[11px] text-slate-400">التحكم في تسجيل الطلاب، القفل الشامل، والجلسات النشطة</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold">
            الإصدار المركزي: v{securitySettings?.session_version || 1}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Switch 1: Pause Registration */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-white mb-0.5">إيقاف التسجيل المؤقت</span>
              <span className="text-[10px] text-slate-400">منع حسابات جديدة</span>
            </div>
            <button
              onClick={handleToggleRegistrationPaused}
              className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                securitySettings?.registration_paused
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {securitySettings?.registration_paused ? (
                <>
                  <ToggleRight className="w-5 h-5 text-rose-400" />
                  <span>مُعلق ⏸️</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                  <span>متاح ✅</span>
                </>
              )}
            </button>
          </div>

          {/* Switch 2: Platform Lockdown */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-white mb-0.5">وضع قفل المنصة</span>
              <span className="text-[10px] text-slate-400">قفل المحاضرات للطوارئ</span>
            </div>
            <button
              onClick={handleTogglePlatformLockdown}
              className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                securitySettings?.platform_lockdown ||
                securitySettings?.platform_locked ||
                securitySettings?.maintenance_mode
                  ? 'bg-red-600/20 border-red-500/50 text-red-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {securitySettings?.platform_lockdown ||
              securitySettings?.platform_locked ||
              securitySettings?.maintenance_mode ? (
                <>
                  <ToggleRight className="w-5 h-5 text-red-400" />
                  <span>مُقفل 🔒</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                  <span>عادي 🟢</span>
                </>
              )}
            </button>
          </div>

          {/* Switch 3: Manual Student Approval */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-white mb-0.5">نظام مراجعة واعتماد الطلاب</span>
              <span className="text-[10px] text-slate-400">مراجعة يدوية للطلبة الجدد</span>
            </div>
            <button
              onClick={handleToggleManualApproval}
              className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                securitySettings?.manual_approval_enabled || securitySettings?.require_student_approval
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {securitySettings?.manual_approval_enabled || securitySettings?.require_student_approval ? (
                <>
                  <ToggleRight className="w-5 h-5 text-amber-400" />
                  <span>يدوي ⏳</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                  <span>تلقائي 🟢</span>
                </>
              )}
            </button>
          </div>

          {/* Switch 4: Central Panic Terminate */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-white mb-0.5">إغلاق الطوارئ المركزي</span>
              <span className="text-[10px] text-slate-400">إنهاء كافة الجلسات النشطة</span>
            </div>
            <button
              onClick={handleCentralEmergencyPanic}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              طرد فوري 🚨
            </button>
          </div>

          {/* Switch 5: Emergency Reset All Student Passwords */}
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/40 flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-black text-amber-400">إعادة تعيين جماعية لكلمات مرور الطلاب</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                  AlDustour@2006@999#111#111
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                يقوم بتصفير كلمات المرور لكافة حسابات الطلاب وإلزامهم فورياً بتعيين كلمة سر جديدة وشخصية عند الدخول.
              </span>
            </div>
            <button
              onClick={handleResetAllStudentPasswords}
              disabled={isResettingAllPasswords}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-2"
            >
              {isResettingAllPasswords ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التصفير...</span>
                </>
              ) : (
                <span>تصفير كلمات المرور للباسورد الموحد 🔐</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TOP CARDS: Super Admin & Global Security Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Super Admin Status Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">المشرف العام (Super Admin)</h3>
                  <span className="text-xs text-amber-400 font-mono">
                    {securitySettings?.admin_username || 'Dr. Mazen 2006'}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                حماية 3FA مفعلة ✅
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              يمتلك المشرف العام الصلاحية الحصرية لإدارة المشرفين، تعديل الحماية، والوصول إلى كافة سجلات الأمان وخزائن البيانات.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              إصدار الجلسة: v{securitySettings?.session_version || 1}
            </span>
            <button
              onClick={() => setIsEditSuperAdminModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            >
              تعديل بيانات الدخول والـ PIN ⚙️
            </button>
          </div>
        </div>

        {/* Manual Approval Workflow Toggle Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">نظام مراجعة واعتماد الطلاب</h3>
                  <span className="text-xs text-slate-400">Manual Student Approval</span>
                </div>
              </div>

              <button
                onClick={handleToggleManualApproval}
                className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  securitySettings?.manual_approval_enabled
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {securitySettings?.manual_approval_enabled ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-amber-400" />
                    <span>مفعل (يدوي)</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                    <span>تلقائي (مباشر)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              عند تفعيل هذا الخيار، لن يتمكن أي طالب جديد من استخدام المنصة فور تسجيله حتى يقوم المشرف بمراجعته والضغط على <strong className="text-emerald-400">«اعتماد وتفعيل ✅»</strong> من سجل الطلاب.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">حالة التسجيل للطلبة الجدد:</span>
            <span className={`font-bold ${securitySettings?.manual_approval_enabled ? 'text-amber-400' : 'text-emerald-400'}`}>
              {securitySettings?.manual_approval_enabled ? 'قيد المراجعة اليدوية (Pending)' : 'تفعيل فوري بعد التسجيل (Instant)'}
            </span>
          </div>
        </div>
      </div>

      {/* PINK TAB VISIBILITY MATRIX */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span className="text-[#EC4899] font-black text-base">✅</span>
              <span>مصفوفة صلاحيات تبويبات المشرفين الفرعيين (Staff Tab Matrix)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              حدد بنقرة واحدة التبويبات المسموح للمشرفين الفرعيين بالاطلاع عليها أو حجبها عنهم.
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-pink-500/10 border border-pink-500/30 text-[#EC4899] font-bold text-xs">
            العلامة الوردية (#EC4899) = متاح للمشرفين
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {ALL_TABS.map((tab) => {
            const isVisible = Boolean(staffTabs[tab.id]);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleToggleTabVisibility(tab.id)}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer active:scale-95 ${
                  isVisible
                    ? 'bg-pink-500/10 border-pink-500/40 text-pink-300 shadow-sm shadow-pink-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0">{tab.icon}</span>
                  <span className="text-xs font-bold text-white">{tab.label}</span>
                </div>

                <div className="shrink-0">
                  {isVisible ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-pink-500/20 text-[#EC4899] font-black text-sm">
                      ✅
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-800 text-slate-500 font-bold text-sm">
                      ❌
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* WHATSAPP APPROVAL NUMBER & RECOVERY CODES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WhatsApp Approval Number */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">رقم واتساب اعتماد الطلبة 📱</h3>
                <span className="text-xs text-slate-400">WhatsApp Approval Number</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              الرقم المخصص لاستلام رسائل الطلاب التلقائية لاعتماد حساباتهم وتفعيل الكارنيهات بعد التسجيل مباشرة.
            </p>

            <form onSubmit={handleSaveWhatsAppApprovalNumber} className="space-y-3">
              <input
                type="text"
                value={whatsappApprovalNumber}
                onChange={(e) => setWhatsappApprovalNumber(e.target.value)}
                placeholder="مثال: 201000000000 أو 01012345678"
                dir="ltr"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-emerald-400 font-mono font-bold text-sm outline-none text-right"
              />
              <button
                type="submit"
                disabled={isSavingWhatsApp}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSavingWhatsApp ? 'جارٍ الحفظ...' : 'حفظ رقم واتساب الاعتماد 💾'}
              </button>
            </form>
          </div>
        </div>

        {/* 5 Master Recovery Codes */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">أكواد الاسترداد الرئيسية للطوارئ (One-Time)</h3>
                  <span className="text-xs text-slate-400">5 Master Recovery Codes</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                المتبقي: {Array.isArray(securitySettings?.recovery_code_hashes) ? securitySettings.recovery_code_hashes.length : 0} / 5
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              5 أكواد طوارئ أحادية الاستخدام تتيح للمشرف العام تجاوز كلمة المرور والـ PIN فورياً في حالات فقدان الوصول.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGenerateRecoveryCodes}
              disabled={isGeneratingCodes}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGeneratingCodes ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>توليد 5 أكواد استرداد رئيسية جديدة (SHA-256) 🔑</span>
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC SECRET PORTALS EDITOR */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>إدارة البوابات السرية المشفرة والمفاتيح الديناميكية (Dynamic Portals)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              تغيير مسار ومفتاح بوابة المشرف العام وبوابة فريق العمل لإخفاء لوحة التحكم عن الأنظار تماماً
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePortals} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Super Admin Portal */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <span className="block text-xs font-bold text-amber-400">1. بوابة المشرف العام (Super Admin Portal)</span>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">مسار البوابة (Slug):</label>
                <input
                  type="text"
                  value={superAdminSlug}
                  onChange={(e) => setSuperAdminSlug(e.target.value)}
                  placeholder="command-mazen"
                  dir="ltr"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">مفتاح الدخول (Security Key):</label>
                <input
                  type="text"
                  value={superAdminKey}
                  onChange={(e) => setSuperAdminKey(e.target.value)}
                  placeholder="dustour2006"
                  dir="ltr"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                />
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono" dir="ltr">
                  /{superAdminSlug}?key={superAdminKey}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(`/${superAdminSlug}?key=${superAdminKey}`, 'super')}
                  className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedPortal === 'super' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>نسخ الرابط</span>
                </button>
              </div>
            </div>

            {/* Staff Portal */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <span className="block text-xs font-bold text-blue-400">2. بوابة فريق العمل (Staff Portal)</span>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">مسار البوابة (Slug):</label>
                <input
                  type="text"
                  value={staffPortalSlug}
                  onChange={(e) => setStaffPortalSlug(e.target.value)}
                  placeholder="staff-portal"
                  dir="ltr"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">مفتاح الدخول (Security Key):</label>
                <input
                  type="text"
                  value={staffPortalKey}
                  onChange={(e) => setStaffPortalKey(e.target.value)}
                  placeholder="team2026"
                  dir="ltr"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                />
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono" dir="ltr">
                  /{staffPortalSlug}?key={staffPortalKey}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(`/${staffPortalSlug}?key=${staffPortalKey}`, 'staff')}
                  className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedPortal === 'staff' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>نسخ الرابط</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingPortals}
            className="w-full sm:w-auto px-6 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSavingPortals ? 'جارٍ الحفظ...' : 'حفظ مسارات ومفاتيح البوابات السرية 🔐'}
          </button>
        </form>
      </div>

      {/* SUB-ADMINS DIRECTORY & PERMISSIONS */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>إدارة المشرفين والصلاحيات الفرعية (Sub-Admins)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              تحديد صلاحيات وصول المشرفين المساعدين (المحاضرات، الطلاب، حذف المحتوى، خزنة البيانات)
            </p>
          </div>

          <button
            onClick={() => handleOpenSubAdminModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مشرف جديد ➕</span>
          </button>
        </div>

        {subAdmins.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            لا يوجد مشرفين فرعيين حالياً. يمكنك إضافة مشرف وتعيين صلاحياته المخصصة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-3 px-3">اسم المشرف</th>
                  <th className="py-3 px-3">إدارة الطلاب</th>
                  <th className="py-3 px-3">رفع المحتوى</th>
                  <th className="py-3 px-3">حذف المحتوى</th>
                  <th className="py-3 px-3">خزنة البيانات</th>
                  <th className="py-3 px-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <span>{admin.username}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${admin.can_manage_students ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {admin.can_manage_students ? 'مسموح ✅' : 'محجوب ❌'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${admin.can_manage_content ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {admin.can_manage_content ? 'مسموح ✅' : 'محجوب ❌'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${admin.can_delete_content ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>
                        {admin.can_delete_content ? 'مسموح ⚠️' : 'محجوب ❌'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${admin.can_access_student_vault ? 'bg-purple-500/15 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                        {admin.can_access_student_vault ? 'مسموح 🔑' : 'محجوب 🔒'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenSubAdminModal(admin)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="تعديل الصلاحيات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubAdmin(admin)}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-colors"
                          title="حذف المشرف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECURITY FORENSIC LOGS */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>سجل الحماية والنشاط الجنائي (Security Audit Logs)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              توثيق لكافة محاولات الدخول، التعديلات الأمنية، والعمليات الحساسة
            </p>
          </div>

          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>تحديث السجل</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">لا توجد سجلات أمان مسجلة حالياً</div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">نوع الحدث</th>
                  <th className="py-2.5 px-3">المستخدم المستهدف</th>
                  <th className="py-2.5 px-3">التفاصيل</th>
                  <th className="py-2.5 px-3">عنوان IP</th>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {logs.map((log) => {
                  const isFail = log.event_type.includes('fail') || log.event_type.includes('lockout');
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isFail
                              ? 'bg-rose-500/15 text-rose-400'
                              : log.event_type.includes('recovery')
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-200">{log.username || 'غير محدد'}</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">{log.details || '—'}</td>
                      <td className="py-2 px-3 text-slate-400">{log.ip_address || 'محمي (دخول معتمد)'}</td>
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ar-EG')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: EDIT SUPER ADMIN CREDENTIALS */}
      {isEditSuperAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" dir="rtl">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>تعديل بيانات اعتماد المشرف العام</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              تغيير اسم المستخدم، كلمة المرور المشفرة ورمز الـ PIN السداسي للمشرف الرئيسي.
            </p>

            <form onSubmit={handleSaveSuperAdminCreds} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المشرف العام:</label>
                <input
                  type="text"
                  value={newSuperUsername}
                  onChange={(e) => setNewSuperUsername(e.target.value)}
                  placeholder="اسم المشرف العام..."
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  كلمة المرور الجديدة (اتركها فارغة إذا لم ترغب في التغيير):
                </label>
                <input
                  type="password"
                  value={newSuperPassword}
                  onChange={(e) => setNewSuperPassword(e.target.value)}
                  placeholder="كلمة مرور جديدة قوية..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رمز الأمان السداسي PIN الجديد (6 أرقام - اتركه فارغاً إن لم ترغب في التغيير):
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newSuperPin}
                  onChange={(e) => setNewSuperPin(e.target.value)}
                  placeholder="6 أرقام مثل 202600..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-amber-400 text-center font-mono font-bold text-base outline-none tracking-widest"
                />
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditSuperAdminModalOpen(false)}
                  disabled={isSavingSuperCreds}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingSuperCreds || !newSuperUsername.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isSavingSuperCreds ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ التعديلات ✅</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT SUB-ADMIN */}
      {isSubAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" dir="rtl">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
              <UserPlus className="w-5 h-5 text-amber-400" />
              <span>{editingSubAdmin ? 'تعديل بيانات المشرف وصلاحياته' : 'إضافة مشرف فرعي جديد'}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              حدد اسم المشرف وكلمة مروره وكود الـ PIN بالإضافة إلى صلاحيات الوصول الممنوحة له.
            </p>

            <form onSubmit={handleSaveSubAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المشرف:</label>
                <input
                  type="text"
                  value={subUsername}
                  onChange={(e) => setSubUsername(e.target.value)}
                  placeholder="مثال: د. أحمد فؤاد..."
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editingSubAdmin ? 'كلمة المرور (اتركها فارغة للإبقاء على الحالية):' : 'كلمة المرور:'}
                </label>
                <input
                  type="password"
                  value={subPassword}
                  onChange={(e) => setSubPassword(e.target.value)}
                  placeholder="كلمة مرور قوية..."
                  required={!editingSubAdmin}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editingSubAdmin ? 'رمز الـ PIN السداسي (اتركه فارغاً للإبقاء على الحالي):' : 'رمز الـ PIN السداسي (6 أرقام):'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={subPin}
                  onChange={(e) => setSubPin(e.target.value)}
                  placeholder="6 أرقام..."
                  required={!editingSubAdmin}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-amber-400 text-center font-mono font-bold text-base outline-none tracking-widest"
                />
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="block text-xs font-bold text-amber-400 mb-2">صلاحيات المشرف:</span>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageContent}
                    onChange={(e) => setCanManageContent(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span>رفع وإدارة المحاضرات والملخصات والأغلفة</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDeleteContent}
                    onChange={(e) => setCanDeleteContent(e.target.checked)}
                    className="rounded border-slate-700 text-red-500 focus:ring-0"
                  />
                  <span className="text-red-300">صلاحية حذف المحاضرات والمذكرات</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageStudents}
                    onChange={(e) => setCanManageStudents(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>عرض وتعديل واعتماد حسابات الطلاب</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canAccessStudentVault}
                    onChange={(e) => setCanAccessStudentVault(e.target.checked)}
                    className="rounded border-slate-700 text-purple-500 focus:ring-0"
                  />
                  <span className="text-purple-300">صلاحية فتح خزنة بيانات الطلاب المشفرة</span>
                </label>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubAdminModalOpen(false)}
                  disabled={isSavingSubAdmin}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingSubAdmin || !subUsername.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isSavingSubAdmin ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <span>{editingSubAdmin ? 'حفظ التعديلات' : 'إضافة المشرف'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MASTER RECOVERY CODES DISPLAY */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md" dir="rtl">
          <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl text-right space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <LifeBuoy className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">أكواد الاسترداد الرئيسية للطوارئ (One-Time)</h3>
                <span className="text-xs text-amber-400 font-mono">5 Master Recovery Codes</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>
                <strong>تنبيه هام جداً:</strong> هذه الأكواد تظهر <strong>لمرة واحدة فقط الآن</strong>! يرجى نسخها وحفظها في مكان آمن فوراً. يُستخدم كل كود مرة واحدة للدخول المباشر عند نسيان كلمة المرور أو تعطل الـ PIN.
              </span>
            </div>

            <div className="space-y-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 font-mono text-center" dir="ltr">
              {generatedPlainCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="py-2 px-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-amber-400 text-sm font-bold tracking-wider flex items-center justify-between"
                >
                  <span className="text-slate-500 text-xs">#{idx + 1}</span>
                  <span className="text-white selection:bg-amber-500/30">{code}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">صالح لمرة واحدة</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPlainCodes.join('\n'));
                  setCopiedCodes(true);
                  setTimeout(() => setCopiedCodes(false), 3000);
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                {copiedCodes ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCodes ? 'تم نسخ كافة الأكواد الخمسة بنجاح!' : 'نسخ كافة الأكواد 📋'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRecoveryModalOpen(false)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

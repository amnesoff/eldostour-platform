'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  Search,
  KeyRound,
  Trash2,
  Copy,
  CheckCircle2,
  Download,
  RefreshCw,
  GraduationCap,
  ShieldAlert,
  X,
  Mail,
  Calendar,
  Lock,
  Unlock,
  Edit3,
  MessageCircle,
  Crown,
  ShieldCheck,
  Check,
  Clock,
  Shield,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Flame,
  Smartphone,
  Ban,
  BadgeCheck,
} from 'lucide-react';
import {
  adminGetStudents,
  adminUpdateStudent,
  adminDeleteStudent,
  adminBulkApproveStudents,
  adminGetSecurityData,
  adminUpdateVault,
  adminUnlockVault,
} from '@/lib/apiClient';
import { Student, AcademicYearId, StudentGender, AdminSession, AdminSecuritySettings } from '@/types';
import { ACADEMIC_YEARS } from '@/lib/constants';
import {
  hashPassword,
  hashSha256,
  validateVaultNumericPassword,
  validateVaultComplexPassword,
  logAdminSecurityEvent,
  maskPhoneNumber,
  maskEmail,
} from '@/lib/authUtils';

interface StudentsDirectoryProps {
  adminSession?: AdminSession | null;
}

export function StudentsDirectory({ adminSession }: StudentsDirectoryProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<AcademicYearId | 0>(0);
  const [selectedGender, setSelectedGender] = useState<StudentGender | 'all'>('all');
  const [selectedAccountType, setSelectedAccountType] = useState<'all' | 'approved' | 'pending' | 'guests'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Partial text masking & photo blur toggles
  const [revealedRows, setRevealedRows] = useState<Set<string>>(new Set());
  const [revealedPhotos, setRevealedPhotos] = useState<Set<string>>(new Set());
  const [showActiveRadar, setShowActiveRadar] = useState(false);

  // Security & Vault State
  const [vaultSettings, setVaultSettings] = useState<AdminSecuritySettings | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [isConfiguringVault, setIsConfiguringVault] = useState(false);
  const [vaultUnlockPassword1, setVaultUnlockPassword1] = useState('');
  const [vaultUnlockPassword2, setVaultUnlockPassword2] = useState('');
  const [showUnlockPass1, setShowUnlockPass1] = useState(false);
  const [showUnlockPass2, setShowUnlockPass2] = useState(false);
  const [vaultUnlockError, setVaultUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Vault Setup Modal State
  const [setupNumericPassword, setSetupNumericPassword] = useState('');
  const [setupComplexPassword, setSetupComplexPassword] = useState('');
  const [setupConfirmNumeric, setSetupConfirmNumeric] = useState('');
  const [setupConfirmComplex, setSetupConfirmComplex] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [isSavingVaultSetup, setIsSavingVaultSetup] = useState(false);

  // Password Reset Modal State
  const [resetModalStudent, setResetModalStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Edit VIP Student ID Modal State
  const [editCodeStudent, setEditCodeStudent] = useState<Student | null>(null);
  const [customStudentCode, setCustomStudentCode] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Delete & Approve States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Permissions helper
  const canManageStudents =
    !adminSession || adminSession.is_super_admin || adminSession.permissions?.can_manage_students;
  const canAccessVault =
    !adminSession || adminSession.is_super_admin || adminSession.permissions?.can_access_student_vault;

  // Inactivity auto-lock timer ref (10 minutes)
  const lastVaultActivityRef = useRef<number>(Date.now());

  // Check vault configuration safely from server API
  const loadVaultSettings = useCallback(async () => {
    try {
      const res = await adminGetSecurityData();
      if (res?.securitySettings) {
        setVaultSettings(res.securitySettings as AdminSecuritySettings);
      }
    } catch (err) {
      console.warn('Failed to load vault security settings:', err);
    }
  }, []);

  // Fetch Students safely via server API
  const fetchStudents = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    setErrorMsg('');
    try {
      const res = await adminGetStudents();
      if (res?.success && Array.isArray(res?.students)) {
        setStudents(res.students as Student[]);
      } else {
        const error =
          res?.error || 'فشل تحميل بيانات الطلاب من الخادم. يرجى التأكد من تسجيل الدخول كمسؤول.';
        console.error('Failed to load students:', error);
        setErrorMsg(error);
      }
    } catch (err: any) {
      console.error('Failed to load students exception:', err);
      setErrorMsg(err?.message || 'خطأ في الاتصال بالخادم الأمني');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initialize and check sessionStorage for existing vault unlock
  useEffect(() => {
    fetchStudents();
    loadVaultSettings();

    const storedUnlocked = sessionStorage.getItem('eldostour_vault_unlocked');
    const storedUnlockTime = parseInt(sessionStorage.getItem('eldostour_vault_unlock_time') || '0', 10);
    const tenMinutes = 10 * 60 * 1000;

    if (storedUnlocked === 'true' && Date.now() - storedUnlockTime < tenMinutes) {
      setIsVaultUnlocked(true);
      lastVaultActivityRef.current = Date.now();
    } else {
      setIsVaultUnlocked(false);
      sessionStorage.removeItem('eldostour_vault_unlocked');
      sessionStorage.removeItem('eldostour_vault_unlock_time');
    }
  }, [fetchStudents, loadVaultSettings]);

  // 10-Minute Auto-Lock Activity Tracker
  useEffect(() => {
    if (!isVaultUnlocked) return;

    const recordVaultActivity = () => {
      lastVaultActivityRef.current = Date.now();
      sessionStorage.setItem('eldostour_vault_unlock_time', Date.now().toString());
    };

    window.addEventListener('mousemove', recordVaultActivity);
    window.addEventListener('keydown', recordVaultActivity);
    window.addEventListener('click', recordVaultActivity);
    window.addEventListener('touchstart', recordVaultActivity);

    const interval = setInterval(() => {
      const tenMinutes = 10 * 60 * 1000;
      if (Date.now() - lastVaultActivityRef.current > tenMinutes) {
        setIsVaultUnlocked(false);
        sessionStorage.removeItem('eldostour_vault_unlocked');
        sessionStorage.removeItem('eldostour_vault_unlock_time');
        alert('تم إغلاق خزنة بيانات الطلاب المشفرة تلقائياً بعد 10 دقائق من عدم النشاط لحماية خصوصية الطلاب.');
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', recordVaultActivity);
      window.removeEventListener('keydown', recordVaultActivity);
      window.removeEventListener('click', recordVaultActivity);
      window.removeEventListener('touchstart', recordVaultActivity);
      clearInterval(interval);
    };
  }, [isVaultUnlocked]);

  // Handle Manual Lock Vault
  const handleLockVault = () => {
    setIsVaultUnlocked(false);
    sessionStorage.removeItem('eldostour_vault_unlocked');
    sessionStorage.removeItem('eldostour_vault_unlock_time');
    setVaultUnlockPassword1('');
    setVaultUnlockPassword2('');
  };

  // Handle Vault Unlock
  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultSettings?.vault_enabled) {
      setIsVaultUnlocked(true);
      return;
    }

    if (!canAccessVault) {
      setVaultUnlockError('عذراً، هذا الحساب الإشرافي لا يملك صلاحية فتح خزنة بيانات الطلاب المشفرة.');
      return;
    }

    setIsUnlocking(true);
    setVaultUnlockError('');

    try {
      const res = await adminUnlockVault(vaultUnlockPassword1.trim(), vaultUnlockPassword2.trim());

      if (res.success && res.unlocked) {
        setIsVaultUnlocked(true);
        lastVaultActivityRef.current = Date.now();
        sessionStorage.setItem('eldostour_vault_unlocked', 'true');
        sessionStorage.setItem('eldostour_vault_unlock_time', Date.now().toString());
        setVaultUnlockPassword1('');
        setVaultUnlockPassword2('');
      } else {
        setVaultUnlockError('إحدى كلمتي المرور أو كلاهما غير صحيحة. يرجى التأكد من كلمة مرور الأرقام وكلمة مرور الرموز.');
        await logAdminSecurityEvent(
          'vault_unlock_failed',
          adminSession?.username || 'Admin',
          'محاولة فاشلة لفتح خزنة بيانات الطلاب (كلمات مرور غير متطابقة)'
        );
      }
    } catch (err: any) {
      console.warn('Vault unlock error:', err);
      setVaultUnlockError('حدث خطأ أثناء التحقق من كلمات المرور، يرجى المحاولة لاحقاً');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle Setup Double-Password Vault
  const handleSaveVaultSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setSetupSuccess(false);

    // Validate Password 1 (Numeric)
    const val1 = validateVaultNumericPassword(setupNumericPassword);
    if (!val1.isValid) {
      setSetupError(val1.error || 'كلمة مرور الأرقام غير صحيحة');
      return;
    }
    if (setupNumericPassword !== setupConfirmNumeric) {
      setSetupError('تأكيد كلمة مرور الأرقام غير متطابق');
      return;
    }

    // Validate Password 2 (Complex)
    const val2 = validateVaultComplexPassword(setupComplexPassword);
    if (!val2.isValid) {
      setSetupError(val2.error || 'كلمة مرور الحروف والرموز غير صحيحة');
      return;
    }
    if (setupComplexPassword !== setupConfirmComplex) {
      setSetupError('تأكيد كلمة مرور الحروف والرموز غير متطابق');
      return;
    }

    setIsSavingVaultSetup(true);

    try {
      const res = await adminUpdateVault({
        vault_enabled: true,
        numeric_password: setupNumericPassword.trim(),
        complex_password: setupComplexPassword.trim(),
      });

      if (!res.success) throw new Error(res.error || 'فشل حفظ إعدادات حماية الخزنة');

      setSetupSuccess(true);
      await loadVaultSettings();

      setTimeout(() => {
        setIsConfiguringVault(false);
        setSetupNumericPassword('');
        setSetupComplexPassword('');
        setSetupConfirmNumeric('');
        setSetupConfirmComplex('');
        setSetupSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.warn('Vault setup error:', err);
      setSetupError(err?.message || 'فشل حفظ إعدادات حماية الخزنة');
    } finally {
      setIsSavingVaultSetup(false);
    }
  };

  // Approve Single Student
  const handleApproveStudent = async (studentId: string, studentName: string) => {
    if (!canManageStudents) {
      alert('ليس لديك صلاحية لاعتماد وتعديل حسابات الطلاب');
      return;
    }

    setApprovingId(studentId);
    try {
      const res = await adminUpdateStudent(studentId, { is_approved: true });
      if (!res.success) throw new Error(res.error || 'فشل اعتماد الحساب');

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, is_approved: true } : s))
      );
    } catch (err: any) {
      alert(`فشل اعتماد الحساب: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setApprovingId(null);
    }
  };

  // Bulk Approve All Pending Students
  const handleBulkApprove = async () => {
    if (!canManageStudents) {
      alert('ليس لديك صلاحية لاعتماد وتعديل حسابات الطلاب');
      return;
    }

    const pendingStudents = students.filter((s) => !s.is_guest && s.is_approved === false);
    if (pendingStudents.length === 0) {
      alert('لا يوجد طلاب بانتظار الاعتماد حالياً');
      return;
    }

    if (
      !window.confirm(
        `هل أنت متأكد من رغبتك في اعتماد وتفعيل كافة الحسابات المعلقة دفعة واحدة (${pendingStudents.length} طالب)؟`
      )
    ) {
      return;
    }

    setIsBulkApproving(true);
    try {
      const ids = pendingStudents.map((s) => s.id);
      const res = await adminBulkApproveStudents(ids);
      if (!res.success) throw new Error(res.error || 'فشل الاعتماد الجماعي');

      setStudents((prev) =>
        prev.map((s) => (!s.is_guest && s.is_approved === false ? { ...s, is_approved: true } : s))
      );

      alert(`تم اعتماد وتفعيل كافة الحسابات المعلقة (${pendingStudents.length} طالب) بنجاح!`);
    } catch (err: any) {
      alert(`فشل الاعتماد الجماعي: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      // Account type filter
      if (selectedAccountType === 'approved') {
        if (s.is_guest || s.is_approved === false) return false;
      }
      if (selectedAccountType === 'pending') {
        if (s.is_guest || s.is_approved !== false) return false;
      }
      if (selectedAccountType === 'guests') {
        if (!s.is_guest) return false;
      }

      // Year filter
      if (selectedYear !== 0 && s.academic_year !== selectedYear) return false;

      // Gender filter
      if (selectedGender !== 'all' && s.gender !== selectedGender) return false;

      // Search query (name, email, code, phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.full_name?.toLowerCase().includes(q);
        const matchesCode = s.student_code?.toLowerCase().includes(q);
        const matchesEmail = s.email?.toLowerCase().includes(q);
        const matchesPhone = s.phone?.includes(q);
        return matchesName || matchesCode || matchesEmail || matchesPhone;
      }

      return true;
    });

    if (showActiveRadar) {
      result = result
        .filter((s) => !s.is_guest && !s.is_banned)
        .sort((a, b) => (b.activity_score || 0) - (a.activity_score || 0));
    }

    return result;
  }, [students, selectedAccountType, selectedYear, selectedGender, searchQuery, showActiveRadar]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset Password Action
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStudent) return;
    if (!canManageStudents) {
      setResetError('ليس لديك صلاحية لتعديل كلمات مرور الطلاب');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('كلمة المرور يجب ألا تقل عن 8 خانات');
      return;
    }

    setIsResetting(true);
    setResetError('');
    setResetSuccess(false);

    try {
      const res = await adminUpdateStudent(resetModalStudent.id, {
        password: newPassword,
        must_change_password: true,
      });

      if (!res.success) throw new Error(res.error || 'فشل تغيير كلمة المرور');

      setResetSuccess(true);
      setTimeout(() => {
        setResetModalStudent(null);
        setNewPassword('');
        setResetSuccess(false);
      }, 1500);
    } catch (err: any) {
      setResetError(err?.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsResetting(false);
    }
  };

  // Edit VIP ID Action
  const handleSaveCustomCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCodeStudent) return;
    if (!canManageStudents) {
      setCodeError('ليس لديك صلاحية لتعديل أكواد الطلاب');
      return;
    }

    const cleanCode = customStudentCode.trim();
    if (!cleanCode) {
      setCodeError('يرجى إدخال الكود الجديد');
      return;
    }

    setIsSavingCode(true);
    setCodeError('');
    setCodeSuccess(false);

    try {
      const res = await adminUpdateStudent(editCodeStudent.id, { student_code: cleanCode });
      if (!res.success) throw new Error(res.error || 'فشل تحديث كود الطالب');

      // Update local state
      setStudents((prev) =>
        prev.map((s) => (s.id === editCodeStudent.id ? { ...s, student_code: cleanCode } : s))
      );

      setCodeSuccess(true);
      setTimeout(() => {
        setEditCodeStudent(null);
        setCustomStudentCode('');
        setCodeSuccess(false);
      }, 1500);
    } catch (err: any) {
      setCodeError(err?.message || 'فشل تحديث كود الطالب');
    } finally {
      setIsSavingCode(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (studentId: string, name: string) => {
    if (!canManageStudents) {
      alert('ليس لديك صلاحية لحذف حسابات الطلاب');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف حساب "${name}" نهائياً من المنصة؟`)) {
      return;
    }

    setDeletingId(studentId);
    try {
      const res = await adminDeleteStudent(studentId);
      if (!res.success) throw new Error(res.error || 'فشل الحذف');
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err: any) {
      alert(`فشل الحذف: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleRowReveal = (id: string) => {
    setRevealedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePhotoReveal = (id: string) => {
    setRevealedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setTimeout(() => {
          setRevealedPhotos((current) => {
            const reblur = new Set(current);
            reblur.delete(id);
            return reblur;
          });
        }, 120000);
      }
      return next;
    });
  };

  const handleToggleVerify = async (studentId: string, currentStatus?: boolean) => {
    const nextVal = !currentStatus;
    try {
      const res = await adminUpdateStudent(studentId, { is_verified: nextVal });
      if (!res.success) throw new Error(res.error || 'فشل التحديث');
      setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, is_verified: nextVal } : s)));
    } catch {
      alert('فشل تحديث حالة الاعتماد');
    }
  };

  const handleToggleBan = async (studentId: string, currentStatus?: boolean) => {
    const nextVal = !currentStatus;
    const conf = confirm(
      nextVal
        ? 'هل أنت متأكد من حظر هذا الطالب ومنعه من استخدام المنصة نهائياً؟'
        : 'هل ترغب في فك حظر هذا الطالب؟'
    );
    if (!conf) return;
    try {
      const res = await adminUpdateStudent(studentId, { is_banned: nextVal });
      if (!res.success) throw new Error(res.error || 'فشل التحديث');
      setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, is_banned: nextVal } : s)));
    } catch {
      alert('فشل تحديث حالة الحظر');
    }
  };

  const handleUnbindDevice = async (studentId: string, name: string) => {
    const conf = confirm(
      `هل تود فك ارتباط الجهاز الحالي للطالب (${name}) للسماح له بالتسجيل من جهاز جديد؟`
    );
    if (!conf) return;
    try {
      const res = await adminUpdateStudent(studentId, { device_fingerprint: null });
      if (!res.success) throw new Error(res.error || 'فشل التحديث');
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, device_fingerprint: undefined } : s))
      );
      alert(`تم فك ارتباط الجهاز بنجاح للطالب ${name}`);
    } catch {
      alert('فشل فك ارتباط الجهاز');
    }
  };

  // Export CSV (Requires unlocked vault if vault is enabled)
  const handleExportCSV = () => {
    if (vaultSettings?.vault_enabled && !isVaultUnlocked) {
      alert('عذراً، يجب فك تشفير وفتح خزنة بيانات الطلاب أولاً لتتمكن من تصدير السجل بصيغة CSV/Excel.');
      return;
    }

    if (filteredStudents.length === 0) {
      alert('لا توجد بيانات طلاب لتصديرها');
      return;
    }

    const headers = [
      'رقم القيد (Student Code)',
      'الاسم الكامل',
      'حالة الاعتماد',
      'نوع الحساب',
      'رقم الهاتف',
      'الشعبة',
      'البريد الإلكتروني',
      'النوع',
      'الفرقة الدراسية',
      'تاريخ التسجيل',
    ];
    const rows = filteredStudents.map((s) => [
      s.student_code,
      s.full_name,
      s.is_guest ? 'زائر' : s.is_approved === false ? 'معلق (بانتظار المراجعة)' : 'معتمد رسمياً',
      s.is_guest ? 'زائر (Lead)' : 'طالب رسمي',
      s.phone || 'غير مسجل',
      s.study_type || 'انتظام',
      s.email || 'غير مسجل',
      s.gender === 'female' ? 'طالبة' : 'طالب',
      ACADEMIC_YEARS.find((y) => y.id === s.academic_year)?.name || `الفرقة ${s.academic_year}`,
      new Date(s.created_at).toLocaleDateString('ar-EG'),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.map((val) => `"${val}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `سجل_طلاب_الدستور_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const totalStudents = students.length;
  const registeredCount = students.filter((s) => !s.is_guest && s.is_approved !== false).length;
  const pendingCount = students.filter((s) => !s.is_guest && s.is_approved === false).length;
  const guestsCount = students.filter((s) => s.is_guest).length;
  const isVaultProtected = Boolean(vaultSettings?.vault_enabled && !isVaultUnlocked);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header & Vault Status Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>سجل الطلاب والكارنيهات الرقمية والخزنة المشفرة</span>
            </h2>

            {/* Vault Status Tag */}
            {vaultSettings?.vault_enabled ? (
              isVaultUnlocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>الخزنة مفتوحة ومتاحة للمعاينة</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>الخزنة مشفرة ومقفلة 🔒</span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium">
                <Shield className="w-3.5 h-3.5" />
                <span>حماية الخزنة غير مفعلة</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400">
            دليل الطلاب المسجلين بالمنصة، أرقام الزوار (Guest Leads)، تخصيص أرقام VIP، واعتماد الحسابات
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Vault Controls */}
          {vaultSettings?.vault_enabled ? (
            isVaultUnlocked ? (
              <button
                onClick={handleLockVault}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors shadow-sm cursor-pointer"
                title="إغلاق وقفل الخزنة فورياً"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>قفل الخزنة الآن 🔒</span>
              </button>
            ) : null
          ) : (
            adminSession?.is_super_admin && (
              <button
                onClick={() => setIsConfiguringVault(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/40 transition-colors shadow-sm cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>إنشاء حماية لبيانات الطلبة 🛡️</span>
              </button>
            )
          )}

          {/* Refresh */}
          <button
            onClick={() => fetchStudents(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>تصدير السجل (Excel)</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner if fetching failed */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-200">{errorMsg}</p>
              <p className="text-[11px] text-rose-400/80 mt-0.5">
                تأكد من تسجيل الدخول كمسؤول وربط صلاحيات SUPABASE_SERVICE_ROLE_KEY لتجاوز سياسات الأمان RLS.
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchStudents(true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border border-rose-500/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">إجمالي السجلات</span>
          <span className="text-xl font-black text-white">{totalStudents}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-emerald-400 block mb-1">معتمدين رسمياً ✅</span>
          <span className="text-xl font-black text-emerald-400">{registeredCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center relative overflow-hidden">
          <span className="text-[11px] text-amber-400 block mb-1">بانتظار الاعتماد ⏳</span>
          <span className="text-xl font-black text-amber-400">{pendingCount}</span>
          {pendingCount > 0 && (
            <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-sky-400 block mb-1">أرقام الزوار 📱</span>
          <span className="text-xl font-black text-sky-400">{guestsCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-blue-400 block mb-1">الفرقة الأولى</span>
          <span className="text-xl font-black text-blue-400">
            {students.filter((s) => s.academic_year === 1).length}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-teal-400 block mb-1">الفرقة الثانية</span>
          <span className="text-xl font-black text-teal-400">
            {students.filter((s) => s.academic_year === 2).length}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-yellow-400 block mb-1">الفرقة الثالثة</span>
          <span className="text-xl font-black text-yellow-400">
            {students.filter((s) => s.academic_year === 3).length}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-purple-400 block mb-1">الفرقة الرابعة</span>
          <span className="text-xl font-black text-purple-400">
            {students.filter((s) => s.academic_year === 4).length}
          </span>
        </div>
      </div>

      {/* Bulk Approval Notification Banner */}
      {pendingCount > 0 && canManageStudents && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                يوجد ({pendingCount}) طالب بانتظار المراجعة والاعتماد
              </h4>
              <p className="text-xs text-slate-300">
                الحسابات المعلقة لا تتمكن من استعراض المحتوى والامتحانات حتى يتم اعتمادها من الإدارة
              </p>
            </div>
          </div>

          <button
            onClick={handleBulkApprove}
            disabled={isBulkApproving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isBulkApproving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>اعتماد الكل دفعة واحدة (Bulk Approve) ✅</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم الكامل، أو رقم القيد (DST-1001)، أو الموبايل (010...)، أو الإيميل..."
            className="w-full h-10 pr-10 pl-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Account Status / Type Filter Tabs */}
        <select
          value={selectedAccountType}
          onChange={(e) => setSelectedAccountType(e.target.value as any)}
          className="h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500 w-full md:w-auto font-semibold"
        >
          <option value="all">كل السجلات ({totalStudents})</option>
          <option value="approved">طلاب معتمدين رسمياً ✅ ({registeredCount})</option>
          <option value="pending">بانتظار المراجعة والاعتماد ⏳ ({pendingCount})</option>
          <option value="guests">أرقام الزوار فقط 📱 ({guestsCount})</option>
        </select>

        {/* Year Filter */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value) as AcademicYearId | 0)}
          className="h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500 w-full md:w-auto"
        >
          <option value={0}>جميع الفرق الدراسية</option>
          {ACADEMIC_YEARS.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>

        {/* Gender Filter */}
        <select
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value as StudentGender | 'all')}
          className="h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500 w-full md:w-auto"
        >
          <option value="all">كل الفئات</option>
          <option value="male">طلاب فقط 🔵</option>
          <option value="female">طالبات فقط 🟣</option>
        </select>

        {/* Activity Radar Filter */}
        <button
          type="button"
          onClick={() => setShowActiveRadar(!showActiveRadar)}
          className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            showActiveRadar
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title="ترتيب الطلاب حسب نقاط النشاط والتفاعل"
        >
          <Flame className={`w-4 h-4 ${showActiveRadar ? 'text-slate-950 fill-current' : 'text-amber-500'}`} />
          <span>الطلاب النشيطين 🔥</span>
        </button>
      </div>

      {/* Main Container: Locked Vault Screen VS Students Table */}
      {isVaultProtected ? (
        /* VAULT LOCKED SCREEN */
        <div className="relative rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-8 sm:p-12 text-center shadow-2xl overflow-hidden">
          {/* Subtle security background mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/60 to-slate-950 pointer-events-none" />

          <div className="relative z-10 max-w-lg mx-auto space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
              <Lock className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                خزنة بيانات الطلاب مشفرة ومقفلة 🔒
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                تم تفعيل نظام الحماية المزدوجة (Double-Password Vault). للاطلاع على أرقام هواتف الطلاب والبيانات الشخصية
                وتصدير السجلات، يرجى إدخال كلمتي المرور الخاصة بالمشرفين.
              </p>
            </div>

            {/* Unlock Form */}
            <form onSubmit={handleUnlockVault} className="space-y-4 text-right">
              {/* Password 1: Numbers */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  1. كلمة مرور الأرقام السرية (Password 1):
                </label>
                <div className="relative">
                  <input
                    type={showUnlockPass1 ? 'text' : 'password'}
                    value={vaultUnlockPassword1}
                    onChange={(e) => setVaultUnlockPassword1(e.target.value)}
                    placeholder="أدخل رمز الأرقام السري..."
                    required
                    dir="ltr"
                    className="w-full h-11 pr-4 pl-11 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPass1(!showUnlockPass1)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showUnlockPass1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password 2: Complex */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  2. كلمة مرور الحروف والرموز المعقدة (Password 2):
                </label>
                <div className="relative">
                  <input
                    type={showUnlockPass2 ? 'text' : 'password'}
                    value={vaultUnlockPassword2}
                    onChange={(e) => setVaultUnlockPassword2(e.target.value)}
                    placeholder="أدخل كلمة مرور الرموز والحروف..."
                    required
                    dir="ltr"
                    className="w-full h-11 pr-4 pl-11 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPass2(!showUnlockPass2)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showUnlockPass2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {vaultUnlockError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{vaultUnlockError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUnlocking}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isUnlocking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Unlock className="w-5 h-5" />
                )}
                <span>فك التشفير وفتح الخزنة 🔓</span>
              </button>
            </form>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                🔒 الحماية مفعلة تلقائياً — يتم قفل الخزنة بعد 10 دقائق من عدم النشاط
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* STUDENTS TABLE VIEW */
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              <p className="text-xs">جاري تحميل سجل الطلاب...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              {errorMsg ? (
                <>
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
                  <p className="text-sm font-bold text-rose-300">{errorMsg}</p>
                  <p className="text-xs text-rose-400/80 mt-1">
                    تأكد من تسجيل الدخول كمسؤول وضبط مفتاح SUPABASE_SERVICE_ROLE_KEY على الخادم لتجاوز قيود RLS.
                  </p>
                  <button
                    onClick={() => fetchStudents(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer border border-rose-500/30"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة المحاولة الآن</span>
                  </button>
                </>
              ) : (
                <>
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-bold text-slate-300">لم يتم العثور على أي طلاب مطابقين</p>
                  <p className="text-xs text-slate-500 mt-1">
                    جرب تغيير معايير البحث أو تصفية الفرق الدراسية
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3.5 px-3">رقم القيد (الكود)</th>
                    <th className="py-3.5 px-3">الصورة والاسم الكامل</th>
                    <th className="py-3.5 px-3">الهاتف والواتساب</th>
                    <th className="py-3.5 px-3">الفرقة والشعبة</th>
                    <th className="py-3.5 px-3">حالة الاعتماد والنوع</th>
                    <th className="py-3.5 px-3">البريد الإلكتروني</th>
                    <th className="py-3.5 px-3">تاريخ التسجيل</th>
                    <th className="py-3.5 px-3 text-center">الإجراءات والاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((s) => {
                    const yearObj = ACADEMIC_YEARS.find((y) => y.id === s.academic_year);
                    const isCopied = copiedId === s.id;
                    const cleanPhone = s.phone?.replace(/\D/g, '');
                    const formattedPhone = cleanPhone?.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
                    const isPending = !s.is_guest && s.is_approved === false;
                    const isRowRevealed = revealedRows.has(s.id);
                    const displayPhone = isRowRevealed ? s.phone : maskPhoneNumber(s.phone);
                    const displayEmail = isRowRevealed ? s.email : maskEmail(s.email);
                    const isPhotoRevealed = revealedPhotos.has(s.id);

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors text-slate-200 ${
                          s.is_banned
                            ? 'bg-rose-950/20 hover:bg-rose-950/30 border-r-4 border-rose-500'
                            : isPending
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Code + Edit ID Button */}
                        <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{s.student_code}</span>
                            <button
                              onClick={() => handleCopy(s.student_code, s.id)}
                              className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                              title="نسخ رقم القيد"
                            >
                              {isCopied ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {/* Edit VIP Code */}
                            {canManageStudents && (
                              <button
                                onClick={() => {
                                  setEditCodeStudent(s);
                                  setCustomStudentCode(s.student_code);
                                  setCodeError('');
                                  setCodeSuccess(false);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                                title="تعديل الكود لرقم VIP مميز"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Photo & Name */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="relative w-9 h-9 rounded-full bg-slate-800 border border-amber-500/30 overflow-hidden shrink-0 flex items-center justify-center group/avatar shadow-inner">
                              {s.avatar_url ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={s.avatar_url}
                                    alt={s.full_name}
                                    className={`w-full h-full object-cover transition-all duration-300 ${
                                      isPhotoRevealed ? 'filter-none scale-100' : 'filter blur-xl scale-125'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePhotoReveal(s.id);
                                    }}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/avatar:opacity-100 hover:!opacity-100 transition-opacity text-white"
                                    title={isPhotoRevealed ? 'إعادة تعتيم الصورة' : 'كشف الصورة مؤقتاً'}
                                  >
                                    {isPhotoRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs">{s.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white block">{s.full_name}</span>
                                {s.is_verified && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-[#EC4899] bg-pink-500/15 border border-pink-500/30"
                                    title="طالب موثق ومعتمد رسمياً VIP"
                                  >
                                    <BadgeCheck className="w-3 h-3 text-[#EC4899]" />
                                    <span>معتمد ✓</span>
                                  </span>
                                )}
                                {s.is_banned && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30"
                                    title="حساب محظور"
                                  >
                                    <Ban className="w-3 h-3 text-rose-400" />
                                    <span>محظور 🚫</span>
                                  </span>
                                )}
                                {typeof s.activity_score === 'number' && s.activity_score > 0 && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30"
                                    title={`نقاط تفاعل الطالب: ${s.activity_score}`}
                                  >
                                    <Flame className="w-3 h-3 text-amber-400" />
                                    <span>{s.activity_score}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Phone + WhatsApp + Eye Toggle */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {s.phone ? (
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-slate-300" dir="ltr">{displayPhone}</span>
                              <button
                                type="button"
                                onClick={() => toggleRowReveal(s.id)}
                                className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                                title={isRowRevealed ? 'حجب البيانات الحساسة' : 'إظهار الهاتف والإيميل كاملاً'}
                              >
                                {isRowRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                                  `مرحباً يا ${s.full_name}، نتواصل معك من إدارة منصة الدستور التعليمية`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                                title="مراسلة عبر واتساب"
                              >
                                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">غير متوفر</span>
                          )}
                        </td>

                        {/* Year & Study Type */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-medium">
                              <GraduationCap className="w-3 h-3" />
                              <span>{yearObj?.name || `الفرقة ${s.academic_year}`}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              الشعبة: <strong className="text-slate-200">{s.study_type || 'انتظام'}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Approval Status & Gender */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {s.is_guest ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                زائر (Guest)
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                                <Clock className="w-3 h-3" />
                                <span>معلق (بانتظار الاعتماد)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3" />
                                <span>معتمد رسمياً ✅</span>
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400">
                              {s.gender === 'female' ? 'طالبة 🟣' : 'طالب 🔵'}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {s.email ? (
                            <a
                              href={`mailto:${s.email}`}
                              className="hover:text-amber-400 hover:underline flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{displayEmail}</span>
                            </a>
                          ) : (
                            <span className="text-slate-500">زائر بدون إيميل</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>
                              {new Date(s.created_at).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Approve Button (Only for Pending) */}
                            {isPending && canManageStudents && (
                              <button
                                onClick={() => handleApproveStudent(s.id, s.full_name)}
                                disabled={approvingId === s.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                                title="اعتماد وتفعيل حساب الطالب"
                              >
                                {approvingId === s.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>اعتماد ✅</span>
                              </button>
                            )}

                            {/* Verify VIP Toggle */}
                            {canManageStudents && !s.is_guest && (
                              <button
                                onClick={() => handleToggleVerify(s.id, s.is_verified)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  s.is_verified
                                    ? 'bg-pink-500/20 text-[#EC4899] border-pink-500/40 shadow-sm'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-[#EC4899]'
                                }`}
                                title={s.is_verified ? 'إلغاء شارة الاعتماد والتوثيق' : 'منح الاعتماد والتوثيق VIP'}
                              >
                                <BadgeCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Unbind Device */}
                            {canManageStudents && !s.is_guest && (
                              <button
                                onClick={() => handleUnbindDevice(s.id, s.full_name)}
                                className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 transition-colors"
                                title="فك ارتباط الجهاز 🔄 (السماح بالدخول من جهاز جديد)"
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Ban / Unban Toggle */}
                            {canManageStudents && !s.is_guest && (
                              <button
                                onClick={() => handleToggleBan(s.id, s.is_banned)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  s.is_banned
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-rose-400'
                                }`}
                                title={s.is_banned ? 'فك الحظر عن هذا الطالب' : 'حظر نهائي 🚫'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Edit VIP ID Button */}
                            {canManageStudents && (
                              <button
                                onClick={() => {
                                  setEditCodeStudent(s);
                                  setCustomStudentCode(s.student_code);
                                  setCodeError('');
                                  setCodeSuccess(false);
                                }}
                                className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-colors"
                                title="تعديل الكود / تعيين رقم VIP"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Reset Password */}
                            {!s.is_guest && canManageStudents && (
                              <button
                                onClick={() => {
                                  setResetModalStudent(s);
                                  setNewPassword('');
                                  setResetError('');
                                  setResetSuccess(false);
                                }}
                                className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 transition-colors"
                                title="إعادة تعيين كلمة المرور"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            {canManageStudents && (
                              <button
                                onClick={() => handleDeleteStudent(s.id, s.full_name)}
                                disabled={deletingId === s.id}
                                className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-50"
                                title="حذف أو رفض الحساب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Double Password Vault Setup Modal */}
      {isConfiguringVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
          <div className="relative w-full max-w-lg bg-slate-900 border-2 border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-right text-white space-y-5">
            <button
              onClick={() => setIsConfiguringVault(false)}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">إنشاء وتفعيل حماية الخزنة المشفرة (Double-Password Vault)</h3>
                <p className="text-xs text-purple-300/80">نظام حماية مزدوج مستقل عن كلمة مرور لوحة التحكم</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              لحماية هواتف وبيانات الطلاب من الوصول غير المصرح به، يجب إعداد كلمتي مرور مختلفتين: الأولى رقمية فقط (4-12 رقماً)، والثانية تحتوي على حروف ورموز خاصة (!@#$).
            </p>

            <form onSubmit={handleSaveVaultSetup} className="space-y-4">
              {/* Numeric Password */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>1. كلمة مرور الأرقام السرية (Strictly Digits):</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={setupNumericPassword}
                    onChange={(e) => setSetupNumericPassword(e.target.value)}
                    placeholder="كلمة المرور (4-12 رقماً)"
                    required
                    dir="ltr"
                    className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="password"
                    value={setupConfirmNumeric}
                    onChange={(e) => setSetupConfirmNumeric(e.target.value)}
                    placeholder="تأكيد كلمة مرور الأرقام"
                    required
                    dir="ltr"
                    className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Complex Password */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>2. كلمة مرور الحروف والرموز (Letters + Special Symbols):</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={setupComplexPassword}
                    onChange={(e) => setSetupComplexPassword(e.target.value)}
                    placeholder="كلمة مرور معقدة (6 خانات+)"
                    required
                    dir="ltr"
                    className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="password"
                    value={setupConfirmComplex}
                    onChange={(e) => setSetupConfirmComplex(e.target.value)}
                    placeholder="تأكيد كلمة المرور المعقدة"
                    required
                    dir="ltr"
                    className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {setupError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{setupError}</span>
                </div>
              )}

              {setupSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>تم حفظ وتفعيل نظام الحماية المزدوجة للخزنة بنجاح!</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingVaultSetup}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingVaultSetup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>حفظ وتفعيل الحماية الآن 🔒</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfiguringVault(false)}
                  className="px-4 h-11 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit VIP Student ID Modal */}
      {editCodeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-right text-white">
            <button
              onClick={() => setEditCodeStudent(null)}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تعديل كود الطالب / تعيين رقم VIP</h3>
                <p className="text-xs text-amber-300/80">للطالب: {editCodeStudent.full_name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              يمكنك تخصيص كود فريد أو رقم مميز (مثل: 1000، 1010، 1077، أو DST-1000). يتم التحقق تلقائياً من عدم تكراره.
            </p>

            <form onSubmit={handleSaveCustomCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  الكود الجديد (رقم القيد الأكاديمي):
                </label>
                <div className="relative">
                  <Crown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customStudentCode}
                    onChange={(e) => setCustomStudentCode(e.target.value)}
                    placeholder="مثال: 1000 أو 1077 أو DST-1000..."
                    required
                    dir="ltr"
                    className="w-full h-10 pr-10 pl-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-amber-300 font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-500 text-right"
                  />
                </div>
              </div>

              {codeError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{codeError}</span>
                </div>
              )}

              {codeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>تم حفظ وتحديث كود الطالب بنجاح!</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingCode}
                  className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingCode ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>تأكيد وتحديث الكود</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditCodeStudent(null)}
                  className="px-4 h-10 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-right text-white">
            <button
              onClick={() => setResetModalStudent(null)}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إعادة تعيين كلمة المرور</h3>
                <p className="text-xs text-amber-300/80">للطالب: {resetModalStudent.full_name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              أدخل كلمة مرور جديدة للطالب صاحب رقم القيد ({resetModalStudent.student_code}). سيتم
              تشفيرها وتحديثها فورياً في قاعدة البيانات.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  كلمة المرور الجديدة:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="اكتب كلمة المرور الجديدة (6 أحرف فأكثر)..."
                    required
                    className="w-full h-10 pr-10 pl-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>تم تغيير كلمة المرور بنجاح!</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isResetting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>تأكيد وحفظ كلمة المرور</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setResetModalStudent(null)}
                  className="px-4 h-10 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

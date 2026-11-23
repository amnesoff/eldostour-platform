'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hashSha256, logAdminSecurityEvent } from '@/lib/authUtils';
import { SubAdminUser, AdminSecurityLog, AdminSecuritySettings } from '@/types';

interface SecurityCenterManagerProps {
  onRefresh?: () => void;
}

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

  // Status Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch admin_security
      const { data: secData } = await supabase
        .from('admin_security')
        .select('*')
        .eq('id', 'primary')
        .maybeSingle();

      if (secData) {
        setSecuritySettings(secData as AdminSecuritySettings);
        setNewSuperUsername(secData.admin_username);
      }

      // 2. Fetch sub-admins
      const { data: adminsData } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (adminsData) {
        setSubAdmins(adminsData as SubAdminUser[]);
      }

      // 3. Fetch security logs (recent 25)
      const { data: logsData } = await supabase
        .from('admin_security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (logsData) {
        setLogs(logsData as AdminSecurityLog[]);
      }
    } catch (err) {
      console.warn('Could not load security center data:', err);
    } finally {
      setIsLoading(false);
      onRefresh?.();
    }
  }, [onRefresh]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin_security_center_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_security' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_users' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_security_logs' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Toggle Manual Student Approval
  const handleToggleManualApproval = async () => {
    if (!securitySettings) return;
    const nextVal = !securitySettings.manual_approval_enabled;
    try {
      await supabase
        .from('admin_security')
        .update({
          manual_approval_enabled: nextVal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'primary');

      setSecuritySettings((prev) => (prev ? { ...prev, manual_approval_enabled: nextVal } : null));

      await logAdminSecurityEvent(
        'setting_change',
        securitySettings.admin_username,
        `تم ${nextVal ? 'تفعيل' : 'تعطيل'} نظام المراجعة والاعتماد اليدوي للطلاب الجدد`
      );

      setSuccessMsg(`تم ${nextVal ? 'تفعيل' : 'تعطيل'} الاعتماد اليدوي للطلاب بنجاح!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('فشل تحديث إعداد الاعتماد اليدوي');
    }
  };

  // Save Super Admin Credentials
  const handleSaveSuperAdminCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuperUsername.trim()) return;
    setIsSavingSuperCreds(true);
    setErrorMsg('');

    try {
      const updates: any = {
        admin_username: newSuperUsername.trim(),
        updated_at: new Date().toISOString(),
      };

      if (newSuperPassword.trim()) {
        updates.password_hash = await hashSha256(newSuperPassword.trim());
      }

      if (newSuperPin.trim()) {
        if (!/^\d{6}$/.test(newSuperPin.trim())) {
          setErrorMsg('رمز الأمان السداسي (PIN) يجب أن يتكون من 6 أرقام بالضبط');
          setIsSavingSuperCreds(false);
          return;
        }
        updates.pin_hash = await hashSha256(newSuperPin.trim());
      }

      const { error } = await supabase
        .from('admin_security')
        .update(updates)
        .eq('id', 'primary');

      if (error) throw error;

      await logAdminSecurityEvent(
        'super_admin_update',
        newSuperUsername.trim(),
        'تم تحديث بيانات اعتماد المشرف العام بنجاح'
      );

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

    // Validation for new sub-admin
    if (!editingSubAdmin) {
      if (!subPassword.trim()) {
        setErrorMsg('يرجى تحديد كلمة مرور للمشرف الجديد');
        return;
      }
      if (!/^\d{6}$/.test(subPin.trim())) {
        setErrorMsg('يرجى إدخال رمز أمان (PIN) مكون من 6 أرقام للمشرف');
        return;
      }
    }

    setIsSavingSubAdmin(true);
    setErrorMsg('');

    try {
      if (editingSubAdmin) {
        // Update existing
        const updates: any = {
          username: subUsername.trim(),
          can_manage_students: canManageStudents,
          can_manage_content: canManageContent,
          can_delete_content: canDeleteContent,
          can_access_student_vault: canAccessStudentVault,
          updated_at: new Date().toISOString(),
        };

        if (subPassword.trim()) {
          updates.password_hash = await hashSha256(subPassword.trim());
        }

        if (subPin.trim()) {
          if (!/^\d{6}$/.test(subPin.trim())) {
            setErrorMsg('كود الـ PIN يجب أن يتكون من 6 أرقام');
            setIsSavingSubAdmin(false);
            return;
          }
          updates.pin_hash = await hashSha256(subPin.trim());
        }

        const { error } = await supabase
          .from('admin_users')
          .update(updates)
          .eq('id', editingSubAdmin.id);

        if (error) throw error;

        await logAdminSecurityEvent(
          'sub_admin_updated',
          securitySettings?.admin_username || 'Admin',
          `تم تعديل صلاحيات المشرف (${subUsername.trim()})`
        );

        setSuccessMsg(`تم تحديث المشرف (${subUsername.trim()}) بنجاح!`);
      } else {
        // Create new
        const password_hash = await hashSha256(subPassword.trim());
        const pin_hash = await hashSha256(subPin.trim());

        const { error } = await supabase.from('admin_users').insert({
          username: subUsername.trim(),
          password_hash,
          pin_hash,
          can_manage_students: canManageStudents,
          can_manage_content: canManageContent,
          can_delete_content: canDeleteContent,
          can_access_student_vault: canAccessStudentVault,
        });

        if (error) {
          if (error.code === '23505') {
            throw new Error('اسم المشرف مسجل مسبقاً، يرجى اختيار اسم آخر');
          }
          throw error;
        }

        await logAdminSecurityEvent(
          'sub_admin_created',
          securitySettings?.admin_username || 'Admin',
          `تم إنشاء حساب مشرف فرعي جديد (${subUsername.trim()})`
        );

        setSuccessMsg(`تم إضافة المشرف الفرعي (${subUsername.trim()}) بنجاح!`);
      }

      setIsSubAdminModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ المشرف');
    } finally {
      setIsSavingSubAdmin(false);
    }
  };

  // Delete Sub-Admin
  const handleDeleteSubAdmin = async (admin: SubAdminUser) => {
    if (!confirm(`هل أنت متأكد من حذف المشرف (${admin.username}) وسحب جميع صلاحياته نهائياً؟`)) {
      return;
    }

    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', admin.id);
      if (error) throw error;

      await logAdminSecurityEvent(
        'sub_admin_deleted',
        securitySettings?.admin_username || 'Admin',
        `تم حذف المشرف (${admin.username})`
      );

      setSuccessMsg(`تم حذف المشرف (${admin.username}) بنجاح`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('فشل حذف المشرف');
    }
  };

  if (isLoading && !securitySettings) {
    return (
      <div className="p-12 text-center text-amber-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
        <p className="text-xs">جاري تحميل مركز الأمان والمشرفين...</p>
      </div>
    );
  }

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
              {securitySettings?.manual_approval_enabled ? 'قيد المراجعة اليدوية (Pending)' : 'تفعيل فوري بعد تأكيد البريد (Instant)'}
            </span>
          </div>
        </div>
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
                  <tr key={admin.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <span>{admin.username}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${admin.can_manage_students ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {admin.can_manage_students ? 'مسموح' : 'محظور'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${admin.can_manage_content ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {admin.can_manage_content ? 'مسموح' : 'محظور'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${admin.can_delete_content ? 'bg-red-500/15 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                        {admin.can_delete_content ? 'مسموح' : 'محظور'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${admin.can_access_student_vault ? 'bg-purple-500/15 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                        {admin.can_access_student_vault ? 'مسموح' : 'محظور'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenSubAdminModal(admin)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                          title="تعديل الصلاحيات أو كلمة المرور"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubAdmin(admin)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
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

      {/* SECURITY AUDIT & INTRUSION LOGS TABLE */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>سجل النشاط الأمني ورصد محاولات الاختراق (Intrusion Logs)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              رصد حي لمحاولات الدخول، القفل الأمني، فك قفل الخزنة، وإغلاق الطوارئ
            </p>
          </div>

          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>تحديث السجل</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            لا توجد سجلات أمنية حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3">المستخدم المستهدف</th>
                  <th className="py-2.5 px-3">التفاصيل</th>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {logs.map((log) => {
                  const isFail = log.event_type.includes('fail') || log.event_type.includes('lock');
                  const isPanic = log.event_type.includes('panic');
                  const isSuccess = log.event_type.includes('success') || log.event_type.includes('unlock');

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPanic
                              ? 'bg-red-600 text-white animate-pulse'
                              : isFail
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isSuccess
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{log.username || 'System'}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">{log.details}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
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

      {/* MODAL 1: EDIT SUPER ADMIN CREDS */}
      {isEditSuperAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" dir="rtl">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>تعديل بيانات اعتماد المشرف العام</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              تغيير اسم المستخدم أو كلمة المرور أو كود الـ PIN المكون من 6 أرقام
            </p>

            <form onSubmit={handleSaveSuperAdminCreds} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اسم المشرف العام:
                </label>
                <input
                  type="text"
                  value={newSuperUsername}
                  onChange={(e) => setNewSuperUsername(e.target.value)}
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
    </div>
  );
}

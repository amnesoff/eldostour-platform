'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Edit3,
  MessageCircle,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Student, AcademicYearId, StudentGender } from '@/types';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { hashPassword } from '@/lib/authUtils';

export function StudentsDirectory() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<AcademicYearId | 0>(0);
  const [selectedGender, setSelectedGender] = useState<StudentGender | 'all'>('all');
  const [selectedAccountType, setSelectedAccountType] = useState<'all' | 'registered' | 'guests'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Password Reset Modal State
  const [resetModalStudent, setResetModalStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Edit VIP Student ID Modal State (TASK 1)
  const [editCodeStudent, setEditCodeStudent] = useState<Student | null>(null);
  const [customStudentCode, setCustomStudentCode] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Students
  const fetchStudents = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching students:', error);
      } else if (data) {
        setStudents(data as Student[]);
      }
    } catch (err) {
      console.warn('Failed to load students:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();

    // Realtime subscription
    const channel = supabase
      .channel('admin_students_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStudents]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Account type filter
      if (selectedAccountType === 'registered' && s.is_guest) return false;
      if (selectedAccountType === 'guests' && !s.is_guest) return false;

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
  }, [students, selectedAccountType, selectedYear, selectedGender, searchQuery]);

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
    if (newPassword.length < 6) {
      setResetError('كلمة المرور يجب ألا تقل عن 6 أحرف');
      return;
    }

    setIsResetting(true);
    setResetError('');
    setResetSuccess(false);

    try {
      const hashedPassword = await hashPassword(newPassword);
      const { error } = await supabase
        .from('students')
        .update({ password_hash: hashedPassword })
        .eq('id', resetModalStudent.id);

      if (error) throw error;

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

  // Edit VIP ID Action (TASK 1: with duplicate check)
  const handleSaveCustomCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCodeStudent) return;

    const cleanCode = customStudentCode.trim();
    if (!cleanCode) {
      setCodeError('يرجى إدخال الكود الجديد');
      return;
    }

    setIsSavingCode(true);
    setCodeError('');
    setCodeSuccess(false);

    try {
      // 1. Check duplicate code
      const { data: existing } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('student_code', cleanCode)
        .neq('id', editCodeStudent.id)
        .maybeSingle();

      if (existing) {
        setCodeError(`هذا الكود مستخدم بالفعل للطالب: ${existing.full_name}`);
        setIsSavingCode(false);
        return;
      }

      // 2. Update code in Supabase
      const { error } = await supabase
        .from('students')
        .update({ student_code: cleanCode })
        .eq('id', editCodeStudent.id);

      if (error) throw error;

      // 3. Update local state
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
    if (!window.confirm(`هل أنت متأكد من حذف حساب "${name}" نهائياً من المنصة؟`)) {
      return;
    }

    setDeletingId(studentId);
    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err: any) {
      alert(`فشل الحذف: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      alert('لا توجد بيانات طلاب لتصديرها');
      return;
    }

    const headers = [
      'رقم القيد (Student Code)',
      'الاسم الكامل',
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
  const registeredCount = students.filter((s) => !s.is_guest).length;
  const guestsCount = students.filter((s) => s.is_guest).length;
  const year1Count = students.filter((s) => s.academic_year === 1).length;
  const year2Count = students.filter((s) => s.academic_year === 2).length;
  const year3Count = students.filter((s) => s.academic_year === 3).length;
  const year4Count = students.filter((s) => s.academic_year === 4).length;
  const femaleCount = students.filter((s) => s.gender === 'female').length;
  const maleCount = students.filter((s) => s.gender === 'male').length;

  return (
    <div className="space-y-6 text-right">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>سجل الطلاب والكارنيهات الرقمية وأرقام الزوار</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دليل الطلاب المسجلين بالمنصة، أرقام الزوار (Guest Leads)، تخصيص أرقام VIP، وإدارة الحسابات
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchStudents(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير السجل (Excel / CSV)</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">إجمالي السجلات</span>
          <span className="text-xl font-black text-white">{totalStudents}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-emerald-400 block mb-1">طلاب رسميين 🛡️</span>
          <span className="text-xl font-black text-emerald-400">{registeredCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-amber-400 block mb-1">زوار برقم الهاتف 📱</span>
          <span className="text-xl font-black text-amber-400">{guestsCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-blue-400 block mb-1">الفرقة الأولى</span>
          <span className="text-xl font-black text-blue-400">{year1Count}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-teal-400 block mb-1">الفرقة الثانية</span>
          <span className="text-xl font-black text-teal-400">{year2Count}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-yellow-400 block mb-1">الفرقة الثالثة</span>
          <span className="text-xl font-black text-yellow-400">{year3Count}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-purple-400 block mb-1">الفرقة الرابعة</span>
          <span className="text-xl font-black text-purple-400">{year4Count}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-rose-300 block mb-1">طالبات / طلاب</span>
          <span className="text-sm font-black text-white">{femaleCount} 🟣 / {maleCount} 🔵</span>
        </div>
      </div>

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

        {/* Account Type Filter */}
        <select
          value={selectedAccountType}
          onChange={(e) => setSelectedAccountType(e.target.value as any)}
          className="h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500 w-full md:w-auto"
        >
          <option value="all">كل السجلات (طلاب وزوار)</option>
          <option value="registered">طلاب رسميين فقط (كود معتمد)</option>
          <option value="guests">أرقام الزوار فقط (Guest Leads)</option>
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
      </div>

      {/* Students List Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
            <p className="text-xs">جاري تحميل سجل الطلاب...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-bold text-slate-300">لم يتم العثور على أي طلاب مطابقين</p>
            <p className="text-xs text-slate-500 mt-1">
              جرب تغيير معايير البحث أو تصفية الفرق الدراسية
            </p>
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
                  <th className="py-3.5 px-3">الحالة والنوع</th>
                  <th className="py-3.5 px-3">البريد الإلكتروني</th>
                  <th className="py-3.5 px-3">تاريخ التسجيل</th>
                  <th className="py-3.5 px-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((s) => {
                  const yearObj = ACADEMIC_YEARS.find((y) => y.id === s.academic_year);
                  const isCopied = copiedId === s.id;
                  const cleanPhone = s.phone?.replace(/\D/g, '');
                  const formattedPhone = cleanPhone?.startsWith('0') ? `2${cleanPhone}` : cleanPhone;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-800/40 transition-colors text-slate-200"
                    >
                      {/* Code + Edit ID Button */}
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{s.student_code}</span>
                          <button
                            onClick={() => handleCopy(s.student_code, s.id)}
                            className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800"
                            title="نسخ رقم القيد"
                          >
                            {isCopied ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {/* TASK 1: Edit VIP Code */}
                          <button
                            onClick={() => {
                              setEditCodeStudent(s);
                              setCustomStudentCode(s.student_code);
                              setCodeError('');
                              setCodeSuccess(false);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800"
                            title="تعديل الكود لرقم VIP مميز"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Photo & Name */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-amber-500/30 overflow-hidden shrink-0 flex items-center justify-center">
                            {s.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs">{s.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{s.full_name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Phone + WhatsApp */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {s.phone ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-slate-300" dir="ltr">{s.phone}</span>
                            <a
                              href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                                `مرحباً يا ${s.full_name}، نتواصل معك من إدارة منصة الدستور التعليمية - كلية الحقوق جامعة مدينة السادات`
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

                      {/* Status & Gender */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {s.is_guest ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              زائر (Guest)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3" />
                              <span>رسمي معتمد</span>
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
                            <span>{s.email}</span>
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
                          {/* Edit ID Button */}
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

                          {/* Reset Password */}
                          {!s.is_guest && (
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
                          <button
                            onClick={() => handleDeleteStudent(s.id, s.full_name)}
                            disabled={deletingId === s.id}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-50"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* TASK 1: Edit VIP Student ID Modal */}
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

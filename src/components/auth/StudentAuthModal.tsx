'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Lock,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Phone,
  Camera,
  UserCheck,
  Clock,
  Scale,
  MessageCircle,
} from 'lucide-react';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { AcademicYearId, StudentGender, StudyType } from '@/types';
import { ACADEMIC_YEARS, COLLEGE_NAME, PLATFORM_NAME } from '@/lib/constants';
import { compressImageFile, isReservedName, normalizeArabicText, validateEgyptianPhone, validateStudentName } from '@/lib/authUtils';
import { supabase } from '@/lib/supabase';
import { LegalContractModal } from '@/components/legal/LegalContractModal';

export function StudentAuthModal() {
  const {
    student,
    isGuest,
    isAuthModalOpen,
    closeAuthModal,
    modalDefaultMode,
    login,
    register,
    registerGuest,
  } = useStudentAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'guest'>('register');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<StudentGender>('male');
  const [academicYear, setAcademicYear] = useState<AcademicYearId>(1);
  const [studyType, setStudyType] = useState<StudyType>('انتظام');
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Registration Flow Step
  const [regStep, setRegStep] = useState<'form' | 'pending_approval'>('form');
  const [registeredCode, setRegisteredCode] = useState('');
  const [approvalWhatsApp, setApprovalWhatsApp] = useState('201000000000');

  // Legal Terms & Contract Modal
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isContractOpen, setIsContractOpen] = useState(false);

  // Fetch dynamic whatsapp approval number from admin_security
  useEffect(() => {
    supabase
      .from('admin_security')
      .select('whatsapp_approval_number')
      .eq('id', 'primary')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.whatsapp_approval_number) {
          setApprovalWhatsApp(data.whatsapp_approval_number);
        }
      });
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with trigger
  useEffect(() => {
    if (modalDefaultMode) {
      setMode(modalDefaultMode);
      setRegStep('form');
    }
  }, [modalDefaultMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 380);
      setAvatarPreview(compressed);
    } catch {
      setError('فشل قراءة الصورة، يرجى اختيار صورة أخرى');
    }
  };

  // Pre-validate registration and send OTP
  const handleInitiateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 0. Headless Bot Check
    if (typeof navigator !== 'undefined' && ((navigator as any).webdriver || (window as any).__nightmare || (window as any)._phantom)) {
      setError('تم رصد بيئة تصفح مؤتمتة غير آمنة (Bot/Automated Browser). يرجى استخدام متصفح قياسي.');
      return;
    }

    // 0.1 Check Terms Consent
    if (!termsAccepted) {
      setError('يجب قراءة شروط الاستخدام والعقد القانوني المكون من 20 مادة والموافقة عليه أولاً لإتمام التسجيل.');
      return;
    }

    // 1. Validate Full Name
    const nameVal = validateStudentName(fullName);
    if (!nameVal.isValid) {
      setError(nameVal.error || 'يرجى كتابة الاسم ثنائياً أو ثلاثياً على الأقل');
      return;
    }

    // 2. Reject Reserved/Impersonation Words
    if (isReservedName(fullName)) {
      setError('الاسم يحتوي على كلمات محجوزة أو ألقاب إدارية غير مسموح بها (مثل أدمن، مدير، الدستور، مازن...).');
      return;
    }

    // 3. Validate Egyptian Phone Number
    const phoneVal = validateEgyptianPhone(phone);
    if (!phoneVal.isValid) {
      setError(phoneVal.error || 'يرجى إدخال رقم هاتف محمول مصري صحيح');
      return;
    }

    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب ألا تقل عن 6 أحرف');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim().replace(/[\s-]/g, '');

      // 4. Check duplicate email in Supabase
      const { data: exEmail } = await supabase
        .from('students')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (exEmail) {
        setError('البريد الإلكتروني مسجل مسبقاً بالفعل، يرجى تسجيل الدخول مباشرة');
        setIsSubmitting(false);
        return;
      }

      // 5. Check duplicate phone in Supabase
      const { data: exPhone } = await supabase
        .from('students')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (exPhone) {
        setError('رقم الهاتف مسجل مسبقاً بحساب طالب آخر');
        setIsSubmitting(false);
        return;
      }

      // 6. Check duplicate full name (strict fuzzy comparison)
      const { data: allStudents } = await supabase.from('students').select('full_name');
      if (allStudents) {
        const normInput = normalizeArabicText(fullName);
        const isDuplicateName = allStudents.some(
          (s) => normalizeArabicText(s.full_name) === normInput
        );
        if (isDuplicateName) {
          setError('هذا الاسم مسجل مسبقاً بالمنصة، يرجى كتابة اسمك الحقيقي بالكامل لمنع تكرار الحسابات.');
          setIsSubmitting(false);
          return;
        }
      }

      // 7. Register official student directly without Email OTP
      const res = await register({
        full_name: fullName,
        email: cleanEmail,
        password,
        gender,
        academic_year: academicYear,
        study_type: studyType,
        avatar_url: avatarPreview,
        phone: cleanPhone,
        terms_accepted_at: new Date().toISOString(),
        contract_version: 'v2.0-EG',
      });

      if (!res.success) {
        setError(res.error || 'فشل إتمام التسجيل');
      } else if (res.pendingApproval) {
        setRegisteredCode(res.student?.student_code || '');
        setRegStep('pending_approval');
        setSuccess('');
      } else {
        setSuccess('تم إنشاء الحساب والكارنيه الجامعي بنجاح!');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء فحص البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register') {
      return handleInitiateRegistration(e);
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          if (res.pendingApproval) {
            setRegStep('pending_approval');
          } else {
            setError(res.error || 'فشل تسجيل الدخول');
          }
        } else {
          setSuccess('تم تسجيل الدخول بنجاح!');
        }
      } else if (mode === 'guest') {
        const phoneVal = validateEgyptianPhone(phone);
        if (!phoneVal.isValid) {
          setError(phoneVal.error || 'يرجى إدخال رقم هاتف محمول مصري صحيح');
          setIsSubmitting(false);
          return;
        }

        if (isReservedName(fullName)) {
          setError('الاسم يحتوي على كلمات محجوزة غير مسموح بها');
          setIsSubmitting(false);
          return;
        }

        const res = await registerGuest({
          full_name: fullName,
          phone,
          academic_year: academicYear,
          gender,
          study_type: studyType,
        });

        if (!res.success) {
          setError(res.error || 'فشل المتابعة كزائر');
        } else {
          setSuccess('تم تسجيل بيانات الزائر بنجاح، جاري الدخول للمنصة...');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only allow manual closing if user is already authenticated or guest
  const canClose = Boolean(student || isGuest);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md text-right text-slate-900 dark:text-white"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Close button (allowed if already logged in or guest) */}
          {canClose && (
            <button
              onClick={closeAuthModal}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header */}
          <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center mb-1.5 shadow-inner">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {mode === 'register'
                ? 'تسجيل حساب طالب جديد'
                : mode === 'guest'
                ? 'الدخول كزائر للمنصة'
                : 'تسجيل دخول الطالب'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {COLLEGE_NAME} • {PLATFORM_NAME}
            </p>
          </div>

          {regStep === 'pending_approval' ? (
            /* PENDING APPROVAL VIEW WITH WHATSAPP CONFIRMATION BUTTON */
            <div className="py-6 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  تم تسجيل حسابك بنجاح وبانتظار الاعتماد ⏳
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                  تم توثيق بياناتك على منصة الدستور التعليمية. يرجى الضغط على الزر الأخضر أدناه لإرسال بياناتك للمشرف عبر واتساب لاعتماد وتفعيل حسابك والكارنيه فورياً.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5 text-right" dir="rtl">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex justify-between">
                  <span>الاسم الكامل:</span>
                  <span className="text-amber-500">{fullName || 'طالب مسجل'}</span>
                </div>
                {registeredCode && (
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>كود القيد (ID):</span>
                    <span className="text-emerald-400 font-bold">{registeredCode}</span>
                  </div>
                )}
                {email && (
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>البريد الإلكتروني:</span>
                    <span className="text-slate-400">{email}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>رقم الهاتف المحمول:</span>
                    <span className="text-slate-400" dir="ltr">{phone}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px]">
                  <span>الفرقة والشعبة:</span>
                  <span className="text-slate-400">
                    {ACADEMIC_YEARS.find((y) => y.id === academicYear)?.name || academicYear} • {studyType}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={`https://wa.me/${(approvalWhatsApp || '201000000000').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `مرحباً إدارة منصة الدستور التعليمية،\nأود طلب اعتماد وتفعيل حسابي الطلابي:\n👤 الاسم: ${fullName}\n🆔 كود القيد: ${registeredCode || 'جديد'}\n📱 الهاتف: ${phone}\n📧 البريد: ${email}\nالفرقة: ${ACADEMIC_YEARS.find((y) => y.id === academicYear)?.name || academicYear} - الشعبة: ${studyType}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>إرسال بياناتي لاعتماد الحساب عبر واتساب 💬</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setRegStep('form');
                    setMode('login');
                    setError('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Switch Mode Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 my-3 border border-slate-200/80 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                    mode === 'register'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  حساب رسمي
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                    mode === 'login'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  تسجيل دخول
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('guest');
                    setError('');
                  }}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                    mode === 'guest'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الدخول كزائر
                </button>
              </div>

              {/* Notice for Guest Mode */}
              {mode === 'guest' && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] leading-relaxed flex items-start gap-2 shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    للمتابعة كزائر، يرجى كتابة اسمك الحقيقي ورقم هاتفك المصري للتوثيق والاستفادة من
                    المحاضرات والمذكرات.
                  </span>
                </div>
              )}

              {/* Form Area */}
              <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1 pb-1">
                {/* FULL NAME (in register & guest mode) */}
                {(mode === 'register' || mode === 'guest') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الاسم الكامل (ثلاثي أو ثنائي):
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: أحمد محمد محمود"
                        className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* EGYPTIAN MOBILE NUMBER (Required in guest mode, optional in register) */}
                {(mode === 'register' || mode === 'guest') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم الهاتف المحمول (مصر - 11 رقماً):
                      {mode === 'guest' && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required={mode === 'guest'}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="مثال: 01012345678 أو 011... أو 012... أو 015..."
                        dir="ltr"
                        className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono text-right"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      يبدأ بـ 010 أو 011 أو 012 أو 015
                    </span>
                  </div>
                )}

                {/* EMAIL (Required in login & register) */}
                {(mode === 'register' || mode === 'login') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      البريد الإلكتروني (Gmail):
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@gmail.com"
                        dir="ltr"
                        className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono text-right"
                      />
                    </div>
                  </div>
                )}

                {/* PASSWORD (Required in login & register) */}
                {(mode === 'register' || mode === 'login') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      كلمة المرور:
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        dir="ltr"
                        className="w-full h-10 pr-9 pl-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* GENDER & STUDY SYSTEM (in register & guest mode) */}
                {(mode === 'register' || mode === 'guest') && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {/* Gender */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        النوع:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setGender('male')}
                          className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                            gender === 'male'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          طالب 🔵
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('female')}
                          className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                            gender === 'female'
                              ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          طالبة 🟣
                        </button>
                      </div>
                    </div>

                    {/* Study System (انتظام vs انتساب) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الشعبة الدراسية:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStudyType('انتظام')}
                          className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                            studyType === 'انتظام'
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          انتظام
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudyType('انتساب')}
                          className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                            studyType === 'انتساب'
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          انتساب
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ACADEMIC YEAR (in register & guest mode) */}
                {(mode === 'register' || mode === 'guest') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الفرقة الدراسية المقيد بها:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {ACADEMIC_YEARS.map((y) => (
                        <button
                          key={y.id}
                          type="button"
                          onClick={() => setAcademicYear(y.id)}
                          className={`h-9 px-2 rounded-xl border text-xs font-bold transition-all ${
                            academicYear === y.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {y.shortName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* PROFILE PHOTO UPLOAD (in register mode) */}
                {mode === 'register' && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 border-2 border-amber-500/40 overflow-hidden flex items-center justify-center shrink-0">
                        {avatarPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarPreview}
                            alt="معاينة الصورة"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">{gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</span>
                        )}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          صورة الكارنيه الشخصية
                        </span>
                        <span className="text-[10px] text-slate-400">
                          اختياري • ستظهر على بطاقتك الجامعية
                        </span>
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{avatarPreview ? 'تغيير' : 'اختيار صورة'}</span>
                    </button>
                  </div>
                )}

                {/* Mandatory 20-Article Legal Charter Consent */}
                {mode === 'register' && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 shrink-0 cursor-pointer"
                      />
                      <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        أقر بأنني قرأت ووافقت بكامل الأهلية المعتبرة قانوناً على{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsContractOpen(true);
                          }}
                          className="font-bold text-amber-500 hover:text-amber-400 underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <Scale className="w-3 h-3 inline" />
                          <span>شروط الاستخدام والعقد القانوني المكون من 20 مادة</span>
                        </button>
                        {' '}وفقاً للقانون رقم 15 لسنة 2004 والقانون رقم 151 لسنة 2020.
                      </span>
                    </label>
                  </div>
                )}

                {/* Error & Success Messages */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : mode === 'register' ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>إنشاء الحساب واعتماد الكارنيه 🎓</span>
                      </>
                    ) : mode === 'guest' ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>متابعة الدخول كزائر 🚀</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>تسجيل الدخول للمنصة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>

      {/* 20-Article Legal Contract Reader Modal */}
      <LegalContractModal
        isOpen={isContractOpen}
        onClose={() => setIsContractOpen(false)}
        onAccept={() => setTermsAccepted(true)}
      />
    </AnimatePresence>
  );
}

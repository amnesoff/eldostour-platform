'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
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
import { compressImageFile, isReservedName, validateEgyptianPhone, validateStudentName } from '@/lib/authUtils';
import { studentFetchPublicConfig } from '@/lib/apiClient';
import { LegalContractModal } from '@/components/legal/LegalContractModal';

const WHATSAPP_APPROVAL_NUMBER = '201122144007';

export function StudentAuthModal() {
  const {
    student,
    isGuest,
    isAuthModalOpen,
    closeAuthModal,
    modalDefaultMode,
    login,
    register,
    enterGuestPreviewMode,
  } = useStudentAuth();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields - Phone-Only (No email)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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
  const [whatsappTargetPhone, setWhatsappTargetPhone] = useState(WHATSAPP_APPROVAL_NUMBER);
  const [whatsappTargetName, setWhatsappTargetName] = useState('');
  const [isRegistrationPaused, setIsRegistrationPaused] = useState(false);
  const [isPlatformLocked, setIsPlatformLocked] = useState(false);

  // Legal Terms & Contract Modal
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isContractOpen, setIsContractOpen] = useState(false);

  // Fetch emergency switches safely from server config
  useEffect(() => {
    studentFetchPublicConfig()
      .then((cfg) => {
        if (cfg?.registration_paused) {
          setIsRegistrationPaused(true);
        }
        if (cfg?.platform_locked || cfg?.maintenance_mode) {
          setIsPlatformLocked(true);
        }
      })
      .catch(() => {});
  }, [isAuthModalOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with trigger
  useEffect(() => {
    if (modalDefaultMode) {
      if (modalDefaultMode === 'guest') {
        setMode('register');
      } else {
        setMode(modalDefaultMode);
      }
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

  const handleInitiateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 0. Check Terms Consent
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

    // 2. Reject Reserved Words
    if (isReservedName(fullName)) {
      setError('الاسم يحتوي على كلمات محجوزة أو ألقاب إدارية غير مسموح بها (مثل أدمن، مدير، الدستور، مازن...).');
      return;
    }

    // 3. Validate Egyptian Phone Number
    const phoneVal = validateEgyptianPhone(phone);
    if (!phoneVal.isValid) {
      setError(phoneVal.error || 'يرجى إدخال رقم هاتف محمول مصري صحيح (11 رقماً تبدأ بـ 010 أو 011 أو 012 أو 015)');
      return;
    }

    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب ألا تقل عن 8 خانات وتحتوي على أحرف وأرقام');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = phone.trim().replace(/[\s-]/g, '');

      const res = await register({
        full_name: fullName,
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
      } else {
        // On successful registration, always open the WhatsApp Activation modal (Round-Robin)
        setRegisteredCode(res.student?.student_code || '');
        if (res.whatsapp_target?.phone) {
          setWhatsappTargetPhone(res.whatsapp_target.phone.replace(/\D/g, '') || WHATSAPP_APPROVAL_NUMBER);
          setWhatsappTargetName(res.whatsapp_target.name || '');
        }
        setRegStep('pending_approval');
        setSuccess('');
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

    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!cleanPhone || !password) {
      setError('يرجى إدخال رقم الهاتف المسجل وكلمة المرور');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(cleanPhone, password);
      if (!res.success) {
        if (res.pendingApproval) {
          setRegStep('pending_approval');
        } else {
          setError(res.error || 'رقم الهاتف أو كلمة المرور غير صحيحة');
        }
      } else {
        setSuccess('تم تسجيل الدخول بنجاح!');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Allow manual closing if user is already authenticated or guest
  const canClose = Boolean(student || isGuest);

  const selectedYearName = ACADEMIC_YEARS.find((y) => y.id === academicYear)?.name || `الفرقة ${academicYear}`;

  const whatsappMessageText = [
    'أهلاً بإدارة منصة الدستور التعليمية، تم تسجيل طالب جديد ويرجى تفعيل حسابه:',
    'ــــــــــــــــــــ',
    `الاسم: ${fullName || 'طالب مسجل'}`,
    'ــــــــــــــــــــ',
    `رقم الهاتف: ${phone}`,
    'ــــــــــــــــــــ',
    `الفرقة الدراسية: ${selectedYearName} (${studyType})`,
    'ــــــــــــــــــــ',
    `كلمة المرور: ${password || 'مسجلة'}`,
    'ــــــــــــــــــــ',
  ].join('\n');

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
          className="relative w-[95vw] sm:w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
        >
          {/* Close button (allowed if already logged in or guest) */}
          {canClose && (
            <button
              onClick={closeAuthModal}
              className="absolute top-4 left-4 p-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
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
              {regStep === 'pending_approval'
                ? 'تفعيل الحساب عبر واتساب الإدارة'
                : mode === 'register'
                ? 'إنشاء حساب طالب جديد'
                : 'تسجيل الدخول للمنصة'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {COLLEGE_NAME} • {PLATFORM_NAME}
            </p>
          </div>

          {regStep === 'pending_approval' ? (
            /* WHATSAPP ACTIVATION MODAL */
            <div className="py-5 px-3 sm:px-4 text-center space-y-4 overflow-y-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <Clock className="w-8 h-8 animate-pulse text-emerald-400" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  تفعيل الحساب عبر واتساب الإدارة ⏳
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                  تم تسجيل بياناتك بنجاح. للحفاظ على أمان المنصة، يتم تفعيل الحساب ومطابقة رقم الهاتف مباشرة عبر واتساب الإدارة.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2 text-right" dir="rtl">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex justify-between">
                  <span>اسم الطالب:</span>
                  <span className="text-amber-500 font-bold">{fullName || 'طالب مسجل'}</span>
                </div>
                {phone && (
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>رقم الهاتف المسجل:</span>
                    <span className="text-slate-300 font-bold" dir="ltr">{phone}</span>
                  </div>
                )}
                {registeredCode && (
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>كود القيد (ID):</span>
                    <span className="text-emerald-400 font-bold">{registeredCode}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px]">
                  <span>الفرقة والشعبة:</span>
                  <span className="text-slate-300 font-bold">
                    {selectedYearName} • {studyType}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {whatsappTargetName && (
                  <p className="text-[11px] font-bold text-emerald-400">
                    سيتم التوجيه تلقائياً إلى: {whatsappTargetName}
                  </p>
                )}
                <a
                  href={`https://wa.me/${whatsappTargetPhone || WHATSAPP_APPROVAL_NUMBER}?text=${encodeURIComponent(whatsappMessageText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>اضغط هنا لإرسال رسالة التفعيل على واتساب 💬</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setRegStep('form');
                    setMode('login');
                    setError('');
                  }}
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Primary Switch Mode Tabs (تسجيل الدخول vs إنشاء حساب جديد) */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 my-3 border border-slate-200/80 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`min-h-[44px] py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  إنشاء حساب جديد
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`min-h-[44px] py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  تسجيل الدخول
                </button>
              </div>

              {/* Notice for Paused Registration */}
              {isRegistrationPaused && mode === 'register' && (
                <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs leading-relaxed flex items-start justify-between gap-2 shrink-0">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>
                      التسجيل متوقف مؤقتاً بقرار من إدارة المنصة لإجراء صيانة دورية. إذا كان لديك حساب بالفعل، يرجى تسجيل الدخول.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="min-h-[44px] px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    تسجيل الدخول
                  </button>
                </div>
              )}

              {/* Form Area */}
              <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1 pb-1">
                {/* FULL NAME (Registration Only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الاسم الكامل (ثلاثي أو ثنائي كما بالكارنيه):
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: أحمد محمد محمود"
                        className="w-full min-h-[44px] h-11 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* 11-DIGIT EGYPTIAN PHONE NUMBER (Login & Registration - Unique ID) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف المحمول (مصر - 11 رقماً):
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010xxxxxxxx أو 011... أو 012... أو 015..."
                      dir="ltr"
                      className="w-full min-h-[44px] h-11 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono text-right"
                    />
                  </div>

                  {/* PROMINENT REGISTRATION WARNING ALERT DIRECTLY BELOW PHONE NUMBER */}
                  {mode === 'register' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-500 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2 shadow-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <span className="font-bold">
                        تنبيه هام: لازم تكتب رقم تليفونك الحقيقي (اللي عليه واتساب) عشان هنتأكد منه ونطابقه في قاعدة البيانات قبل تفعيل حسابك.
                      </span>
                    </div>
                  )}
                </div>

                {/* PASSWORD */}
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
                      className="w-full min-h-[44px] h-11 pr-9 pl-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'register' && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      لا تقل عن 8 خانات وتحتوي على أحرف وأرقام
                    </span>
                  )}
                </div>

                {/* GENDER & STUDY SYSTEM (Registration Only) */}
                {mode === 'register' && (
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
                          className={`min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
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
                          className={`min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
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
                          className={`min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
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
                          className={`min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
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

                {/* ACADEMIC YEAR (Registration Only) */}
                {mode === 'register' && (
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
                          className={`min-h-[44px] px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
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

                {/* PROFILE PHOTO UPLOAD (Registration Only) */}
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
                      className="min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
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
                    disabled={
                      isSubmitting ||
                      (isRegistrationPaused && mode === 'register') ||
                      (isPlatformLocked && mode === 'login')
                    }
                    className="w-full min-h-[44px] h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPlatformLocked ? (
                      <span>المنصة في وضع الصيانة 🔒</span>
                    ) : isRegistrationPaused && mode === 'register' ? (
                      <span>التسجيل مُعلّق مؤقتاً ⏸️</span>
                    ) : mode === 'register' ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>إنشاء الحساب واعتماد الكارنيه 🎓</span>
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

              {/* LARGE CIRCULAR GUEST BUTTON & ANIMATED SUBTITLE */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-center shrink-0 flex flex-col items-center">
                <button
                  type="button"
                  onClick={enterGuestPreviewMode}
                  className="group relative flex flex-col items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-dashed border-amber-500/50 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 transition-all active:scale-90 shadow-md shadow-amber-500/10 cursor-pointer"
                  title="الدخول في وضع المعاينة كزائر"
                >
                  <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform mb-0.5" />
                  <span className="text-[10px] font-black tracking-tight">دخول زائر</span>
                  <div className="absolute inset-0 rounded-full bg-amber-400/10 animate-ping pointer-events-none opacity-40" />
                </button>

                <motion.p
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-[11px] sm:text-xs text-slate-500 dark:text-amber-300/80 font-bold mt-2.5 max-w-xs leading-relaxed"
                >
                  «زائر — ولكن لن تستفيد بالمحاضرات، للاستفادة انضم لينا واعمل صفحة»
                </motion.p>
              </div>
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

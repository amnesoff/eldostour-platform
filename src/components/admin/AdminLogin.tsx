'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  User,
  KeyRound,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  LifeBuoy,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { adminLoginCredentials, adminVerifyPin, adminRecoveryLogin } from '@/lib/apiClient';
import { logAdminSecurityEvent } from '@/lib/authUtils';
import { AdminSession } from '@/types';

interface AdminLoginProps {
  onSuccess: () => void;
  gateType?: 'super_admin' | 'staff';
}

export function AdminLogin({ onSuccess, gateType = 'super_admin' }: AdminLoginProps) {
  const [step, setStep] = useState<'credentials' | 'pin'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Master Recovery Code Mode (Only available for Super Admin Gate)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  // Lockout State
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Verified admin pending PIN validation
  const [pendingAdmin, setPendingAdmin] = useState<{
    username: string;
    is_super_admin: boolean;
  } | null>(null);

  // Check lockout on mount and tick
  useEffect(() => {
    const checkLockout = () => {
      const lockUntil = parseInt(localStorage.getItem('eldostour_admin_locked_until') || '0', 10);
      const now = Date.now();
      if (lockUntil > now) {
        setLockoutRemaining(Math.ceil((lockUntil - now) / 1000));
      } else {
        setLockoutRemaining(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const recordFailedAttempt = async (targetUser: string, reason: string) => {
    const currentAttempts = parseInt(localStorage.getItem('eldostour_admin_failed_attempts') || '0', 10) + 1;
    localStorage.setItem('eldostour_admin_failed_attempts', currentAttempts.toString());

    await logAdminSecurityEvent('failed_login', targetUser || 'مجهول', `${reason} (محاولة ${currentAttempts}/3) [${gateType}]`);

    if (currentAttempts >= 3) {
      const lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
      localStorage.setItem('eldostour_admin_locked_until', lockUntil.toString());
      setLockoutRemaining(15 * 60);
      await logAdminSecurityEvent('lockout', targetUser || 'مجهول', 'تم إغلاق محاولات تسجيل الدخول أمنياً لمدة 15 دقيقة بعد 3 محاولات فاشلة');
      setError('تم قفل النظام أمنياً لمدة 15 دقيقة بعد 3 محاولات خاطئة متتالية لحماية لوحة التحكم.');
      setStep('credentials');
      setPendingAdmin(null);
    } else {
      setError(`${reason} - المحاولات المتبقية قبل القفل الأمني: ${3 - currentAttempts}`);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;
    setError('');
    setLoading(true);

    try {
      const cleanUsername = username.trim();
      const res = await adminLoginCredentials(cleanUsername, password, gateType);

      if (res.success && res.step === 'pin') {
        setPendingAdmin({
          username: res.username,
          is_super_admin: Boolean(res.is_super_admin),
        });
        setStep('pin');
      } else {
        await recordFailedAttempt(cleanUsername, res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      console.warn('Admin login error:', err);
      setError('حدث خطأ أثناء الاتصال بالخادم الأمني، يرجى إعادة المحاولة');
    } finally {
      setLoading(false);
    }
  };

  // Master Recovery Code Handler
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;
    setError('');
    setLoading(true);

    try {
      const cleanUsername = username.trim();
      const cleanCode = recoveryCode.trim().toUpperCase();

      if (!cleanCode) {
        setError('يرجى إدخال كود الاسترداد الطارئ');
        setLoading(false);
        return;
      }

      const res = await adminRecoveryLogin(cleanUsername, cleanCode);

      if (res.success && res.session) {
        // Clear lockouts
        localStorage.removeItem('eldostour_admin_failed_attempts');
        localStorage.removeItem('eldostour_admin_locked_until');

        sessionStorage.setItem('eldostour_admin_auth', 'authenticated');
        sessionStorage.setItem('eldostour_admin_session', JSON.stringify(res.session));
        sessionStorage.setItem('eldostour_admin_login_time', Date.now().toString());
        sessionStorage.setItem('eldostour_admin_last_activity', Date.now().toString());

        onSuccess();
      } else {
        await recordFailedAttempt(cleanUsername, res.error || 'كود الاسترداد غير صحيح أو تم استخدامه مسبقاً');
      }
    } catch (err: any) {
      console.warn('Recovery error:', err);
      setError('حدث خطأ أثناء فحص كود الاسترداد');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    // Auto-advance
    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0 || !pendingAdmin) return;
    const enteredPin = pin.join('');
    if (enteredPin.length !== 6) {
      setError('يرجى إدخال رمز الأمان كاملاً (6 أرقام)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await adminVerifyPin(pendingAdmin.username, enteredPin, pendingAdmin.is_super_admin);

      if (res.success && res.session) {
        // Clear failed attempts
        localStorage.removeItem('eldostour_admin_failed_attempts');
        localStorage.removeItem('eldostour_admin_locked_until');

        sessionStorage.setItem('eldostour_admin_auth', 'authenticated');
        sessionStorage.setItem('eldostour_admin_session', JSON.stringify(res.session));
        sessionStorage.setItem('eldostour_admin_login_time', Date.now().toString());
        sessionStorage.setItem('eldostour_admin_last_activity', Date.now().toString());

        onSuccess();
      } else {
        await recordFailedAttempt(pendingAdmin.username, res.error || 'رمز الأمان السداسي (PIN) غير صحيح');
      }
    } catch (err: any) {
      console.warn('PIN validation error:', err);
      setError('حدث خطأ أثناء فحص رمز الأمان');
    } finally {
      setLoading(false);
    }
  };

  const formatLockoutTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isStaffGate = gateType === 'staff';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040814] via-[#091124] to-[#02050D] text-white p-4 select-none relative overflow-hidden" dir="rtl">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-right"
      >
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-4 text-amber-400 shadow-lg shadow-amber-500/15">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <Logo size="md" showSubtitle={false} />
          <h2 className="text-xl font-black text-white mt-3">
            {isStaffGate ? 'بوابة المشرفين وفريق العمل' : 'بوابة الإدارة المركزية والحماية'}
          </h2>
          <p className="text-xs text-amber-400/80 font-medium mt-1">
            {isStaffGate
              ? 'نظام التحقق المعتمد للمشرفين الفرعيين'
              : 'نظام الحماية متعدد العوامل (Fortress-Grade 3FA)'}
          </p>
        </div>

        {/* Lockout Banner */}
        {lockoutRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-400 mb-6 text-right"
          >
            <ShieldAlert className="w-6 h-6 shrink-0 text-red-400 animate-pulse" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold block text-sm">النظام مغلق أمنياً!</span>
              بسبب 3 محاولات فاشلة متتالية، تم تجميد تسجيل الدخول مؤقتاً.
              <div className="mt-1 font-mono font-bold text-amber-300">
                الوقت المتبقي: {formatLockoutTimer(lockoutRemaining)}
              </div>
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {error && lockoutRemaining === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold mb-5"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {isRecoveryMode ? (
            /* RECOVERY CODE LOGIN FORM */
            <motion.form
              key="step-recovery"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRecoverySubmit}
              className="space-y-4"
            >
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 shrink-0 text-amber-400" />
                <span>وضع استرداد الطوارئ — كود أحادي الاستخدام (One-Time)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اسم المشرف العام:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-amber-400/80 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المشرف..."
                    autoComplete="off"
                    disabled={lockoutRemaining > 0 || loading}
                    required
                    className="w-full h-11 pr-11 pl-4 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white text-sm outline-none transition-all text-right disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  كود الاسترداد الرئيسي (DST-REC-XXXX-XXXX):
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-amber-400/80 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="DST-REC-XXXX-XXXX"
                    autoComplete="off"
                    dir="ltr"
                    disabled={lockoutRemaining > 0 || loading}
                    required
                    className="w-full h-11 pr-11 pl-4 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-amber-400 font-mono font-bold text-sm outline-none transition-all text-center tracking-wider disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setError('');
                  }}
                  className="w-1/3 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading || lockoutRemaining > 0 || !username.trim() || !recoveryCode.trim()}
                  className="w-2/3 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>دخول بكود الاسترداد 🔓</span>}
                </button>
              </div>
            </motion.form>
          ) : step === 'credentials' ? (
            /* STEP 1: USERNAME & PASSWORD */
            <motion.form
              key="step-credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCredentialsSubmit}
              className="space-y-4"
            >
              {/* Username Input - Strictly Blank, Zero-Hint */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اسم المشرف أو المسؤول:
                </label>
                <div className="relative">
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4 text-amber-400/80" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المشرف..."
                    autoComplete="off"
                    disabled={lockoutRemaining > 0 || loading}
                    required
                    className="w-full h-11 pr-11 pl-4 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white text-sm outline-none transition-all text-right disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  كلمة المرور المشفرة (SHA-256):
                </label>
                <div className="relative">
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4 text-amber-400/80" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="off"
                    disabled={lockoutRemaining > 0 || loading}
                    required
                    className="w-full h-11 pr-11 pl-11 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white text-sm outline-none transition-all text-right disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                  <span>المرحلة 1 من 2: التحقق الأولي</span>
                  <span className="text-amber-400/80">3 محاولات كحد أقصى</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || lockoutRemaining > 0 || !username.trim() || !password.trim()}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ التحقق المشفر...</span>
                  </>
                ) : (
                  <>
                    <span>متابعة إلى رمز الأمان السداسي (PIN)</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>

              {/* Master Recovery Code Entry Link for Super Admin Gate */}
              {!isStaffGate && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryMode(true);
                      setError('');
                    }}
                    className="text-[11px] text-amber-400/70 hover:text-amber-300 underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    استخدام كود الاسترداد الرئيسي للطوارئ 🚨
                  </button>
                </div>
              )}
            </motion.form>
          ) : (
            /* STEP 2: 6-DIGIT SECURITY PIN */
            <motion.form
              key="step-pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePinSubmit}
              className="space-y-5"
            >
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تم اعتماد كلمة المرور بنجاح</span>
                </div>
                <h3 className="text-sm font-bold text-slate-200">
                  أدخل رمز الأمان السداسي الخاص بـ ({pendingAdmin?.username})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  المرحلة 2 من 2: التحقق من كود الـ PIN المكون من 6 أرقام
                </p>
              </div>

              {/* 6 PIN Input Boxes */}
              <div className="flex justify-center gap-2" dir="ltr">
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      pinInputRefs.current[idx] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoComplete="off"
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    disabled={lockoutRemaining > 0 || loading}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 text-amber-400 outline-none transition-all"
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setPin(['', '', '', '', '', '']);
                    setError('');
                  }}
                  disabled={loading}
                  className="w-1/3 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  رجوع
                </button>

                <button
                  type="submit"
                  disabled={loading || lockoutRemaining > 0 || pin.join('').length !== 6}
                  className="w-2/3 h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>تأكيد...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>دخول لوحة التحكم</span>
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-8 pt-5 border-t border-white/10 text-center text-xs text-slate-500 flex items-center justify-between">
          <span>حماية مشفرة طبقاً لمعايير SHA-256</span>
          <span className="text-amber-400/80">إشراف: مازن شكري</span>
        </div>
      </motion.div>
    </div>
  );
}

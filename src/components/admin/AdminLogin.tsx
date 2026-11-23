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
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase';
import { hashSha256, logAdminSecurityEvent } from '@/lib/authUtils';
import { AdminSession, SubAdminUser } from '@/types';

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [step, setStep] = useState<'credentials' | 'pin'>('credentials');
  const [username, setUsername] = useState('Dr. Mazen 2006');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Lockout State
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Verified admin pending PIN validation
  const [pendingAdmin, setPendingAdmin] = useState<{
    username: string;
    is_super_admin: boolean;
    pin_hash: string;
    session_version: number;
    subAdminData?: SubAdminUser;
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

    await logAdminSecurityEvent('failed_login', targetUser, `${reason} (محاولة ${currentAttempts}/3)`);

    if (currentAttempts >= 3) {
      const lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
      localStorage.setItem('eldostour_admin_locked_until', lockUntil.toString());
      setLockoutRemaining(15 * 60);
      await logAdminSecurityEvent('lockout', targetUser, 'تم إغلاق محاولات تسجيل الدخول أمنياً لمدة 15 دقيقة بعد 3 محاولات فاشلة');
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
      const enteredPasswordHash = await hashSha256(password.trim());

      // 1. Check Super Admin in public.admin_security
      const { data: securityRow } = await supabase
        .from('admin_security')
        .select('*')
        .eq('id', 'primary')
        .maybeSingle();

      const defaultSuperUsername = securityRow?.admin_username || 'Dr. Mazen 2006';
      // Default password hash for 'Mazen@2026'
      const defaultSuperPasswordHash =
        securityRow?.password_hash || 'b33b653a50da45bba3409e563f479875fc2e3a379d8a478bd515f5594de12200';
      // Default PIN hash for '202600'
      const defaultSuperPinHash =
        securityRow?.pin_hash || '588505a0785bab576624a7783e03236d3858987ca0a59b5ce340c6c5e808e5bf';

      const isSuperUserMatch =
        cleanUsername.toLowerCase() === defaultSuperUsername.toLowerCase();

      if (isSuperUserMatch) {
        if (enteredPasswordHash === defaultSuperPasswordHash) {
          // Super admin credentials passed -> proceed to PIN
          setPendingAdmin({
            username: defaultSuperUsername,
            is_super_admin: true,
            pin_hash: defaultSuperPinHash,
            session_version: securityRow?.session_version || 1,
          });
          setStep('pin');
          setLoading(false);
          return;
        } else {
          await recordFailedAttempt(cleanUsername, 'كلمة المرور غير صحيحة');
          setLoading(false);
          return;
        }
      }

      // 2. Check Sub-Admins in public.admin_users
      const { data: subAdmin, error: subError } = await supabase
        .from('admin_users')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (subAdmin && !subError) {
        if (enteredPasswordHash === subAdmin.password_hash) {
          setPendingAdmin({
            username: subAdmin.username,
            is_super_admin: false,
            pin_hash: subAdmin.pin_hash,
            session_version: 1,
            subAdminData: subAdmin as SubAdminUser,
          });
          setStep('pin');
          setLoading(false);
          return;
        } else {
          await recordFailedAttempt(cleanUsername, 'كلمة مرور المشرف غير صحيحة');
          setLoading(false);
          return;
        }
      }

      // Neither matched
      await recordFailedAttempt(cleanUsername, 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } catch (err: any) {
      console.warn('Admin login error:', err);
      setError('حدث خطأ أثناء الاتصال بالخادم الأمني، يرجى إعادة المحاولة');
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
      const enteredPinHash = await hashSha256(enteredPin);

      if (enteredPinHash === pendingAdmin.pin_hash) {
        // Success! Clear failed attempts
        localStorage.removeItem('eldostour_admin_failed_attempts');
        localStorage.removeItem('eldostour_admin_locked_until');

        const sessionPayload: AdminSession = {
          username: pendingAdmin.username,
          is_super_admin: pendingAdmin.is_super_admin,
          session_version: pendingAdmin.session_version,
          permissions: pendingAdmin.is_super_admin
            ? {
                can_manage_students: true,
                can_manage_content: true,
                can_delete_content: true,
                can_access_student_vault: true,
              }
            : {
                can_manage_students: pendingAdmin.subAdminData?.can_manage_students || false,
                can_manage_content: pendingAdmin.subAdminData?.can_manage_content || true,
                can_delete_content: pendingAdmin.subAdminData?.can_delete_content || false,
                can_access_student_vault: pendingAdmin.subAdminData?.can_access_student_vault || false,
              },
        };

        sessionStorage.setItem('eldostour_admin_auth', 'authenticated');
        sessionStorage.setItem('eldostour_admin_session', JSON.stringify(sessionPayload));
        sessionStorage.setItem('eldostour_admin_login_time', Date.now().toString());
        sessionStorage.setItem('eldostour_admin_last_activity', Date.now().toString());

        await logAdminSecurityEvent(
          'successful_login',
          pendingAdmin.username,
          `تم تسجيل دخول ناجح متعدد العوامل (${pendingAdmin.is_super_admin ? 'مشرف عام' : 'مشرف فرعي'})`
        );

        onSuccess();
      } else {
        await recordFailedAttempt(pendingAdmin.username, 'رمز الأمان السداسي (PIN) غير صحيح');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040814] via-[#091124] to-[#02050D] text-white p-4 select-none relative overflow-hidden">
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
            بوابة الإدارة المركزية والحماية
          </h2>
          <p className="text-xs text-amber-400/80 font-medium mt-1">
            نظام الحماية متعدد العوامل (Fortress-Grade 3FA)
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
          {step === 'credentials' ? (
            /* STEP 1: USERNAME & PASSWORD */
            <motion.form
              key="step-credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCredentialsSubmit}
              className="space-y-4"
            >
              {/* Username Input */}
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
                    placeholder="Dr. Mazen 2006 أو اسم المشرف..."
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
                    placeholder="أدخل كلمة المرور..."
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


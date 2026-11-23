'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Wrench, RefreshCw, MessageCircle, Lock, ArrowLeft } from 'lucide-react';
import { studentFetchPublicConfig } from '@/lib/apiClient';

export function PlatformLockEnforcer() {
  const pathname = usePathname();
  const [isLocked, setIsLocked] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('201000000000');
  const [isChecking, setIsChecking] = useState(false);

  // Check if current route is an administrative portal
  const isAdminRoute =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/admin-dostour-control') ||
    pathname?.startsWith('/command-') ||
    pathname?.startsWith('/staff-');

  const checkLockState = async () => {
    // If admin is active in this browser tab or on an admin route, do not lock out admin
    if (typeof window !== 'undefined') {
      const adminAuth = sessionStorage.getItem('eldostour_admin_auth');
      if (adminAuth === 'authenticated' || isAdminRoute) {
        setIsLocked(false);
        return;
      }
    }

    setIsChecking(true);
    try {
      const cfg = await studentFetchPublicConfig();
      if (cfg) {
        const locked = Boolean(
          cfg.platform_locked || cfg.platform_lockdown || cfg.maintenance_mode
        );
        setIsLocked(locked);
        if (cfg.whatsapp_approval_number) {
          setWhatsappNumber(cfg.whatsapp_approval_number);
        }
      }
    } catch (err) {
      console.warn('Could not check platform lock status:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkLockState();

    // Re-check periodically every 20 seconds
    const interval = setInterval(checkLockState, 20000);
    return () => clearInterval(interval);
  }, [pathname]);

  // If on admin route or not locked, do not render overlay
  if (isAdminRoute || !isLocked) {
    return null;
  }

  const cleanPhone = whatsappNumber.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    'مرحباً، أود الاستفسار عن موعد عودة منصة الدستور للعمل من وضع الصيانة الطارئة.'
  )}`;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[99999] bg-[#070c18] flex items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-rose-500/30 selection:text-rose-200"
    >
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-xl w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6">
        {/* Animated Security Icon Badge */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 shadow-xl shadow-red-500/10 animate-pulse">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Wrench className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-black tracking-wide">
            وضع قفل المنصة الشامل والصيانة الطارئة 🔒
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            منصة الدستور التعليمية
          </h1>
          <p className="text-sm font-semibold text-amber-400">
            المنصة قيد الترقية الأمنية والصيانة الأكاديمية بقرار من الإدارة العليا
          </p>
        </div>

        {/* Detailed Explanation */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed text-right space-y-2">
          <p>
            أعزاءنا طلاب كلية الحقوق والعلوم القانونية، نعتذر عن هذا التوقف المؤقت.
          </p>
          <p className="text-slate-400">
            تم تفعيل قفل المنصة المؤقت لإجراء تحسينات أمنية دورية وترقية خوادم قواعد البيانات لضمان أعلى سرعة وأمان لحساباتكم ومحتوى المحاضرات.
          </p>
          <p className="text-emerald-400 font-bold">
            ستعود المنصة للعمل بكامل طاقتها فور انتهاء عمليات الفحص والاعتماد الفني.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل مع الدعم الفني (WhatsApp)</span>
          </a>

          <button
            onClick={checkLockState}
            disabled={isChecking}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>فحص حالة المنصة</span>
          </button>
        </div>

        {/* Footer Admin Link */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <span>هل أنت أحد أعضاء هيئة الإشراف؟</span>
          <a
            href="/admin"
            className="text-amber-400 hover:text-amber-300 underline font-bold inline-flex items-center gap-1"
          >
            <span>بوابة الإدارة المركزية</span>
            <ArrowLeft className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

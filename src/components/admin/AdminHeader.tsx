'use client';

import React, { useState } from 'react';
import { LogOut, ShieldCheck, Clock, ShieldAlert, Crown, AlertTriangle, Loader2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase';
import { logAdminSecurityEvent } from '@/lib/authUtils';
import { AdminSession } from '@/types';

interface AdminHeaderProps {
  onLogout: () => void;
  adminSession: AdminSession | null;
}

export function AdminHeader({ onLogout, adminSession }: AdminHeaderProps) {
  const [isPanicModalOpen, setIsPanicModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handlePanicRevoke = async () => {
    setIsRevoking(true);
    try {
      // 1. Fetch current security row and increment session_version
      const { data: currentSec } = await supabase
        .from('admin_security')
        .select('session_version')
        .eq('id', 'primary')
        .single();

      const newVersion = (currentSec?.session_version || 1) + 1;

      await supabase
        .from('admin_security')
        .update({
          session_version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'primary');

      // 2. Log panic event
      await logAdminSecurityEvent(
        'panic_revoke',
        adminSession?.username || 'Admin',
        `تم تفعيل إغلاق الطوارئ المركزي وإبطال كافة الجلسات النشطة (الإصدار الجديد: ${newVersion})`
      );

      // 3. Clear session and logout immediately
      sessionStorage.clear();
      onLogout();
    } catch (err) {
      console.warn('Panic revoke error:', err);
      sessionStorage.clear();
      onLogout();
    } finally {
      setIsRevoking(false);
      setIsPanicModalOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo and Admin Badge */}
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-400 text-xs font-bold">
              {adminSession?.is_super_admin ? (
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{adminSession?.username || 'لوحة تحكم المشرفين'}</span>
              {adminSession?.is_super_admin && (
                <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded font-mono text-amber-300">
                  Super Admin
                </span>
              )}
            </div>
          </div>

          {/* Right side: Panic Button + Inactivity Notice + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Inactivity Notice */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>تسجيل خروج تلقائي بعد 30 دقيقة خمول</span>
            </div>

            {/* Panic Session Revoke Button */}
            <button
              onClick={() => setIsPanicModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              title="إغلاق الطوارئ وإبطال كافة الجلسات النشطة من كل الأجهزة فوراً"
            >
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 group-hover:text-white animate-pulse" />
              <span className="hidden sm:inline">إغلاق الطوارئ المركزي 🚨</span>
              <span className="sm:hidden">طوارئ 🚨</span>
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title="تسجيل الخروج من لوحة التحكم"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Panic Revoke Confirmation Modal */}
      {isPanicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" dir="rtl">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl text-right">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-4 text-red-400 mx-auto">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>

            <h3 className="text-lg font-black text-white text-center">
              تفعيل إغلاق الطوارئ المركزي (Panic Revoke)
            </h3>

            <p className="text-xs text-slate-300 mt-2 text-center leading-relaxed">
              هل أنت متأكد من رغبتك في إبطال وإنهاء <strong className="text-red-400">جميع الجلسات النشطة في الحال</strong> لكافة الأجهزة والمتصفحات؟
              <br />
              سيتم رفع إصدار الجلسات الأمني (<code className="text-amber-400 font-mono">session_version</code>) وطرد أي جهاز متصل فوراً لحماية النظام.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setIsPanicModalOpen(false)}
                disabled={isRevoking}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>

              <button
                onClick={handlePanicRevoke}
                disabled={isRevoking}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ الإبطال...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>تأكيد الإغلاق الشامل</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


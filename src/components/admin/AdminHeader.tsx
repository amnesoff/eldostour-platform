'use client';

import React from 'react';
import { LogOut, ShieldCheck, Clock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

interface AdminHeaderProps {
  onLogout: () => void;
  lastActiveTime?: number;
}

export function AdminHeader({ onLogout }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo and Admin Badge */}
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>لوحة تحكم المشرفين</span>
          </div>
        </div>

        {/* Right side: Auto-logout notice + Logout button */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>تسجيل خروج تلقائي بعد 30 دقيقة خمول</span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold transition-all active:scale-95"
            title="تسجيل الخروج من لوحة التحكم"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}

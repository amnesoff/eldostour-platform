import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040814] via-[#091124] to-[#02050D] text-white p-4 select-none relative overflow-hidden" dir="rtl">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <Logo size="md" showSubtitle={false} />

        <div className="space-y-2">
          <span className="text-4xl font-black font-mono text-amber-400 tracking-wider">404</span>
          <h2 className="text-lg font-black text-white">
            الصفحة غير موجودة أو المسار محمي
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            عذراً، الرابط الذي تحاول الوصول إليه غير متاح، أو يتطلب تصريحاً خاصاً ومساراً أمنياً معتمداً.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>العودة للصفحة الرئيسية للمنصة</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          منصة الدستور التعليمية • نظام الحماية المركزي
        </div>
      </div>
    </div>
  );
}

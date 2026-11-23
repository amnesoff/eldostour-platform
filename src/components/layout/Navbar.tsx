'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Moon,
  Sun,
  Users,
  Search,
  User,
  Heart,
  Crown,
  Award,
  ShieldCheck,
  X,
  Type,
  Zap,
  IdCard,
  UserPlus,
} from 'lucide-react';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { useTheme } from '@/context/ThemeContext';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { TEAM_CREDITS, LEADERSHIP_BAR_TEXT, COLLEGE_NAME } from '@/lib/constants';
import { DigitalStudentIdCard } from '@/components/tools/DigitalStudentIdCard';

interface NavbarProps {
  onOpenSearch?: () => void;
}

export function Navbar({ onOpenSearch }: NavbarProps) {
  const {
    theme,
    toggleTheme,
    gender,
    toggleGender,
    fontSize,
    setFontSize,
    dataSaverMode,
    toggleDataSaverMode,
  } = useTheme();
  const { student, isGuest, openAuthModal } = useStudentAuth();
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);

  const cycleFontSize = () => {
    if (fontSize === 'normal') setFontSize('lg');
    else if (fontSize === 'lg') setFontSize('sm');
    else setFontSize('normal');
  };

  const iconMap: Record<string, React.ReactNode> = {
    Crown: <Crown className="w-4 h-4 text-amber-500" />,
    Award: <Award className="w-4 h-4 text-emerald-500" />,
    ShieldCheck: <ShieldCheck className="w-4 h-4 text-blue-500" />,
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/90 dark:bg-[#070c18]/90 border-b border-slate-200/90 dark:border-slate-800/80 transition-colors">
        {/* Leadership Top Notice Bar (Compact, non-overlapping) */}
        <div className="w-full bg-slate-900 text-slate-300 border-b border-slate-800/80 text-[11px] sm:text-xs py-1 px-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="text-amber-400 font-bold shrink-0">🏛️ {COLLEGE_NAME}</span>
              <span className="text-slate-600 hidden md:inline">|</span>
              <span className="text-slate-300 font-medium hidden md:inline truncate">{LEADERSHIP_BAR_TEXT}</span>
            </div>

            <button
              onClick={() => setShowTeamModal(true)}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 shrink-0 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
            >
              <Users className="w-3 h-3" />
              <span>فريق الإشراف</span>
            </button>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Brand Logo & College Title */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group min-w-0 shrink">
            <AnimatedLogo size="md" />
          </Link>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Quick Search Shortcut */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="flex items-center justify-center sm:gap-1.5 h-9 sm:h-10 px-2 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold transition-all active:scale-95"
                title="بحث سريع في المحاضرات (Ctrl+K)"
                aria-label="بحث سريع"
              >
                <Search className="w-4 h-4 text-amber-500" />
                <span className="hidden md:inline">بحث</span>
                <kbd className="hidden lg:inline px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-400">
                  Ctrl+K
                </kbd>
              </button>
            )}

            {/* Gender Theme Toggle: Student (Blue) vs Student (Burgundy) */}
            <button
              onClick={toggleGender}
              className={`flex items-center justify-center gap-1 h-9 sm:h-10 px-2 sm:px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 ${gender === 'burgundy'
                ? 'bg-rose-50 dark:bg-[#350914] text-[#9B1B30] dark:text-rose-300 border-rose-300 dark:border-[#800020]'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}
              title={gender === 'burgundy' ? 'التحويل إلى ثيم طالب (الأزرق)' : 'التحويل إلى ثيم طالبة (البرجندي)'}
              aria-label="تبديل ثيم الطالب"
            >
              {gender === 'burgundy' ? (
                <>
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-[#800020] dark:text-rose-400" />
                  <span className="hidden sm:inline">طالبة</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">طالب</span>
                </>
              )}
            </button>

            {/* Student Auth / Digital ID Card Quick Button */}
            {student && !isGuest ? (
              <button
                onClick={() => setShowIdCardModal(true)}
                className="flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all active:scale-95"
                title={`كارنيه الطالب المعتمد: ${student.full_name} (${student.student_code})`}
                aria-label="كارنيه الطالب"
              >
                <IdCard className="w-4 h-4 text-amber-500" />
                <span className="hidden xl:inline truncate max-w-[80px]">
                  {student.full_name.split(' ')[0]}
                </span>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('register')}
                className="flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 text-xs font-bold transition-all active:scale-95"
                title="تسجيل الدخول / إنشاء حساب طالب جديد"
                aria-label="تسجيل الدخول"
              >
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span className="hidden xl:inline">تسجيل الدخول</span>
              </button>
            )}

            {/* Data Saver Mode Toggle (Feature #20) */}
            <button
              onClick={toggleDataSaverMode}
              className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border text-xs font-black transition-all active:scale-95 ${
                dataSaverMode
                  ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700/60'
              }`}
              title={dataSaverMode ? 'وضع توفير الباقة: مفعّل (يوفر استهلاك الإنترنت)' : 'وضع توفير الباقة: معطّل'}
              aria-label="تبديل وضع توفير الباقة"
            >
              <Zap className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${dataSaverMode ? 'fill-current' : ''}`} />
            </button>

            {/* Accessibility Font Size Toggle (A+ / A-) */}
            <button
              onClick={cycleFontSize}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 text-xs font-black transition-all active:scale-95"
              title={`حجم الخط الحالي: ${fontSize === 'normal' ? 'افتراضي' : fontSize === 'lg' ? 'كبير' : 'صغير'}`}
              aria-label="تغيير حجم الخط"
            >
              <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] font-black -mr-0.5">
                {fontSize === 'lg' ? '+' : fontSize === 'sm' ? '-' : ''}
              </span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700/60 transition-all active:scale-95"
              title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
              aria-label="تبديل الوضع الليلي والنهاري"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform hover:-rotate-12" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Leadership Details Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-right text-white">
            <button
              onClick={() => setShowTeamModal(false)}
              className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">فريق العمل والتأسيس</h3>
                <p className="text-xs text-amber-300/80">{COLLEGE_NAME}</p>
              </div>
            </div>

            <div className="space-y-3">
              {TEAM_CREDITS.map((member) => (
                <div
                  key={member.name}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-colors"
                >
                  <div className="p-2 rounded-xl bg-slate-800 border border-white/10 shrink-0 mt-0.5">
                    {iconMap[member.iconName]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-white">{member.name}</span>
                      <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{member.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-slate-400 italic">
                «العدل أساس الملك، والعلم سراج المستقبل — نعتز بخدمة طلاب العلوم القانونية والحقوقية»
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Digital Student ID Card Modal */}
      <DigitalStudentIdCard
        isOpen={showIdCardModal}
        onClose={() => setShowIdCardModal(false)}
      />
    </>
  );
}

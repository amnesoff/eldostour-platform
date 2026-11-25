import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export function Logo({ className = '', size = 'md', showSubtitle = true }: LogoProps) {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', title: 'text-base', sub: 'text-[10px]' },
    md: { icon: 'w-9 h-9', title: 'text-lg', sub: 'text-xs' },
    lg: { icon: 'w-12 h-12', title: 'text-2xl', sub: 'text-sm' },
    xl: { icon: 'w-16 h-16', title: 'text-3xl', sub: 'text-base' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem / Scale of Justice Badge */}
      <div className={`relative ${currentSize.icon} shrink-0 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20`}>
        <div className="w-full h-full rounded-[10px] bg-slate-900/90 dark:bg-slate-950 flex items-center justify-center border border-amber-400/30">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3/5 h-3/5 text-amber-400"
          >
            {/* Balance / Scale of Justice */}
            <path d="M12 3v18" />
            <path d="M6 7h12" />
            <path d="M6 7l-3 6h6l-3-6z" />
            <path d="M18 7l-3 6h6l-3-6z" />
            <path d="M4 21h16" />
          </svg>
        </div>
        {/* Glow point */}
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 blur-[2px]" />
      </div>

      {/* Brand Text */}
      <div className="flex flex-col text-right">
        <span className={`font-black tracking-tight text-slate-900 dark:text-white ${currentSize.title}`}>
          منصة <span className="bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-400 bg-clip-text text-transparent">الدستور</span> التعليمية
        </span>
        {showSubtitle && (
          <span className={`text-slate-500 dark:text-amber-200/60 font-medium ${currentSize.sub}`}>
            العلوم القانونية • منصة مستقلة
          </span>
        )}
      </div>
    </div>
  );
}

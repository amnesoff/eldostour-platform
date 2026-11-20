import React from 'react';
import { BookOpen, SearchX, FileQuestion, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'book' | 'search' | 'file';
  actionButton?: React.ReactNode;
}

export function EmptyState({
  title = 'لا توجد محاضرات مضافة حالياً',
  description = 'سيتم رفع المحاضرات والملخصات الدراسية هنا فور توفرها من قِبل إدارة المنصة.',
  icon = 'book',
  actionButton,
}: EmptyStateProps) {
  const iconMap = {
    book: <BookOpen className="w-10 h-10 text-amber-500/70 dark:text-amber-400/80" />,
    search: <SearchX className="w-10 h-10 text-amber-500/70 dark:text-amber-400/80" />,
    file: <FileQuestion className="w-10 h-10 text-amber-500/70 dark:text-amber-400/80" />,
  };

  return (
    <div className="w-full flex flex-col items-center justify-center text-center py-16 px-4 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md transition-all">
      {/* Icon with glowing badge */}
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center shadow-lg">
          {iconMap[icon]}
        </div>
        <div className="absolute -top-1 -right-1 text-amber-400 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
        {title}
      </h3>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}

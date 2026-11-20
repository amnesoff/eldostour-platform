'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  totalResults?: number;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'ابحث عن اسم المحاضرة، الموضوع، أو الملخص...',
  totalResults,
}: SearchBarProps) {
  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div className="absolute right-4 text-slate-400 pointer-events-none">
          <Search className="w-5 h-5 text-amber-500/80" />
        </div>

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 sm:h-14 pr-12 pl-12 text-sm sm:text-base rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:focus:ring-amber-400/10 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all shadow-sm"
        />

        {/* Clear Button */}
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute left-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="مسح البحث"
            aria-label="مسح البحث"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {value && totalResults !== undefined && (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-2 flex items-center justify-between">
          <span>نتائج البحث عن &quot;{value}&quot;:</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {totalResults} {totalResults === 1 ? 'محتوى' : 'محتويات'}
          </span>
        </div>
      )}
    </div>
  );
}

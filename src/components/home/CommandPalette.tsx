'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  GraduationCap,
  Calculator,
  BookA,
  Award,
  ArrowRight,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Handle Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickLinks = [
    {
      title: 'الفرقة الأولى - سنة أولى حقوق',
      category: 'الفرق الدراسية',
      href: '/grade/1',
      icon: <GraduationCap className="w-4 h-4 text-blue-500" />,
    },
    {
      title: 'الفرقة الثانية - سنة ثانية حقوق',
      category: 'الفرق الدراسية',
      href: '/grade/2',
      icon: <GraduationCap className="w-4 h-4 text-amber-500" />,
    },
    {
      title: 'الفرقة الثالثة - سنة ثالثة حقوق',
      category: 'الفرق الدراسية',
      href: '/grade/3',
      icon: <GraduationCap className="w-4 h-4 text-emerald-500" />,
    },
    {
      title: 'الفرقة الرابعة - سنة التخرج',
      category: 'الفرق الدراسية',
      href: '/grade/4',
      icon: <GraduationCap className="w-4 h-4 text-purple-500" />,
    },
    {
      title: 'حاسبة المعدل التراكمي (Law GPA Calculator)',
      category: 'أدوات ذكية',
      href: '/#gpa-calculator',
      icon: <Calculator className="w-4 h-4 text-teal-500" />,
    },
    {
      title: 'القاموس القانوني الفرنسي العربي الناطق',
      category: 'أدوات ذكية',
      href: '/#legal-dictionary',
      icon: <BookA className="w-4 h-4 text-sky-500" />,
    },
    {
      title: 'لوحة شرف المتفوقين والاختبارات التفاعلية',
      category: 'المسابقات والامتياز',
      href: '/#honor-roll',
      icon: <Award className="w-4 h-4 text-amber-500" />,
    },
  ];

  const filteredLinks = query.trim()
    ? quickLinks.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      )
    : quickLinks;

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
        >
          {/* Search Box */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
            <Search className="w-5 h-5 text-amber-500 ml-2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="اكتب اسم الفرقة، المادة، أو الأداة للوصول السريع..."
              className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-3 space-y-1">
            {filteredLinks.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleNavigate(item.href)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                      {item.title}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {item.category}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </button>
            ))}

            {filteredLinks.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                لم نجد نتائج تطابق &quot;{query}&quot;
              </div>
            )}
          </div>

          {/* Footer Shortcuts hint */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>منصة الدستور التعليمية</span>
            <span>اضغط Esc للإغلاق</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QuizSubmission } from '@/types';

export function HonorRollMarquee() {
  const [honors, setHonors] = useState<QuizSubmission[]>([]);

  useEffect(() => {
    const fetchHonors = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_submissions')
          .select('*, quizzes(title)')
          .gte('percentage', 80)
          .order('percentage', { ascending: false })
          .limit(10);

        if (!error && data) {
          setHonors(data as QuizSubmission[]);
        }
      } catch {
        // Fallback or empty
      }
    };

    fetchHonors();
  }, []);

  if (honors.length === 0) return null;

  return (
    <div
      id="honor-roll"
      className="w-full bg-gradient-to-r from-amber-600/10 via-amber-500/20 to-amber-600/10 border-y border-amber-500/30 py-2.5 overflow-hidden text-right select-none"
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black shrink-0 ml-3 shadow-md">
          <Crown className="w-3.5 h-3.5 fill-current" />
          <span>لوحة شرف المتفوقين</span>
        </div>

        <div className="overflow-hidden w-full whitespace-nowrap">
          <div className="inline-flex items-center gap-8 animate-marquee">
            {honors.map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-amber-300">
                <span>⭐ الطالب/ـة: {item.student_name}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[10px]">
                  {item.percentage}%
                </span>
                {item.quizzes?.title && (
                  <span className="text-slate-400 font-normal">({item.quizzes.title})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';

interface TypewriterHeadlineProps {
  phrases?: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseMs?: number;
}

const DEFAULT_PHRASES = [
  'كلية الحقوق - جامعة مدينة السادات',
  'البوابة الأكاديمية الشاملة لجميع الفرق الدراسية',
  'محاضرات، مذكرات، وفيديوهات شرح مباشرة فورية',
  'معاً نحو التفوق والامتياز الأكاديمي والقانوني',
];

export function TypewriterHeadline({
  phrases = DEFAULT_PHRASES,
  typingSpeed = 70,
  deletingSpeed = 40,
  pauseMs = 2000,
}: TypewriterHeadlineProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const targetPhrase = phrases[phraseIndex % phrases.length];

    if (!isDeleting) {
      if (currentText.length < targetPhrase.length) {
        timer = setTimeout(() => {
          setCurrentText(targetPhrase.slice(0, currentText.length + 1));
        }, typingSpeed);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, pauseMs);
      }
    } else {
      if (currentText.length > 0) {
        timer = setTimeout(() => {
          setCurrentText(targetPhrase.slice(0, currentText.length - 1));
        }, deletingSpeed);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseMs]);

  return (
    <span className="inline-block min-h-[1.5em] text-amber-500 dark:text-amber-400 font-bold">
      <span>{currentText}</span>
      <span className="cursor-blink text-amber-400 font-normal mr-1">|</span>
    </span>
  );
}

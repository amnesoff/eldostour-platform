'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import { COLLEGE_NAME } from '@/lib/constants';

interface AnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
}

export function AnimatedLogo({
  className = '',
  size = 'md',
  showText = true,
  showSubtitle = true,
}: AnimatedLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeDimensions = {
    sm: { px: 32, img: 32, title: 'text-xs font-bold', sub: 'text-[9px]' },
    md: { px: 40, img: 40, title: 'text-xs sm:text-base font-black', sub: 'text-[9px] sm:text-[11px]' },
    lg: { px: 60, img: 60, title: 'text-lg sm:text-xl font-black', sub: 'text-xs' },
    xl: { px: 80, img: 80, title: 'text-xl sm:text-2xl font-black', sub: 'text-sm' },
  };

  const current = sizeDimensions[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Animated Circular Official Logo Container */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-lg shadow-amber-500/20"
        style={{ width: current.px + 4, height: current.px + 4 }}
      >
        <div className="w-full h-full rounded-full bg-[#0B132B] overflow-hidden flex items-center justify-center border border-amber-400/40">
          {!imageError ? (
            <Image
              src="/logo.png"
              alt="شعار منصة الدستور التعليمية"
              width={current.img}
              height={current.img}
              className="object-cover w-full h-full rounded-full"
              priority
              onError={() => setImageError(true)}
            />
          ) : (
            <Scale className="w-3/5 h-3/5 text-amber-400" />
          )}
        </div>

        {/* Ambient Gold Pulse Ring */}
        <div className="absolute -inset-0.5 rounded-full bg-amber-400/20 blur-sm pointer-events-none -z-10" />
      </motion.div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col text-right min-w-0">
          <span className={`tracking-tight text-slate-900 dark:text-white truncate ${current.title}`}>
            منصة <span className="bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent">الدستور</span>
          </span>
          {showSubtitle && (
            <span className={`text-slate-600 dark:text-amber-200/70 font-semibold truncate max-w-[105px] xs:max-w-[140px] sm:max-w-xs ${current.sub}`}>
              {COLLEGE_NAME}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

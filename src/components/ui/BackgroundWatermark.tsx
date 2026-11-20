'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export function BackgroundWatermark({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none select-none -z-10 overflow-hidden flex items-center justify-center ${className}`}
    >
      {/* Central Large Smoothly Floating Official Watermark */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, 0.8, 0, -0.8, 0],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] md:w-[620px] md:h-[620px] opacity-[0.06] dark:opacity-[0.08] mix-blend-multiply dark:mix-blend-screen transition-opacity"
      >
        <Image
          src="/logo.png"
          alt=""
          fill
          sizes="(max-width: 768px) 320px, 620px"
          className="object-contain filter contrast-125"
          priority
        />
      </motion.div>

      {/* Subtle radial vignette gradient behind it */}
      <div className="absolute inset-0 bg-radial from-transparent via-slate-50/40 dark:via-[#070c18]/40 to-slate-50 dark:to-[#070c18]" />
    </div>
  );
}

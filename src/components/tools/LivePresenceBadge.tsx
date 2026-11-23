'use client';

import React, { useState, useEffect } from 'react';
import { studentHeartbeatPresence, studentGetPresence } from '@/lib/apiClient';

interface LivePresenceBadgeProps {
  className?: string;
  compact?: boolean;
}

export function LivePresenceBadge({ className = '', compact = false }: LivePresenceBadgeProps) {
  const [activeCount, setActiveCount] = useState<number>(1);

  useEffect(() => {
    let isMounted = true;

    const getOrSetClientId = () => {
      if (typeof window === 'undefined') return 'client-ssr';
      let id = localStorage.getItem('eldostour_presence_id');
      if (!id) {
        id = `user-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
        localStorage.setItem('eldostour_presence_id', id);
      }
      return id;
    };

    const studentName = typeof window !== 'undefined' ? localStorage.getItem('eldostour_student_name') || '' : '';
    const clientId = getOrSetClientId();

    const sendHeartbeat = async () => {
      try {
        const res = await studentHeartbeatPresence(clientId, studentName);
        if (isMounted && res?.count) {
          setActiveCount(Math.max(res.count, 1));
        }
      } catch {
        // Fallback fetch
        try {
          const res = await studentGetPresence();
          if (isMounted && res?.count) {
            setActiveCount(Math.max(res.count, 1));
          }
        } catch {
          // ignore
        }
      }
    };

    // Initial heartbeat
    sendHeartbeat();

    // 45-second heartbeat interval
    const interval = setInterval(sendHeartbeat, 45000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs select-none shadow-sm ${className}`}
      title="عدد الطلاب النشطين الذين يذاكرون على المنصة حالياً"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      {compact ? (
        <span>يذاكر الآن: {activeCount}</span>
      ) : (
        <span>يذاكر الآن على المنصة: {activeCount} طالب</span>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Phone } from 'lucide-react';
import { StudentRequest } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatDateArabic } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export function RequestsManager() {
  const [requests, setRequests] = useState<StudentRequest[]>([]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('student_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data as StudentRequest[]);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleToggleStatus = async (req: StudentRequest) => {
    const nextStatus = req.status === 'pending' ? 'resolved' : 'pending';
    try {
      await supabase
        .from('student_requests')
        .update({ status: nextStatus })
        .eq('id', req.id);
      fetchRequests();
    } catch (err: any) {
      alert(`خطأ: ${err?.message || ''}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الطلب؟')) return;
    try {
      await supabase.from('student_requests').delete().eq('id', id);
      fetchRequests();
    } catch (err: any) {
      alert(`خطأ: ${err?.message || ''}`);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              طلبات وملاحظات الطلاب المستلمة
            </h3>
            <p className="text-xs text-slate-400">
              المذكرات المطلوبة والاستفسارات المرسلة من الطلاب عبر المنصة
            </p>
          </div>
        </div>

        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 font-bold">
          {requests.length} طلب
        </span>
      </div>

      {requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                r.status === 'resolved'
                  ? 'bg-slate-950/40 border-slate-800/40 opacity-70'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-white">{r.student_name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400">
                    الفرقة {r.year}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                    مادة: {r.subject_name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatDateArabic(r.created_at)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  {r.request_text}
                </p>

                {r.contact_info && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
                    <Phone className="w-3.5 h-3.5" />
                    <span>تواصل: {r.contact_info}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleStatus(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    r.status === 'resolved'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500 text-slate-950 hover:bg-amber-600'
                  }`}
                >
                  {r.status === 'resolved' ? 'تمت المعالجة' : 'تحديد كمنجز'}
                </button>

                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="لا توجد طلبات جديدة حالياً"
          description="أي طلب يرسله الطالب عبر صندوق الطلبات سيظهر هنا فوراً."
          icon="file"
        />
      )}
    </div>
  );
}

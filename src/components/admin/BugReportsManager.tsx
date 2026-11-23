'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Phone,
  Clock,
  Filter,
  Check,
} from 'lucide-react';
import { BugReport } from '@/types';
import { adminGetBugReports, adminUpdateBugReport, adminDeleteBugReport } from '@/lib/apiClient';
import { formatDateArabic } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export function BugReportsManager() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchReports = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    setErrorMsg('');
    try {
      const res = await adminGetBugReports();
      if (res?.success && Array.isArray(res?.reports)) {
        setReports(res.reports as BugReport[]);
      } else {
        setReports([]);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحميل بلاغات الطلاب');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleToggleStatus = async (report: BugReport) => {
    const nextStatus = report.status === 'pending' ? 'resolved' : 'pending';
    try {
      const res = await adminUpdateBugReport(report.id, nextStatus);
      if (!res.success) throw new Error(res.error);
      setSuccessMsg('تم تحديث حالة البلاغ بنجاح');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchReports();
    } catch (err: any) {
      alert(`خطأ: ${err?.message || ''}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البلاغ نهائياً؟')) return;
    try {
      const res = await adminDeleteBugReport(id);
      if (!res.success) throw new Error(res.error);
      setSuccessMsg('تم حذف البلاغ بنجاح');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchReports();
    } catch (err: any) {
      alert(`خطأ: ${err?.message || ''}`);
    }
  };

  const filtered = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-7 shadow-xl text-right text-white space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              بلاغات الطلاب والأخطاء العلمية والتقنية
            </h3>
            <p className="text-xs text-slate-400">
              ملاحظات الطلاب حول الأسئلة، المحاضرات، أو الأخطاء المطبعية للتدقيق والمراجعة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => fetchReports(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="تحديث البلاغات"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
            {pendingCount} قيد المراجعة
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <Filter className="w-4 h-4 text-slate-500 ml-1" />
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          الكل ({reports.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          قيد المراجعة ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterStatus === 'resolved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          تمت المعالجة ({reports.length - pendingCount})
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {successMsg}
        </div>
      )}

      {/* Reports List */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
          <span>جاري تحميل البلاغات...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="لا توجد بلاغات تطابق التصفية الحالية"
          description="أي إبلاغ عن خطأ يقدمه الطلاب سيظهر هنا فوراً للإدارة للمراجعة والتصحيح."
          icon="file"
        />
      ) : (
        <>
          {/* Desktop Table View (hidden on phones) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">نوع البلاغ</th>
                  <th className="py-3 px-4">الموضوع / المحاضرة</th>
                  <th className="py-3 px-4">تفاصيل الخطأ</th>
                  <th className="py-3 px-4">مقدم البلاغ</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[11px]">
                        {r.report_type === 'quiz' ? 'اختبار / سؤال' : r.report_type === 'lecture' ? 'محاضرة / مذكرة' : 'عام'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white max-w-[180px] truncate">
                      {r.target_title || 'غير محدد'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs">
                      <p className="line-clamp-2 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-white/5">
                        {r.description}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{r.student_name || 'طالب المنصة'}</div>
                      {r.student_phone && (
                        <div className="text-[11px] text-emerald-400 font-mono" dir="ltr">
                          {r.student_phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDateArabic(r.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          r.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-400 animate-pulse'
                        }`}
                      >
                        {r.status === 'resolved' ? 'تمت المعالجة ✅' : 'قيد المراجعة ⏳'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                            r.status === 'resolved'
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {r.status === 'resolved' ? 'إعادة للانتظار' : 'تم التصحيح'}
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="حذف البلاغ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View (visible on phones, hidden on desktop) */}
          <div className="block md:hidden space-y-3">
            {filtered.map((r) => (
              <div
                key={r.id}
                className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                  r.status === 'resolved'
                    ? 'bg-slate-950/40 border-slate-800/40 opacity-75'
                    : 'bg-slate-950/80 border-rose-500/30 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[11px] font-bold">
                    {r.report_type === 'quiz' ? 'خطأ بسؤال' : r.report_type === 'lecture' ? 'خطأ بمحاضرة' : 'بلاغ'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      r.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {r.status === 'resolved' ? 'تمت المعالجة ✅' : 'قيد المراجعة ⏳'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white mb-1">{r.target_title || 'موضوع البلاغ'}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
                    {r.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-white font-semibold">{r.student_name || 'طالب'}</span>
                    {r.student_phone && (
                      <span className="text-emerald-400 mr-2 font-mono" dir="ltr">{r.student_phone}</span>
                    )}
                  </div>
                  <span>{formatDateArabic(r.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleToggleStatus(r)}
                    className={`flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      r.status === 'resolved'
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{r.status === 'resolved' ? 'إعادة للانتظار' : 'تم التصحيح والاعتماد'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

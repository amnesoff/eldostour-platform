'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Eye,
} from 'lucide-react';
import { ExamCountdownSettings } from '@/types';
import { supabase } from '@/lib/supabase';
import { calculateTimeRemaining } from '@/lib/utils';

interface ExamCountdownManagerProps {
  initialSettings?: ExamCountdownSettings | null;
}

export function ExamCountdownManager({
  initialSettings,
}: ExamCountdownManagerProps) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState('امتحانات نهاية الفصل الدراسي');
  const [targetDate, setTargetDate] = useState('2026-12-25T09:00');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch current setting
  const fetchSettings = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'exam_countdown')
        .single();

      if (!fetchErr && data && data.value) {
        const val = data.value as ExamCountdownSettings;
        setActive(Boolean(val.active));
        setTitle(val.title || 'امتحانات نهاية الفصل الدراسي');
        if (val.target_date) {
          // Format for datetime-local (YYYY-MM-DDTHH:mm)
          const d = new Date(val.target_date);
          const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setTargetDate(isoLocal);
        }
      }
    } catch {
      // In case table not yet created
    }
  };

  useEffect(() => {
    if (initialSettings) {
      setActive(initialSettings.active);
      setTitle(initialSettings.title);
      if (initialSettings.target_date) {
        const d = new Date(initialSettings.target_date);
        const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setTargetDate(isoLocal);
      }
    } else {
      fetchSettings();
    }
  }, [initialSettings]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload: ExamCountdownSettings = {
        active,
        title: title.trim(),
        target_date: new Date(targetDate).toISOString(),
      };

      const { error: upsertErr } = await supabase.from('settings').upsert({
        key: 'exam_countdown',
        value: payload,
        updated_at: new Date().toISOString(),
      });

      if (upsertErr) throw upsertErr;

      setSuccess('تم حفظ إعدادات عداد الامتحانات بنجاح وتحديثها لحظياً للطلاب!');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(`خطأ أثناء حفظ الإعدادات: ${err?.message || ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Preview countdown calculation
  const remaining = calculateTimeRemaining(targetDate);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              التحكم في عداد الامتحانات التنازلي
            </h3>
            <p className="text-xs text-slate-400">
              تفعيل أو إيقاف العداد الزمني، وتحديد موعد واسم الامتحانات
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div>
            <span className="font-bold text-sm text-white block">
              حالة العداد التنازلي على المنصة
            </span>
            <span className="text-xs text-slate-400">
              عند الإيقاف، سيتم إخفاء بطاقة العداد تماماً من واجهة الطلاب
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActive(!active)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              active
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {active ? (
              <>
                <ToggleRight className="w-5 h-5" />
                <span>العداد مفعل</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5" />
                <span>العداد متوقف</span>
              </>
            )}
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              عنوان الحدث / الامتحان:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: امتحانات الفصل الدراسي الأول 2026"
              required
              className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              تاريخ ووقت بدء الامتحانات:
            </label>
            <input
              type="datetime-local"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-sm text-white outline-none text-right"
            />
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-3">
            <Eye className="w-4 h-4" />
            <span>معاينة فورية للعداد كما يظهر للطلاب:</span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center max-w-md mx-auto">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {String(remaining.days).padStart(2, '0')}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">أيام</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {String(remaining.hours).padStart(2, '0')}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">ساعات</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {String(remaining.minutes).padStart(2, '0')}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">دقائق</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {String(remaining.seconds).padStart(2, '0')}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">ثواني</span>
            </div>
          </div>
        </div>

        {/* Success / Error Messages */}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-8 h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>حفظ وتطبيق إعدادات العداد</span>
        </button>
      </form>
    </div>
  );
}

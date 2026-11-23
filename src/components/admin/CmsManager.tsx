'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageCircle,
  LayoutTemplate,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { SiteSettings, SiteSection } from '@/types';
import { DEFAULT_SITE_SETTINGS, DEFAULT_SECTIONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

interface CmsManagerProps {
  onRefresh?: () => void;
}

export function CmsManager({ onRefresh }: CmsManagerProps) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [sections, setSections] = useState<SiteSection[]>(DEFAULT_SECTIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch settings from Supabase
  useEffect(() => {
    const loadCmsData = async () => {
      try {
        const { data: sData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'general')
          .single();

        if (sData && sData.value) {
          setSettings((prev) => ({ ...prev, ...(sData.value as Partial<SiteSettings>) }));
        }

        const { data: secData } = await supabase
          .from('site_sections')
          .select('*')
          .order('order_index', { ascending: true });

        if (secData && secData.length > 0) {
          setSections(secData as SiteSection[]);
        }
      } catch {
        // Fallback to defaults
      }
    };

    loadCmsData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess('');
    setError('');

    try {
      // 1. Save general settings
      const { error: sErr } = await supabase.from('site_settings').upsert({
        key: 'general',
        value: settings,
        updated_at: new Date().toISOString(),
      });
      if (sErr) throw sErr;

      // 2. Save sections visibility & order
      for (const sec of sections) {
        await supabase.from('site_sections').upsert({
          id: sec.id,
          section_key: sec.section_key,
          title: sec.title,
          is_visible: sec.is_visible,
          order_index: sec.order_index,
          updated_at: new Date().toISOString(),
        });
      }

      setSuccess('تم حفظ جميع إعدادات المنصة والمظهر بنجاح!');
      onRefresh?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_visible: !s.is_visible } : s))
    );
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Reassign order_index
    const updated = newSections.map((sec, idx) => ({ ...sec, order_index: idx + 1 }));
    setSections(updated);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              نظام إدارة المحتوى والواتساب والتواصل (Content & Social CMS)
            </h3>
            <p className="text-xs text-slate-400">
              التحكم في نصوص الواجهة، ويدجت واتساب، وروابط التواصل، وترتيب الأقسام
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Text Content Settings */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-white mb-2">النصوص وعناوين الواجهة:</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اسم الكلية والجامعة:
              </label>
              <input
                type="text"
                value={settings.college_name}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, college_name: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                شريط الإشراف والتأسيس:
              </label>
              <input
                type="text"
                value={settings.leadership_text}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, leadership_text: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الوصف التعريفي بالواجهة:
              </label>
              <input
                type="text"
                value={settings.hero_subtitle}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, hero_subtitle: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Floating WhatsApp & Social Media Links */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>ويدجت واتساب العائم وروابط التواصل:</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                رقم الواتساب (مثال: 01012345678 أو 2010...):
              </label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, whatsapp_number: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الرسالة المسبقة عند الضغط على واتساب:
              </label>
              <input
                type="text"
                value={settings.whatsapp_message}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, whatsapp_message: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                رابط جروب الدستور الرسمي (واتساب):
              </label>
              <input
                type="text"
                value={settings.social_whatsapp_group}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, social_whatsapp_group: e.target.value }))
                }
                placeholder="https://chat.whatsapp.com/..."
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                رابط قناة تيليجرام:
              </label>
              <input
                type="text"
                value={settings.social_telegram}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, social_telegram: e.target.value }))
                }
                placeholder="https://t.me/..."
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                صفحة فيسبوك:
              </label>
              <input
                type="text"
                value={settings.social_facebook}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, social_facebook: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                قناة يوتيوب:
              </label>
              <input
                type="text"
                value={settings.social_youtube}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, social_youtube: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                حساب تيك توك:
              </label>
              <input
                type="text"
                value={settings.social_tiktok || ''}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, social_tiktok: e.target.value }))
                }
                placeholder="https://tiktok.com/@..."
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. Sections Ordering & Visibility */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            <span>ترتيب وإظهار/إخفاء أقسام الصفحة الرئيسية:</span>
          </h4>

          <div className="space-y-2">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {sec.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveSection(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveSection(idx, 'down')}
                    disabled={idx === sections.length - 1}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      sec.is_visible
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {sec.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{sec.is_visible ? 'ظاهر' : 'مخفي'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

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

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-8 h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>حفظ جميع التعديلات سحابياً</span>
        </button>
      </form>
    </div>
  );
}

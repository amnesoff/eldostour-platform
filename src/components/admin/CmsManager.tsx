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
  GraduationCap,
  UploadCloud,
} from 'lucide-react';
import { SiteSettings, SiteSection, AcademicYearId } from '@/types';
import { DEFAULT_SITE_SETTINGS, DEFAULT_SECTIONS, ACADEMIC_YEARS } from '@/lib/constants';
import { compressImageFile } from '@/lib/authUtils';
import { supabase } from '@/lib/supabase';
import { adminDbMutate, adminGetSiteSettings } from '@/lib/apiClient';

interface CmsManagerProps {
  onRefresh?: () => void;
}

export function CmsManager({ onRefresh }: CmsManagerProps) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [sections, setSections] = useState<SiteSection[]>(DEFAULT_SECTIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch settings via /api/admin/db (server-side service role)
  useEffect(() => {
    const loadCmsData = async () => {
      try {
        const res = await adminGetSiteSettings();
        if (res?.success) {
          if (res.general) {
            setSettings((prev) => ({ ...prev, ...(res.general as Partial<SiteSettings>) }));
          }
          if (Array.isArray(res.sections) && res.sections.length > 0) {
            setSections(res.sections as SiteSection[]);
          }
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
      const sRes = await adminDbMutate({
        table: 'site_settings',
        mutation: 'upsert',
        data: {
          key: 'general',
          value: settings,
          updated_at: new Date().toISOString(),
        },
      });
      if (!sRes.success) throw new Error(sRes.error || 'فشل حفظ الإعدادات');

      // 2. Save sections visibility & order
      for (const sec of sections) {
        await adminDbMutate({
          table: 'site_sections',
          mutation: 'upsert',
          data: {
            id: sec.id,
            section_key: sec.section_key,
            title: sec.title,
            is_visible: sec.is_visible,
            order_index: sec.order_index,
            updated_at: new Date().toISOString(),
          },
        });
      }

      // 3. Save grade covers to public.grade_covers
      if (settings.grade_covers) {
        for (const [yearStr, url] of Object.entries(settings.grade_covers)) {
          const yNum = Number(yearStr) as AcademicYearId;
          if (yNum >= 1 && yNum <= 4) {
            try {
              await adminDbMutate({
                table: 'grade_covers',
                mutation: 'upsert',
                data: {
                  year: yNum,
                  cover_image_url: url || '',
                  updated_at: new Date().toISOString(),
                },
              });
            } catch {
              // Ignore if table not created yet
            }
          }
        }
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

        {/* 5. Custom Grade Covers Management (TASK 4) */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-amber-500" />
              <span>أغلفة وخلفيات بطاقات الفرق الدراسية (الفرقة 1 - 4):</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              تظهر كخلفية لبطاقات الفرق في الصفحة الرئيسية مع زجاج أسود نصف شفاف
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ACADEMIC_YEARS.map((y) => {
              const currentCover = settings.grade_covers?.[y.id] || '';

              return (
                <div
                  key={y.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-white">{y.name}</span>
                      <span className="text-[10px] text-amber-400 font-mono">{y.shortName}</span>
                    </div>

                    {/* Preview box */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex flex-col justify-end">
                      {currentCover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentCover}
                          alt={y.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/logo.png" alt="logo" className="w-16 h-16 object-contain" />
                        </div>
                      )}

                      {/* Translucent black overlay preview */}
                      <div className="relative z-10 p-2 bg-black/65 backdrop-blur-md border-t border-white/10 text-[10px] text-white">
                        <span className="font-bold block text-amber-300">{y.name}</span>
                        <span className="text-[9px] text-slate-300">معاينة الغلاف والزجاج</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={currentCover}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings((prev) => ({
                          ...prev,
                          grade_covers: {
                            ...(prev.grade_covers || { 1: '', 2: '', 3: '', 4: '' }),
                            [y.id]: val,
                          },
                        }));
                      }}
                      placeholder="رابط الصورة (URL)..."
                      dir="ltr"
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 font-mono focus:border-amber-500 outline-none"
                    />

                    {/* Upload button */}
                    <label className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                      <span>رفع صورة من الجهاز</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const compressed = await compressImageFile(file, 800);
                            setSettings((prev) => ({
                              ...prev,
                              grade_covers: {
                                ...(prev.grade_covers || { 1: '', 2: '', 3: '', 4: '' }),
                                [y.id]: compressed,
                              },
                            }));
                          } catch {
                            alert('فشل ضغط ورفع الصورة');
                          }
                        }}
                      />
                    </label>

                    {currentCover && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            grade_covers: {
                              ...(prev.grade_covers || { 1: '', 2: '', 3: '', 4: '' }),
                              [y.id]: '',
                            },
                          }));
                        }}
                        className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                      >
                        إزالة الغلاف
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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

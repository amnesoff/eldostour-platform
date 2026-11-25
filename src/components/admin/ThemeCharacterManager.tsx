'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Palette,
  Upload,
  CheckCircle2,
  Trash2,
  Plus,
  Moon,
  Heart,
  AlertCircle,
  Layout,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { uploadCustomCharacter } from '@/lib/supabase';
import { adminGetSiteSettings, adminUpdateThemeSettings } from '@/lib/apiClient';
import { CharacterWidgetSettings, OccasionTheme, CharacterPresetId } from '@/types';
import {
  CHARACTER_PRESETS,
  DEFAULT_CHARACTER_WIDGET_SETTINGS,
} from '@/lib/constants';

interface ThemeCharacterManagerProps {
  onSettingsUpdated?: () => void;
}

export function ThemeCharacterManager({ onSettingsUpdated }: ThemeCharacterManagerProps) {
  // Theme State
  const [activeTheme, setActiveTheme] = useState<OccasionTheme>('default');
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // Character Widget State
  const [charSettings, setCharSettings] = useState<CharacterWidgetSettings>(
    DEFAULT_CHARACTER_WIDGET_SETTINGS
  );
  const [newMessageText, setNewMessageText] = useState('');
  const [isUploadingChar, setIsUploadingChar] = useState(false);
  const [isSavingWidget, setIsSavingWidget] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch current settings via /api/admin/db (server-side service role)
  const loadSettings = async () => {
    try {
      const res = await adminGetSiteSettings();
      if (res?.success) {
        if (res.general?.active_occasion_theme) {
          setActiveTheme(res.general.active_occasion_theme);
        }
        if (res.character_widget) {
          setCharSettings((prev) => ({ ...prev, ...(res.character_widget as CharacterWidgetSettings) }));
        }
      }
    } catch (err) {
      console.warn('Could not load theme & character settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Update Active Seasonal Theme via /api/admin/db
  const handleSelectTheme = async (themeKey: OccasionTheme) => {
    setIsSavingTheme(true);
    setErrorMsg('');
    try {
      const res = await adminUpdateThemeSettings({
        active_occasion_theme: themeKey,
      });

      if (!res?.success) throw new Error(res?.error || 'فشل تفعيل الثيم');

      setActiveTheme(res.active_occasion_theme || themeKey);
      setSuccessMsg(`تم تفعيل الثيم (${themeKey}) بنجاح وسيتزامن فوراً لدى جميع الطلاب!`);
      setTimeout(() => setSuccessMsg(''), 3500);
      onSettingsUpdated?.();
    } catch (err: any) {
      setErrorMsg(`خطأ أثناء تفعيل الثيم: ${err?.message || ''}`);
    } finally {
      setIsSavingTheme(false);
    }
  };

  // Save Character Widget Settings via /api/admin/db
  const saveCharacterSettings = async (newSettings: CharacterWidgetSettings) => {
    setIsSavingWidget(true);
    setErrorMsg('');
    try {
      const res = await adminUpdateThemeSettings({
        character_widget: newSettings,
      });

      if (!res?.success) throw new Error(res?.error || 'فشل حفظ إعدادات الشخصية');

      setCharSettings(res.character_widget || newSettings);
      setSuccessMsg('تم حفظ وتحديث إعدادات الشخصية التفاعلية بنجاح!');
      setTimeout(() => setSuccessMsg(''), 3000);
      onSettingsUpdated?.();
    } catch (err: any) {
      setErrorMsg(`خطأ أثناء حفظ إعدادات الشخصية: ${err?.message || ''}`);
    } finally {
      setIsSavingWidget(false);
    }
  };

  // Handle Custom Character Upload
  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingChar(true);
    setErrorMsg('');
    try {
      const uploadRes = await uploadCustomCharacter(file);
      if (uploadRes) {
        const updated: CharacterWidgetSettings = {
          ...charSettings,
          selected_character: 'custom',
          custom_character_url: uploadRes.publicUrl,
        };
        await saveCharacterSettings(updated);
      }
    } catch (err: any) {
      setErrorMsg(`خطأ أثناء رفع صورة الشخصية المخصصة: ${err?.message || ''}`);
    } finally {
      setIsUploadingChar(false);
    }
  };

  // Messages Manager Handlers
  const handleAddMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      text: newMessageText.trim(),
      is_active: true,
    };

    const updated = {
      ...charSettings,
      messages: [...(charSettings.messages || []), newMsg],
    };

    saveCharacterSettings(updated);
    setNewMessageText('');
  };

  const handleToggleMessage = (id: string) => {
    const updated = {
      ...charSettings,
      messages: charSettings.messages.map((m) =>
        m.id === id ? { ...m, is_active: !m.is_active } : m
      ),
    };
    saveCharacterSettings(updated);
  };

  const handleDeleteMessage = (id: string) => {
    const updated = {
      ...charSettings,
      messages: charSettings.messages.filter((m) => m.id !== id),
    };
    saveCharacterSettings(updated);
  };

  const handleRestoreDefaultMessages = () => {
    if (!confirm('هل تريد استعادة العبارات التحفيزية الافتراضية؟')) return;
    const updated = {
      ...charSettings,
      messages: DEFAULT_CHARACTER_WIDGET_SETTINGS.messages,
    };
    saveCharacterSettings(updated);
  };

  const themeOptions: { id: OccasionTheme; name: string; desc: string; icon: any; color: string }[] = [
    {
      id: 'default',
      name: 'الوضع العادي الرسمي',
      desc: 'المظهر الأكاديمي القياسي للعلوم القانونية مع الألوان الرسمية للكحلي والذهبي.',
      icon: Layout,
      color: 'border-slate-700 bg-slate-900',
    },
    {
      id: 'ramadan',
      name: 'ثيم رمضان الفخم والمدفع الذهبي 🌙',
      desc: 'باليت إسبريسو داكن فاخر (#1A0F0A) وذهب معدني مع زينة علوية متدلية ومدفع رمضان تفاعلي.',
      icon: Moon,
      color: 'border-amber-500/50 bg-gradient-to-br from-[#20120B] to-[#120804] text-amber-300',
    },
    {
      id: 'new_year',
      name: 'ثيم رأس السنة وبابا نويل ❄️',
      desc: 'أجواء شتوية ساحرة مع تساقط حبات الجليد وبابا نويل يطير عبر شاشات الطلاب.',
      icon: Sparkles,
      color: 'border-sky-500/50 bg-gradient-to-br from-[#0A1733] to-[#040A18] text-sky-300',
    },
    {
      id: 'valentine',
      name: 'ثيم عيد الحب الوردي ❤️',
      desc: 'ألوان روز وكريمسون دافئة مع قلوب متحركة لطيفة وتهنئة خاصة لطلاب الحقوق.',
      icon: Heart,
      color: 'border-rose-500/50 bg-gradient-to-br from-[#2C0A1A] to-[#16040C] text-rose-300',
    },
    {
      id: 'exams',
      name: 'ثيم طوارئ الامتحانات ⚖️',
      desc: 'مظهر تركيز أكاديمي مكثف مع إطلاق شخصية طالب الامتحانات المذعور تلقائياً.',
      icon: AlertCircle,
      color: 'border-amber-500/40 bg-gradient-to-br from-slate-900 to-amber-950/40 text-amber-400',
    },
  ];

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =======================================================================
          SECTION 1: SEASONAL THEME SWITCHER
          ======================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-white">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                إدارة الثيمات والمناسبات السنوية (Live Themes Sync)
              </h3>
              <p className="text-xs text-slate-400">
                تفعيل أي ثيم يحول المنصة بالكامل (خلفيات، ألوان، زينات، صوتيات) في ثوانٍ لجميع الطلاب
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            الثيم الحالي: {activeTheme}
          </span>
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = activeTheme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectTheme(opt.id)}
                disabled={isSavingTheme}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? `${opt.color} ring-2 ring-amber-400/80 shadow-xl scale-[1.02]`
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="p-2 rounded-xl bg-white/10 shrink-0">
                      <Icon className="w-4 h-4 text-amber-400" />
                    </div>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>مفعّل حالياً</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 group-hover:text-amber-400 transition-colors">
                        اضغط للتفعيل ⚡
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1">{opt.name}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =======================================================================
          SECTION 2: INTERACTIVE CHARACTER WIDGET CONTROLS
          ======================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                الشخصيات التفاعلية المنبثقة (Interactive Peeking Character)
              </h3>
              <p className="text-xs text-slate-400">
                شخصيات كرتونية تطل من جانب الشاشة مع لافتات ونكت تحفيزية لطلاب الحقوق
              </p>
            </div>
          </div>

          {/* Master ON/OFF Toggle */}
          <button
            onClick={() =>
              saveCharacterSettings({
                ...charSettings,
                enabled: !charSettings.enabled,
              })
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              charSettings.enabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {charSettings.enabled ? (
              <>
                <ToggleRight className="w-5 h-5" />
                <span>الشخصية: مفعّلة في الموقع ✅</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5" />
                <span>الشخصية: معطلة ❌</span>
              </>
            )}
          </button>
        </div>

        {/* Character Presets Selection Grid */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-slate-300 mb-3">
            اختر شخصية المنصة النشطة حالياً:
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CHARACTER_PRESETS.map((preset) => {
              const isSelected = charSettings.selected_character === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() =>
                    saveCharacterSettings({
                      ...charSettings,
                      selected_character: preset.id as CharacterPresetId,
                    })
                  }
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-purple-950/60 border-purple-400/80 ring-2 ring-purple-400/60 shadow-lg scale-102'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="relative w-full h-24 mb-2 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.image}
                      alt={preset.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-amber-400 block mb-0.5">
                      {preset.badge}
                    </span>
                    <h5 className="text-xs font-bold text-white line-clamp-1">{preset.name}</h5>
                  </div>
                </div>
              );
            })}

            {/* Custom Character Option */}
            <label
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col justify-between group ${
                charSettings.selected_character === 'custom'
                  ? 'bg-purple-950/60 border-purple-400/80 ring-2 ring-purple-400/60 shadow-lg'
                  : 'bg-slate-950/70 border-dashed border-slate-700 hover:border-purple-400'
              }`}
            >
              <div className="relative w-full h-24 mb-2 flex flex-col items-center justify-center">
                {charSettings.custom_character_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={charSettings.custom_character_url}
                    alt="شخصية مخصصة"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-purple-400 mb-1" />
                    <span className="text-[10px] text-slate-400 font-semibold">رفع صورة خاصة</span>
                  </>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-purple-400 block mb-0.5">
                  شخصية مخصصة 🎨
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {isUploadingChar ? 'جاري الرفع...' : 'اختر صورة من جهازك'}
                </span>
              </div>

              <input
                type="file"
                accept="image/png,image/webp"
                onChange={handleCustomUpload}
                disabled={isUploadingChar}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Behavior Controls: Side & Interval */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              جهة ظهور الشخصية (Peek Side):
            </label>
            <div className="flex gap-2">
              {[
                { id: 'right', label: 'الجهة اليمنى (الافتراضية)' },
                { id: 'left', label: 'الجهة اليسرى' },
                { id: 'random', label: 'عشوائي بين اليمين واليسار' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    saveCharacterSettings({
                      ...charSettings,
                      peek_side: s.id as any,
                    })
                  }
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    charSettings.peek_side === s.id
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              فترة تكرار الظهور (Peek Interval):
            </label>
            <div className="flex gap-2">
              {[
                { val: 15, label: 'كل 15 ثانية' },
                { val: 25, label: 'كل 25 ثانية' },
                { val: 45, label: 'كل 45 ثانية' },
                { val: 60, label: 'كل دقيقة' },
              ].map((i) => (
                <button
                  key={i.val}
                  onClick={() =>
                    saveCharacterSettings({
                      ...charSettings,
                      peek_interval_seconds: i.val,
                    })
                  }
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                    charSettings.peek_interval_seconds === i.val
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =======================================================================
            SECTION 3: EDITABLE SPEECH-BUBBLE PHRASES
            ======================================================================= */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>العبارات واللافتات المعروضة في بالون المحادثة</span>
              <span className="text-[11px] text-purple-400">({charSettings.messages?.length || 0})</span>
            </label>

            <button
              onClick={handleRestoreDefaultMessages}
              className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
            >
              استعادة العبارات الافتراضية
            </button>
          </div>

          {/* Add Message Form */}
          <form onSubmit={handleAddMessage} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="اكتب نكتة أو نصيحة قانونية جديدة تظهر في لافتة الشخصية (مثال: القانون لا يحمي النوم! ☕)..."
              className="flex-1 h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-500 text-xs sm:text-sm text-white outline-none"
            />
            <button
              type="submit"
              disabled={!newMessageText.trim() || isSavingWidget}
              className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة العبارة</span>
            </button>
          </form>

          {/* Messages List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {charSettings.messages && charSettings.messages.length > 0 ? (
              charSettings.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    msg.is_active
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-slate-950/30 border-slate-800/40 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-amber-400">💬</span>
                    <span className="text-xs sm:text-sm text-white font-semibold truncate">
                      {msg.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleMessage(msg.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-colors ${
                        msg.is_active
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {msg.is_active ? 'مفعّلة' : 'معطلة'}
                    </button>

                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="حذف العبارة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                لا توجد عبارات مضافة حالياً.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

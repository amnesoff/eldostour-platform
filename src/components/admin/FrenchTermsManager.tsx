'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookA,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Volume2,
  Pause,
} from 'lucide-react';
import { FrenchTermRecord, AcademicYearId } from '@/types';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { supabase, uploadFrenchAudio } from '@/lib/supabase';

export function FrenchTermsManager() {
  const [terms, setTerms] = useState<FrenchTermRecord[]>([]);
  const [french, setFrench] = useState('');
  const [arabic, setArabic] = useState('');
  const [year, setYear] = useState<AcademicYearId>(1);
  const [category, setCategory] = useState('قانون عام');
  const [pronunciationHint, setPronunciationHint] = useState('');
  const [example, setExample] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Audio testing player
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadTerms = async () => {
    try {
      const { data } = await supabase
        .from('french_terms')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setTerms(data as FrenchTermRecord[]);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadTerms();
  }, []);

  const handlePlayAudio = (term: FrenchTermRecord) => {
    if (!term.audio_url) return;

    if (playingId === term.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(term.audio_url);
    audioRef.current = audio;
    setPlayingId(term.id);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!french.trim() || !arabic.trim()) return;

    setIsAdding(true);
    setSuccess('');
    setError('');

    try {
      let finalAudioUrl = '';
      let finalAudioPath = '';

      if (audioFile) {
        const uploadRes = await uploadFrenchAudio(audioFile);
        if (uploadRes) {
          finalAudioUrl = uploadRes.publicUrl;
          finalAudioPath = uploadRes.storagePath;
        }
      }

      const { error: insErr } = await supabase.from('french_terms').insert({
        french: french.trim(),
        arabic: arabic.trim(),
        year,
        category: category.trim(),
        pronunciation_hint: pronunciationHint.trim(),
        example: example.trim(),
        audio_url: finalAudioUrl,
        audio_storage_path: finalAudioPath,
      });

      if (insErr) throw insErr;

      setSuccess('تمت إضافة المصطلح الصوتي بنجاح!');
      setFrench('');
      setArabic('');
      setPronunciationHint('');
      setExample('');
      setAudioFile(null);
      loadTerms();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إضافة المصطلح');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصطلح؟')) return;
    try {
      await supabase.from('french_terms').delete().eq('id', id);
      loadTerms();
    } catch (err: any) {
      alert(`خطأ: ${err?.message || ''}`);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center">
            <BookA className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              إدارة القاموس القانوني الفرنسي الناطق
            </h3>
            <p className="text-xs text-slate-400">
              إضافة المصطلحات القانونية الفرنسية وترجمتها ورفع تسجيلات النطق الصوتي
            </p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
          {terms.length} مصطلح
        </span>
      </div>

      {/* CREATE TERM FORM */}
      <form onSubmit={handleCreateTerm} className="p-4 sm:p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
        <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>إضافة مصطلح قانوني جديد:</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">المصطلح بالفرنسية:</label>
            <input
              type="text"
              required
              value={french}
              onChange={(e) => setFrench(e.target.value)}
              placeholder="مثال: Droit constitutionnel"
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-sky-500 font-serif"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">المعنى بالعربية:</label>
            <input
              type="text"
              required
              value={arabic}
              onChange={(e) => setArabic(e.target.value)}
              placeholder="مثال: القانون الدستوري"
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">الفرقة الدراسية:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value) as AcademicYearId)}
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">التصنيف القانوني:</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="مثال: قانون عام / خاص / عقود"
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">التقريب الصوتي بالعربية (اختياري):</label>
            <input
              type="text"
              value={pronunciationHint}
              onChange={(e) => setPronunciationHint(e.target.value)}
              placeholder="مثال: دروا كونستيتوسيونيل"
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">ملف النطق الصوتي (MP3/WAV/M4A):</label>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-sky-600 file:text-white"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-300 mb-1">مثال للاستخدام القضائي أو الأكاديمي:</label>
            <input
              type="text"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="مثال: Le droit constitutionnel organise les pouvoirs publics."
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
              dir="ltr"
            />
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
          disabled={isAdding || !french.trim() || !arabic.trim()}
          className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all shadow-md"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>حفظ المصطلح في القاموس</span>
        </button>
      </form>

      {/* Terms List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-300">المصطلحات المضافة ({terms.length}):</h4>
        {terms.map((t) => (
          <div
            key={t.id}
            className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-bold">
                  {t.category || 'عام'}
                </span>
                <span className="text-[11px] text-slate-400">الفرقة {t.year}</span>
                {t.pronunciation_hint && (
                  <span className="text-[11px] text-amber-400">({t.pronunciation_hint})</span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white font-serif" dir="ltr">
                {t.french} &mdash; <span className="font-sans text-amber-300 font-semibold">{t.arabic}</span>
              </h4>
              {t.example && <p className="text-[11px] text-slate-400 mt-1 italic" dir="ltr">&ldquo;{t.example}&rdquo;</p>}
            </div>

            <div className="flex items-center gap-2">
              {t.audio_url && (
                <button
                  type="button"
                  onClick={() => handlePlayAudio(t)}
                  className={`p-2 rounded-xl transition-colors ${
                    playingId === t.id
                      ? 'bg-sky-500 text-white animate-pulse'
                      : 'bg-slate-800 text-sky-400 hover:bg-slate-700'
                  }`}
                  title="استماع للنطق المسجل"
                >
                  {playingId === t.id ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDeleteTerm(t.id)}
                className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                title="حذف المصطلح"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
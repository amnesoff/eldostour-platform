'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { Subject, AcademicYearId, Material, AdminSession } from '@/types';
import { ACADEMIC_YEARS, SCHEDULE_SUBJECTS, SEMESTER_2_SUBJECTS } from '@/lib/constants';
import { adminDbMutate, adminSeedScheduleSubjects, adminClearSubjects } from '@/lib/apiClient';

interface SubjectsManagerProps {
  subjects: Subject[];
  materials: Material[];
  adminSession?: AdminSession | null;
  onRefresh: () => void;
}

export function SubjectsManager({
  subjects,
  materials,
  adminSession,
  onRefresh,
}: SubjectsManagerProps) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectYear, setNewSubjectYear] = useState<AcademicYearId>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Term 2 & Bulk Clear Modal States
  const [clearConfirmScope, setClearConfirmScope] = useState<'all' | 'term1' | 'term2' | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isTerm2ModalOpen, setIsTerm2ModalOpen] = useState(false);
  const [term2Year, setTerm2Year] = useState<AcademicYearId>(1);
  const [term2BulkText, setTerm2BulkText] = useState('');
  const [term2ReplaceMode, setTerm2ReplaceMode] = useState(false);

  const canBulkClear = Boolean(
    adminSession?.is_super_admin || adminSession?.permissions?.granular?.materials?.delete
  );

  // Deleting state
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Seed Official Schedule Subjects (Term 1 - 28 Subjects across Grades 1-4)
  const handleSeedScheduleSubjects = async (term: 'term1' | 'term2' = 'term1') => {
    setIsSeeding(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminSeedScheduleSubjects({ term });
      if (!res?.success) {
        throw new Error(res?.error || res?.details?.[0] || 'فشل استيراد مواد الجداول');
      }
      setSuccess(
        res.insertedCount > 0
          ? `تم استيراد ${res.insertedCount} مادة جديدة (${term === 'term1' ? 'الترم الأول' : 'الترم الثاني'}) بنجاح!`
          : `جميع مواد (${term === 'term1' ? 'الترم الأول' : 'الترم الثاني'}) مضافة بالفعل!`
      );
      onRefresh();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع أثناء استيراد المواد');
    } finally {
      setIsSeeding(false);
    }
  };

  // Bulk Clear / Reset Subjects with Confirmation
  const handleConfirmBulkClear = async () => {
    if (!clearConfirmScope) return;
    setIsClearing(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminClearSubjects({ scope: clearConfirmScope });
      if (!res?.success) throw new Error(res?.error || 'فشل مسح المواد');
      setSuccess(`تم مسح ${res.deletedCount || 0} مادة بنجاح!`);
      setClearConfirmScope(null);
      onRefresh();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء مسح المواد');
    } finally {
      setIsClearing(false);
    }
  };

  // Custom Term 2 Bulk Import Handler (Line-separated subject names for selected grade or Year:Name format)
  const handleImportTerm2Batch = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = term2BulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const customSubjects = lines.map((line) => {
      const match = line.match(/^([1-4])\s*[:|-]\s*(.+)$/);
      if (match) {
        return { year: Number(match[1]), name: match[2].trim() };
      }
      return { year: term2Year, name: line };
    });

    setIsSeeding(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminSeedScheduleSubjects({
        term: 'term2',
        customSubjects,
        replaceExisting: term2ReplaceMode,
      });
      if (!res?.success) throw new Error(res?.error || 'فشل استيراد مواد الترم الثاني');
      setSuccess(`تم استيراد ${res.insertedCount || 0} مادة للترم الثاني بنجاح!`);
      setTerm2BulkText('');
      setIsTerm2ModalOpen(false);
      onRefresh();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء استيراد مواد الترم الثاني');
    } finally {
      setIsSeeding(false);
    }
  };

  // Add Subject
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    setIsAdding(true);
    setError('');
    setSuccess('');

    try {
      const res = await adminDbMutate({
        table: 'subjects',
        mutation: 'insert',
        data: {
          name: newSubjectName.trim(),
          year: newSubjectYear,
        },
      });

      if (!res.success) throw new Error(res.error);

      setSuccess(`تمت إضافة مادة "${newSubjectName.trim()}" بنجاح!`);
      setNewSubjectName('');
      onRefresh();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`خطأ أثناء إضافة المادة: ${err?.message || ''}`);
    } finally {
      setIsAdding(false);
    }
  };

  // Delete Subject
  const handleConfirmDelete = async () => {
    if (!deletingSubject) return;
    setIsDeleting(true);

    try {
      const res = await adminDbMutate({
        table: 'subjects',
        mutation: 'delete',
        id: deletingSubject.id,
      });

      if (!res.success) throw new Error(res.error);

      setDeletingSubject(null);
      onRefresh();
    } catch (err: any) {
      alert(`خطأ أثناء حذف المادة: ${err?.message || ''}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              إدارة المواد الدراسية المقررة
            </h3>
            <p className="text-xs text-slate-400">
              إضافة أو حذف المواد لكل فرقة من الفرق الدراسية الأربعة (يدعم التكرار والحذف الفردي)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSeedScheduleSubjects('term1')}
            disabled={isSeeding}
            className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            <span>استيراد الترم الأول (28 مادة) 📚</span>
          </button>

          <button
            type="button"
            onClick={() =>
              SEMESTER_2_SUBJECTS.length > 0
                ? handleSeedScheduleSubjects('term2')
                : setIsTerm2ModalOpen(true)
            }
            disabled={isSeeding}
            className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>استيراد مواد الترم الثاني 📥</span>
          </button>

          {canBulkClear && (
            <>
              <button
                type="button"
                onClick={() => setClearConfirmScope('term1')}
                className="px-3 py-2.5 min-h-[44px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تصفير الترم الأول</span>
              </button>
              <button
                type="button"
                onClick={() => setClearConfirmScope('all')}
                className="px-3 py-2.5 min-h-[44px] rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح جميع المواد</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add New Subject Form */}
      <form
        onSubmit={handleAddSubject}
        className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 mb-8"
      >
        <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>إضافة مادة دراسية جديدة</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              اسم المادة الدراسية:
            </label>
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="مثال: القانون المدني، أصول الفقه، التجاري..."
              required
              className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 text-sm text-white outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              الفرقة الدراسية:
            </label>
            <select
              value={newSubjectYear}
              onChange={(e) =>
                setNewSubjectYear(Number(e.target.value) as AcademicYearId)
              }
              className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 text-sm text-white outline-none"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} ({y.shortName})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isAdding || !newSubjectName.trim()}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all shadow-md shadow-amber-500/10"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>إضافة</span>
            </button>
          </div>
        </div>

        {success && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Subjects Grouped by Academic Year */}
      <div className="space-y-6">
        {ACADEMIC_YEARS.map((year) => {
          const yearSubjects = subjects.filter((s) => s.year === year.id);

          return (
            <div
              key={year.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm text-white">
                    {year.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({year.shortName})
                  </span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 font-semibold">
                  {yearSubjects.length} مادة
                </span>
              </div>

              {yearSubjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {yearSubjects.map((sub) => {
                    const linkedMaterials = materials.filter(
                      (m) => m.subject_id === sub.id
                    ).length;
                    const scheduleInfo = SCHEDULE_SUBJECTS.find(
                      (item) => item.year === sub.year && item.name.trim() === sub.name.trim()
                    );

                    return (
                      <div
                        key={sub.id}
                        className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800/90 hover:border-amber-500/30 transition-colors"
                      >
                        <div className="min-w-0 pr-1 flex-1">
                          <div className="font-semibold text-xs sm:text-sm text-white leading-snug">
                            {sub.name}
                          </div>
                          {scheduleInfo && scheduleInfo.lecturers.length > 0 && (
                            <div className="text-[10px] text-amber-300/85 mt-1 leading-relaxed">
                              {scheduleInfo.lecturers.join(' • ')}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 mt-1">
                            {linkedMaterials} محاضرة مرفوعة
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDeletingSubject(sub)}
                          className="p-2 min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                          title="حذف المادة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2 text-center">
                  لا توجد مواد مضافة لهذه الفرقة بعد
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Subject Confirmation Modal */}
      <AnimatePresence>
        {deletingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-right text-white"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-white mb-2">
                تأكيد حذف المادة الدراسية؟
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                هل أنت متأكد من حذف مادة &quot;{deletingSubject.name}&quot;؟ في حال وجود محاضرات مرتبطة بها، قد يتم حذفها أو فك ربطها.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setDeletingSubject(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>تأكيد الحذف</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Clear / Reset Confirmation Modal */}
      <AnimatePresence>
        {clearConfirmScope && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[95vw] sm:w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-right text-white"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-white mb-2">
                {clearConfirmScope === 'all'
                  ? 'تأكيد مسح جميع المواد الدراسية؟'
                  : clearConfirmScope === 'term1'
                  ? 'تأكيد تصفير مواد الترم الأول؟'
                  : 'تأكيد تصفير مواد الترم الثاني؟'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                {clearConfirmScope === 'all'
                  ? 'سيتم مسح كافة المواد الدراسية عبر الفرق الأربعة تمهيداً لإعادة استيراد مواد جديدة. لا يمكن التراجع عن هذا الإجراء.'
                  : 'سيتم حذف مواد هذا الفصل الدراسي فقط من القائمة بنجاح لتسهيل استبدالها بمواد الفصل الجديد.'}
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setClearConfirmScope(null)}
                  disabled={isClearing}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkClear}
                  disabled={isClearing}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>تأكيد المسح النهائي</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Term 2 Bulk Import Modal */}
      <AnimatePresence>
        {isTerm2ModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[95vw] sm:w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-right text-white"
            >
              <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>استيراد مواد الترم الثاني (Bulk Import)</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                أدخل أسماء مواد الترم الثاني (مادة في كل سطر). يمكنك أيضاً تحديد الفرقة لكل سطر بصيغة <code className="text-amber-300 font-mono">1: اسم المادة</code> أو اختيار الفرقة أدناه.
              </p>

              <form onSubmit={handleImportTerm2Batch} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الفرقة الافتراضية للأسطر غير المحددة:
                  </label>
                  <select
                    value={term2Year}
                    onChange={(e) => setTerm2Year(Number(e.target.value) as AcademicYearId)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-white outline-none"
                  >
                    {ACADEMIC_YEARS.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} ({y.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    قائمة مواد الترم الثاني:
                  </label>
                  <textarea
                    rows={6}
                    value={term2BulkText}
                    onChange={(e) => setTerm2BulkText(e.target.value)}
                    placeholder={'مثال:\n1: القانون الدستوري\n2: القانون الإداري\n3: قانون العمل'}
                    required
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-white outline-none leading-relaxed"
                  />
                </div>

                {canBulkClear && (
                  <label className="flex items-center gap-2 text-xs text-rose-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={term2ReplaceMode}
                      onChange={(e) => setTerm2ReplaceMode(e.target.checked)}
                      className="rounded border-slate-700 text-rose-500 focus:ring-0"
                    />
                    <span>مسح المواد الحالية واستبدالها بمواد الترم الثاني</span>
                  </label>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTerm2ModalOpen(false)}
                    disabled={isSeeding}
                    className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSeeding || !term2BulkText.trim()}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>استيراد مواد الترم الثاني 📥</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

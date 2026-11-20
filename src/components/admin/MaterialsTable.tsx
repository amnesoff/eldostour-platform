'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Video,
  Trash2,
  Edit3,
  ExternalLink,
  Search,
  Check,
  X,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  Download,
  Flame,
} from 'lucide-react';
import { Material, Subject, MaterialType } from '@/types';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { formatDateArabic, formatFileSize } from '@/lib/utils';
import { supabase, deleteStorageFile } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';

interface MaterialsTableProps {
  materials: Material[];
  subjects: Subject[];
  onRefresh: () => void;
}

export function MaterialsTable({
  materials,
  subjects,
  onRefresh,
}: MaterialsTableProps) {
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | MaterialType>('all');
  const [search, setSearch] = useState('');

  // Multi-Select State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<Material | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editIsCram, setEditIsCram] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState<Material | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered materials
  const filtered = materials.filter((item) => {
    if (filterYear !== 'all' && item.year !== filterYear) return false;
    if (filterType !== 'all' && item.file_type !== filterType) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchSubject = item.subjects?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchSubject) return false;
    }
    return true;
  });

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all visible
  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((item) => item.id));
    }
  };

  // Perform Bulk Delete (Atomic DB delete + storage cleanup)
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);

    try {
      // 1. Clean up storage files for selected items
      const itemsToDelete = materials.filter((m) => selectedIds.includes(m.id));
      for (const item of itemsToDelete) {
        if (item.storage_path) {
          await deleteStorageFile(item.storage_path);
        }
      }

      // 2. Atomic delete from database
      const { error } = await supabase
        .from('materials')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`حدث خطأ أثناء الحذف الجماعي: ${err?.message || ''}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Perform Bulk Download
  const handleBulkDownload = async () => {
    const items = materials.filter((m) => selectedIds.includes(m.id));
    if (items.length === 0) return;

    setIsBulkDownloading(true);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const a = document.createElement('a');
        a.href = item.file_url;
        a.download = `${item.title}.${item.file_type === 'pdf' ? 'pdf' : 'mp4'}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.warn('Download error:', err);
      }
    }
    setIsBulkDownloading(false);
  };

  // Open Edit Modal
  const handleStartEdit = (item: Material) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description || '');
    setEditSubjectId(item.subject_id);
    setEditIsCram(Boolean(item.is_cram));
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);

    try {
      const { error } = await supabase
        .from('materials')
        .update({
          title: editTitle.trim(),
          description: editDesc.trim(),
          subject_id: editSubjectId,
          is_cram: editIsCram,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setEditingItem(null);
      onRefresh();
    } catch (err: any) {
      alert(`حدث خطأ أثناء تعديل المحاضرة: ${err?.message || ''}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Single Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    try {
      if (deletingItem.storage_path) {
        await deleteStorageFile(deletingItem.storage_path);
      }

      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', deletingItem.id);

      if (error) throw error;

      setDeletingItem(null);
      onRefresh();
    } catch (err: any) {
      alert(`حدث خطأ أثناء الحذف: ${err?.message || ''}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>إدارة المحاضرات والملفات (تحديد متعدد وحذف فوري)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-normal">
              {filtered.length} عنصر
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            حدد الملفات لتطبيق الحذف الجماعي أو التنزيل الفوري المتعدد
          </p>
        </div>

        {/* Select All Checkbox Button */}
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all border border-slate-700"
        >
          {selectedIds.length === filtered.length && filtered.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-amber-400" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
          <span>تحديد الكل ({filtered.length})</span>
        </button>
      </div>

      {/* Floating Action Bar when 1+ selected */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
            <span>تم تحديد {selectedIds.length} عنصر</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleBulkDownload}
              disabled={isBulkDownloading}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{isBulkDownloading ? 'جارٍ التنزيل...' : 'تنزيل المحدد'}</span>
            </button>

            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white text-xs"
            >
              إلغاء التحديد
            </button>
          </div>
        </motion.div>
      )}

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو المادة..."
            className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:border-amber-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        <div>
          <select
            value={filterYear}
            onChange={(e) =>
              setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:border-amber-500 outline-none"
          >
            <option value="all">جميع الفرق الدراسية</option>
            {ACADEMIC_YEARS.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:border-amber-500 outline-none"
          >
            <option value="all">جميع الأنواع (PDF وفيديوهات)</option>
            <option value="pdf">ملفات PDF فقط</option>
            <option value="video">فيديوهات مباشرة فقط</option>
          </select>
        </div>
      </div>

      {/* Materials List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isPdf = item.file_type === 'pdf';
            const isSelected = selectedIds.includes(item.id);
            const yearName = ACADEMIC_YEARS.find((y) => y.id === item.year)?.name;

            return (
              <motion.div
                key={item.id}
                layout
                className={`p-4 rounded-2xl border transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/60'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Details & Checkbox */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="p-1 mt-1 text-slate-400 hover:text-amber-400 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  <span
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isPdf
                        ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {isPdf ? <FileText className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20">
                        {yearName}
                      </span>
                      {item.subjects?.name && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {item.subjects.name}
                        </span>
                      )}
                      {item.is_cram && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-bold flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          ليلة الامتحان
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {formatDateArabic(item.created_at)}
                      </span>
                      {item.file_size ? (
                        <span className="text-[11px] text-slate-500">
                          • {formatFileSize(item.file_size)}
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white truncate">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
                    title="معاينة الملف"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">معاينة</span>
                  </a>

                  <button
                    onClick={() => handleStartEdit(item)}
                    className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 transition-colors text-xs flex items-center gap-1.5"
                    title="تعديل المحاضرة"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">تعديل</span>
                  </button>

                  <button
                    onClick={() => setDeletingItem(item)}
                    className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-colors text-xs flex items-center gap-1.5"
                    title="حذف المحاضرة وملف التخزين"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">حذف</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="لا توجد محاضرات في هذا القسم"
          description="لم يتم العثور على أي محاضرات مطابقة للمعايير المحددة."
          icon="file"
        />
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-right text-white"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>تعديل بيانات المحاضرة</span>
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    عنوان المحاضرة:
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    المادة الدراسية:
                  </label>
                  <select
                    value={editSubjectId}
                    onChange={(e) => setEditSubjectId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500 outline-none"
                  >
                    {subjects
                      .filter((s) => s.year === editingItem.year)
                      .map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    الملاحظة أو الوصف:
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Cram mode toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-300 font-semibold">
                    تمييز كملخص ليلة الامتحان (Cram Mode)
                  </span>
                  <input
                    type="checkbox"
                    checked={editIsCram}
                    onChange={(e) => setEditIsCram(e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit || !editTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingEdit ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>حفظ التعديلات</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Modal */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-slate-900 border border-red-500/50 rounded-3xl p-6 shadow-2xl text-right text-white">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-white mb-2">
                تأكيد حذف {selectedIds.length} عنصر نهائياً؟
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                أنت على وشك حذف جميع العناصر المحددة دفعة واحدة. سيتم حذف سجلاتها من قاعدة البيانات وحذف ملفاتها من سحابة Supabase Storage فوراً.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={isBulkDeleting}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>نعم، حذف الكل المحدد</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Single Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-right text-white"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-white mb-2">
                تأكيد حذف المحاضرة نهائياً؟
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                أنت على وشك حذف المحاضرة &quot;{deletingItem.title}&quot;. سيتم حذف سجل المحاضرة وحذف الملف من سحابة Supabase Storage فوراً.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setDeletingItem(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>نعم، حذف نهائياً</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

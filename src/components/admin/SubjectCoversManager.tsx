'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderArchive,
  Plus,
  Upload,
  Video,
  FileText,
  Award,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CheckSquare,
  X,
  Sparkles,
} from 'lucide-react';
import { AcademicYearId, Subject, Material, Quiz, SubjectCover } from '@/types';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { supabase, uploadSubjectCoverImage, uploadSubjectPreviewVideo, deleteStorageFile } from '@/lib/supabase';
import { adminDbMutate } from '@/lib/apiClient';
import { formatDateArabic } from '@/lib/utils';

interface SubjectCoversManagerProps {
  subjects: Subject[];
  onRefresh?: () => void;
}

export function SubjectCoversManager({ subjects, onRefresh }: SubjectCoversManagerProps) {
  const [selectedYear, setSelectedYear] = useState<AcademicYearId>(1);
  const [covers, setCovers] = useState<SubjectCover[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingCoverId, setEditingCoverId] = useState<string | null>(null);

  const [subjectName, setSubjectName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [professorName, setProfessorName] = useState('');
  const [description, setDescription] = useState('');

  // Media files
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');

  // Linked items checklist
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);

  // Operation state
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Filtered available content for current year
  const availablePdfs = materials.filter((m) => m.year === selectedYear && m.file_type === 'pdf');
  const availableVideos = materials.filter((m) => m.year === selectedYear && m.file_type === 'video');
  const availableQuizzes = quizzes.filter((q) => q.year === selectedYear);
  const availableSubjects = subjects.filter((s) => s.year === selectedYear);

  // Load covers, materials, and quizzes
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch subject covers
      const { data: cData } = await supabase
        .from('subject_covers')
        .select('*')
        .eq('year', selectedYear)
        .order('created_at', { ascending: false });

      // 2. Fetch materials for this year
      const { data: mData } = await supabase
        .from('materials')
        .select('*, subjects(name)')
        .eq('year', selectedYear)
        .order('created_at', { ascending: false });

      // 3. Fetch quizzes for this year
      const { data: qData } = await supabase
        .from('quizzes')
        .select('*, subjects(name), quiz_questions(id)')
        .eq('year', selectedYear)
        .order('created_at', { ascending: false });

      const fetchedMaterials = (mData as Material[]) || [];
      const fetchedQuizzes = (qData as any[]) || [];

      // Compute counts for covers
      const mappedCovers: SubjectCover[] = ((cData as SubjectCover[]) || []).map((cov) => {
        const linkedPdfs = fetchedMaterials.filter(
          (m) => m.cover_id === cov.id && m.file_type === 'pdf'
        ).length;
        const linkedVids = fetchedMaterials.filter(
          (m) => m.cover_id === cov.id && m.file_type === 'video'
        ).length;
        const linkedQs = fetchedQuizzes.filter((q) => q.cover_id === cov.id).length;

        return {
          ...cov,
          materials_count: linkedPdfs,
          videos_count: linkedVids,
          quizzes_count: linkedQs,
        };
      });

      setCovers(mappedCovers);
      setMaterials(fetchedMaterials);
      setQuizzes(
        fetchedQuizzes.map((q) => ({
          ...q,
          question_count: q.quiz_questions?.length || 0,
        })) as Quiz[]
      );
    } catch (err: any) {
      console.warn('Load covers error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset form
  const resetForm = () => {
    setIsEditing(false);
    setEditingCoverId(null);
    setSubjectName('');
    setSelectedSubjectId('');
    setProfessorName('');
    setDescription('');
    setCoverImageFile(null);
    setCoverImageUrl('');
    setPreviewVideoFile(null);
    setPreviewVideoUrl('');
    setSelectedMaterialIds([]);
    setSelectedQuizIds([]);
    setUploadProgress(0);
  };

  // Populate form for editing
  const handleEditCover = (cover: SubjectCover) => {
    setIsEditing(true);
    setEditingCoverId(cover.id);
    setSubjectName(cover.subject_name);
    setSelectedSubjectId(cover.subject_id || '');
    setProfessorName(cover.professor_name || '');
    setDescription(cover.description || '');
    setCoverImageUrl(cover.cover_image_url);
    setCoverImageFile(null);
    setPreviewVideoUrl(cover.preview_video_url || '');
    setPreviewVideoFile(null);

    // Find linked materials & quizzes
    const linkedMats = materials
      .filter((m) => m.cover_id === cover.id)
      .map((m) => m.id);
    setSelectedMaterialIds(linkedMats);

    const linkedQs = quizzes
      .filter((q) => q.cover_id === cover.id)
      .map((q) => q.id);
    setSelectedQuizIds(linkedQs);

    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Handle subject change from dropdown
  const handleSelectSubjectChange = (subId: string) => {
    setSelectedSubjectId(subId);
    if (subId) {
      const found = availableSubjects.find((s) => s.id === subId);
      if (found) {
        setSubjectName(found.name);
        // Automatically pre-check materials that belong to this subject if not editing
        if (!isEditing) {
          const autoMats = materials
            .filter((m) => m.subject_id === subId)
            .map((m) => m.id);
          setSelectedMaterialIds(autoMats);

          const autoQs = quizzes
            .filter((q) => q.subject_id === subId)
            .map((q) => q.id);
          setSelectedQuizIds(autoQs);
        }
      }
    }
  };

  // Toggle item in selection
  const toggleMaterialSelection = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleQuizSelection = (id: string) => {
    setSelectedQuizIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllPdfs = () => {
    const pdfIds = availablePdfs.map((m) => m.id);
    const allSelected = pdfIds.every((id) => selectedMaterialIds.includes(id));
    if (allSelected) {
      setSelectedMaterialIds((prev) => prev.filter((id) => !pdfIds.includes(id)));
    } else {
      setSelectedMaterialIds((prev) => Array.from(new Set([...prev, ...pdfIds])));
    }
  };

  const selectAllVideos = () => {
    const vidIds = availableVideos.map((m) => m.id);
    const allSelected = vidIds.every((id) => selectedMaterialIds.includes(id));
    if (allSelected) {
      setSelectedMaterialIds((prev) => prev.filter((id) => !vidIds.includes(id)));
    } else {
      setSelectedMaterialIds((prev) => Array.from(new Set([...prev, ...vidIds])));
    }
  };

  const selectAllQuizzes = () => {
    const qIds = availableQuizzes.map((q) => q.id);
    const allSelected = qIds.every((id) => selectedQuizIds.includes(id));
    if (allSelected) {
      setSelectedQuizIds((prev) => prev.filter((id) => !qIds.includes(id)));
    } else {
      setSelectedQuizIds((prev) => Array.from(new Set([...prev, ...qIds])));
    }
  };

  // Handle Save (Create or Update)
  const handleSaveCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setError('يرجى كتابة أو اختيار اسم المادة');
      return;
    }

    if (!coverImageFile && !coverImageUrl && !previewVideoFile && !previewVideoUrl) {
      setError('يرجى رفع صورة غلاف أو فيديو أنيميشن للمادة (أو إدخال رابط مباشر)');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      let finalCoverUrl = coverImageUrl.startsWith('blob:') ? '' : coverImageUrl;
      let finalCoverStoragePath = '';
      let finalVideoUrl = previewVideoUrl.startsWith('blob:') ? '' : previewVideoUrl;
      let finalVideoStoragePath = '';

      // 1. Upload Cover Image if a new file is chosen
      if (coverImageFile) {
        const imgRes = await uploadSubjectCoverImage(coverImageFile, selectedYear, (p) =>
          setUploadProgress(Math.round(p * 0.5))
        );
        finalCoverUrl = imgRes.publicUrl;
        finalCoverStoragePath = imgRes.storagePath;
      }

      // 2. Upload Preview Video if chosen
      if (previewVideoFile) {
        const vidRes = await uploadSubjectPreviewVideo(previewVideoFile, selectedYear, (p) =>
          setUploadProgress(50 + Math.round(p * 0.5))
        );
        finalVideoUrl = vidRes.publicUrl;
        finalVideoStoragePath = vidRes.storagePath;
      }

      // 3. Upsert Subject Cover Record
      const coverPayload: any = {
        subject_name: subjectName.trim(),
        year: selectedYear,
        subject_id: selectedSubjectId || null,
        cover_image_url: finalCoverUrl || '',
        professor_name: professorName.trim() || '',
        description: description.trim() || '',
        preview_video_url: finalVideoUrl || '',
      };

      if (finalCoverStoragePath) coverPayload.cover_image_storage_path = finalCoverStoragePath;
      if (finalVideoStoragePath) coverPayload.preview_video_storage_path = finalVideoStoragePath;

      let coverId = editingCoverId;

      if (isEditing && editingCoverId) {
        const updRes = await adminDbMutate({
          table: 'subject_covers',
          mutation: 'update',
          id: editingCoverId,
          data: coverPayload,
        });
        if (!updRes.success) throw new Error(updRes.error);
      } else {
        const insRes = await adminDbMutate({
          table: 'subject_covers',
          mutation: 'insert',
          data: coverPayload,
        });
        if (!insRes.success) throw new Error(insRes.error);
        coverId = insRes.data?.id;
      }

      if (!coverId) throw new Error('فشل الحصول على معرف الغلاف');

      // 4. Link Selected Materials to this Cover without re-uploading!
      // Step 4a: Link checked materials
      if (selectedMaterialIds.length > 0) {
        await adminDbMutate({
          table: 'materials',
          mutation: 'update',
          ids: selectedMaterialIds,
          data: { cover_id: coverId },
        });
      }

      // Step 4b: Unlink unchecked materials that belonged to this cover
      const unlinkedMaterialIds = materials
        .filter((m) => m.cover_id === coverId && !selectedMaterialIds.includes(m.id))
        .map((m) => m.id);

      if (unlinkedMaterialIds.length > 0) {
        await adminDbMutate({
          table: 'materials',
          mutation: 'update',
          ids: unlinkedMaterialIds,
          data: { cover_id: null },
        });
      }

      // 5. Link Selected Quizzes to this Cover without re-uploading!
      if (selectedQuizIds.length > 0) {
        await adminDbMutate({
          table: 'quizzes',
          mutation: 'update',
          ids: selectedQuizIds,
          data: { cover_id: coverId },
        });
      }

      const unlinkedQuizIds = quizzes
        .filter((q) => q.cover_id === coverId && !selectedQuizIds.includes(q.id))
        .map((q) => q.id);

      if (unlinkedQuizIds.length > 0) {
        await adminDbMutate({
          table: 'quizzes',
          mutation: 'update',
          ids: unlinkedQuizIds,
          data: { cover_id: null },
        });
      }

      setSuccess(
        isEditing
          ? 'تم تحديث غلاف المادة وربط المحتويات بنجاح!'
          : 'تم إنشاء غلاف المادة وربط المحاضرات بنجاح دون الحاجة لإعادة رفع أي ملف!'
      );

      resetForm();
      loadData();
      onRefresh?.();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ غلاف المادة');
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  // Delete Cover
  const handleDeleteCover = async (cover: SubjectCover) => {
    if (
      !confirm(
        `هل أنت متأكد من حذف غلاف مادة "${cover.subject_name}"؟\n(ملاحظة هامة: لن يتم حذف أي ملف PDF أو فيديو أو اختبار، بل سيتم فقط إزالة ربطها بالغلاف).`
      )
    ) {
      return;
    }

    try {
      // 1. Unlink materials & quizzes via secure server route
      await adminDbMutate({
        table: 'materials',
        mutation: 'update',
        filter: { cover_id: cover.id },
        data: { cover_id: null },
      });

      await adminDbMutate({
        table: 'quizzes',
        mutation: 'update',
        filter: { cover_id: cover.id },
        data: { cover_id: null },
      });

      // 2. Delete storage files if paths exist
      if (cover.cover_image_storage_path) {
        await deleteStorageFile(cover.cover_image_storage_path);
      }
      if (cover.preview_video_storage_path) {
        await deleteStorageFile(cover.preview_video_storage_path);
      }

      // 3. Delete cover row via secure server route
      const delRes = await adminDbMutate({
        table: 'subject_covers',
        mutation: 'delete',
        id: cover.id,
      });

      if (!delRes.success) throw new Error(delRes.error);

      setSuccess('تم حذف غلاف المادة بنجاح وإلغاء ارتباط المحتويات به.');
      loadData();
      onRefresh?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert('حدث خطأ أثناء حذف الغلاف: ' + err.message);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
            <FolderArchive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>إدارة أغلفة المواد ومعاينة الفيديو التفاعلية</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                YouTube Previews
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              رفع بوستر الغلاف، فيديو المعاينة المتحرك، وربط المحاضرات والفيديوهات والاختبارات الموجودة بنقرة واحدة دون إعادة رفع الملفات.
            </p>
          </div>
        </div>

        {/* Academic Year Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800">
          {ACADEMIC_YEARS.map((y) => (
            <button
              key={y.id}
              onClick={() => {
                setSelectedYear(y.id);
                resetForm();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedYear === y.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {y.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs sm:text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Existing Covers for this Year */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span>أغلفة المواد الحالية ({covers.length}) - {ACADEMIC_YEARS.find((y) => y.id === selectedYear)?.name}:</span>
          </h4>
          <button
            onClick={() => {
              resetForm();
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-400/30 text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء غلاف جديد</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs">جارٍ تحميل أغلفة المواد...</span>
          </div>
        ) : covers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center">
            <p className="text-sm text-slate-400 mb-3">
              لا توجد أغلفة مواد منشأة لـ {ACADEMIC_YEARS.find((y) => y.id === selectedYear)?.name} بعد.
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول غلاف مادة الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {covers.map((cov) => (
              <div
                key={cov.id}
                className="rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden flex flex-col group"
              >
                {/* Thumbnail / Video Preview */}
                <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cov.cover_image_url}
                    alt={cov.subject_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {cov.preview_video_url && (
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/40 text-[10px] font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                      <Video className="w-3 h-3 text-amber-400" />
                      <span>معاينة يوتيوب 🎬</span>
                    </div>
                  )}

                  {cov.professor_name && (
                    <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 text-[10px] font-bold text-slate-200">
                      {cov.professor_name}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                      {cov.subject_name}
                    </h5>
                    {cov.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {cov.description}
                      </p>
                    )}
                  </div>

                  {/* Linked Counts Pill */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">
                      <FileText className="w-3 h-3" />
                      <span>{cov.materials_count || 0} PDF</span>
                    </span>
                    <span className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                      <Video className="w-3 h-3" />
                      <span>{cov.videos_count || 0} فيديو</span>
                    </span>
                    <span className="flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                      <Award className="w-3 h-3" />
                      <span>{cov.quizzes_count || 0} اختبار</span>
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => handleEditCover(cov)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCover(cov)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Form */}
      {(isEditing || covers.length === 0) && (
        <form
          onSubmit={handleSaveCover}
          className="p-5 sm:p-7 rounded-3xl bg-slate-950/80 border border-amber-500/30 space-y-6 shadow-2xl relative"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h4 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>
                {editingCoverId ? 'تعديل غلاف المادة والمحتويات المرتبطة:' : 'إنشاء غلاف مادة جديد وربط المحاضرات:'}
              </span>
            </h4>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                title="إلغاء التعديل"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Section 1: Subject Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اختيار المادة من القائمة:
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => handleSelectSubjectChange(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none focus:border-amber-500"
              >
                <option value="">-- أو اختر مادة مقررة سابقة --</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسم المادة (الذي سيظهر للطلاب) *:
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="مثال: القانون المدني (مصادر الالتزام)"
                required
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسم الدكتور / أستاذ المادة (اختياري):
              </label>
              <input
                type="text"
                value={professorName}
                onChange={(e) => setProfessorName(e.target.value)}
                placeholder="مثال: د. وليد الشناوي"
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                وصف موجز للمادة أو نصيحة للطالب (اختياري):
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: تشمل محاضرات الفصل الدراسي الأول كاملة مع ملخصات المراجعة النهائية"
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Section 2: Media Upload (Cover Image & Optional Preview Video) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-800">
            {/* 2a. Cover Image Upload */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  <span>صورة الغلاف / البوستر (Thumbnail):</span>
                </label>
                <span className="text-[10px] text-slate-400">16:9 أو حسب التصميم المرفوع</span>
              </div>

              {coverImageUrl && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageUrl('');
                      setCoverImageFile(null);
                    }}
                    className="absolute top-2 left-2 p-1 rounded-lg bg-red-600 text-white text-xs cursor-pointer"
                    title="إزالة الصورة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <input
                type="file"
                accept="image/*,.jfif,.jpg,.jpeg,.png,.gif,.webp,.avif,.svg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCoverImageFile(file);
                    setCoverImageUrl(URL.createObjectURL(file));
                  }
                }}
                className="w-full text-xs text-slate-400 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer"
              />

              <div className="pt-1">
                <input
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="أو ضع رابط صورة مباشر (URL)..."
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 outline-none"
                />
              </div>
            </div>

            {/* 2b. Optional Hover Preview Video Upload */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Video className="w-4 h-4" />
                  <span>فيديو المعاينة المتحرك (YouTube Hover Preview) - اختياري:</span>
                </label>
                <span className="text-[10px] text-slate-400">mp4 / webm</span>
              </div>

              {previewVideoUrl && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-700">
                  <video
                    src={previewVideoUrl}
                    playsInline
                    muted
                    loop
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewVideoUrl('');
                      setPreviewVideoFile(null);
                    }}
                    className="absolute top-2 left-2 p-1 rounded-lg bg-red-600 text-white text-xs"
                    title="إزالة الفيديو"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <input
                type="file"
                accept="video/*,.mp4,.webm,.mov,.m4v,.avi,.mkv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPreviewVideoFile(file);
                    setPreviewVideoUrl(URL.createObjectURL(file));
                  }
                }}
                className="w-full text-xs text-slate-400 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />

              <div className="pt-1">
                <input
                  type="text"
                  value={previewVideoUrl}
                  onChange={(e) => setPreviewVideoUrl(e.target.value)}
                  placeholder="أو ضع رابط فيديو مباشر (mp4 URL)..."
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Link Existing Content (No Re-uploading) */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>ربط المحتويات الموجودة بهذا الغلاف (دون إعادة رفع أي ملف):</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                حدد المحاضرات والفيديوهات والاختبارات التي تنتمي إلى هذه المادة لتظهر للطالب فور نقره على الغلاف.
              </p>
            </div>

            {/* 3 Columns / Grids for PDFs, Videos, Quizzes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Checklist 1: PDFs */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>محاضرات PDF ({availablePdfs.length})</span>
                  </span>
                  {availablePdfs.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllPdfs}
                      className="text-[11px] text-amber-400 hover:underline font-semibold"
                    >
                      تحديد / إلغاء الكل
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {availablePdfs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      لا توجد محاضرات PDF مضافة لهذه الفرقة.
                    </p>
                  ) : (
                    availablePdfs.map((m) => {
                      const isChecked = selectedMaterialIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-start gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                            isChecked
                              ? 'bg-red-500/15 border-red-500/30 text-white'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMaterialSelection(m.id)}
                            className="mt-0.5 rounded accent-amber-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{m.title}</p>
                            <span className="text-[10px] text-slate-500 block">
                              {formatDateArabic(m.created_at)}
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Checklist 2: Videos */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Video className="w-4 h-4" />
                    <span>شروحات الفيديو ({availableVideos.length})</span>
                  </span>
                  {availableVideos.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllVideos}
                      className="text-[11px] text-amber-400 hover:underline font-semibold"
                    >
                      تحديد / إلغاء الكل
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {availableVideos.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      لا توجد شروحات فيديو مضافة لهذه الفرقة.
                    </p>
                  ) : (
                    availableVideos.map((m) => {
                      const isChecked = selectedMaterialIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-start gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                            isChecked
                              ? 'bg-blue-500/15 border-blue-500/30 text-white'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMaterialSelection(m.id)}
                            className="mt-0.5 rounded accent-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{m.title}</p>
                            <span className="text-[10px] text-slate-500 block">
                              {formatDateArabic(m.created_at)}
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Checklist 3: Quizzes */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>الاختبارات والأسئلة ({availableQuizzes.length})</span>
                  </span>
                  {availableQuizzes.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllQuizzes}
                      className="text-[11px] text-amber-400 hover:underline font-semibold"
                    >
                      تحديد / إلغاء الكل
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {availableQuizzes.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      لا توجد اختبارات مضافة لهذه الفرقة.
                    </p>
                  ) : (
                    availableQuizzes.map((q) => {
                      const isChecked = selectedQuizIds.includes(q.id);
                      return (
                        <label
                          key={q.id}
                          className={`flex items-start gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                            isChecked
                              ? 'bg-purple-500/15 border-purple-500/30 text-white'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleQuizSelection(q.id)}
                            className="mt-0.5 rounded accent-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{q.title}</p>
                            <span className="text-[10px] text-slate-500 block">
                              {q.question_count || 0} سؤال • {q.duration_minutes} دقيقة
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Upload progress */}
          {isSaving && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                <span>جارٍ رفع ملفات الغلاف...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                إلغاء
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-8 h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ الحفظ والربط...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isEditing ? 'حفظ تعديلات الغلاف' : 'حفظ الغلاف وربط المحتويات'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

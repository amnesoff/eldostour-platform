'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Video,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { AcademicYearId, Subject, MaterialType } from '@/types';
import { uploadMaterialFile } from '@/lib/supabase';
import { adminDbMutate } from '@/lib/apiClient';
import { formatFileSize } from '@/lib/utils';

interface BulkUploadFile {
  id: string;
  file: File;
  title: string;
  fileType: MaterialType;
  customDescription: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

interface BulkUploaderProps {
  subjects: Subject[];
  onUploadSuccess: () => void;
}

export function BulkUploader({ subjects, onUploadSuccess }: BulkUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedYear, setSelectedYear] = useState<AcademicYearId>(1);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [commonDescription, setCommonDescription] = useState('');
  const [filesQueue, setFilesQueue] = useState<BulkUploadFile[]>([]);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  // Filter subjects for the selected year
  const availableSubjects = subjects.filter((s) => s.year === selectedYear);

  // Auto-select first available subject if not set or invalid
  React.useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!availableSubjects.find((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedYear, availableSubjects, selectedSubjectId]);

  // Handle files selected from file input or drag-and-drop
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setGlobalError('');
    setGlobalSuccess('');

    const newQueueItems: BulkUploadFile[] = [];

    Array.from(files).forEach((file) => {
      // Determine file type
      const isPdf =
        file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
      const isVideo =
        file.type.includes('video') ||
        ['.mp4', '.webm', '.mkv', '.mov'].some((ext) =>
          file.name.toLowerCase().endsWith(ext)
        );

      if (!isPdf && !isVideo) {
        // Skip unsupported files
        return;
      }

      // Clean file title (remove extension and replace underscores)
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_]/g, ' ')
        .trim();

      newQueueItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        title: cleanTitle || file.name,
        fileType: isPdf ? 'pdf' : 'video',
        customDescription: commonDescription,
        progress: 0,
        status: 'pending',
      });
    });

    if (newQueueItems.length === 0) {
      setGlobalError('يرجى اختيار ملفات بصيغة PDF أو فيديوهات (MP4/WebM).');
      return;
    }

    setFilesQueue((prev) => [...prev, ...newQueueItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove single file from queue
  const handleRemoveFile = (id: string) => {
    setFilesQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Update item field
  const handleUpdateItem = (
    id: string,
    field: keyof BulkUploadFile,
    value: string
  ) => {
    setFilesQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Start Bulk Uploading
  const handleStartUpload = async () => {
    if (filesQueue.length === 0) return;
    if (!selectedSubjectId) {
      setGlobalError('يرجى اختيار المادة الدراسية قبل الرفع.');
      return;
    }

    setIsUploadingAll(true);
    setGlobalError('');
    setGlobalSuccess('');

    let completedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < filesQueue.length; i++) {
      const item = filesQueue[i];
      if (item.status === 'completed') {
        completedCount++;
        continue;
      }

      // Set item to uploading
      setFilesQueue((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f))
      );

      try {
        // 1. Upload file to Supabase Storage
        const uploadResult = await uploadMaterialFile(
          item.file,
          item.fileType,
          selectedYear,
          (progress) => {
            setFilesQueue((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress } : f))
            );
          }
        );

        if (!uploadResult) {
          throw new Error('فشل رفع الملف إلى التخزين السحابي');
        }

        // 2. Insert row into materials table via secure server route
        const mutateRes = await adminDbMutate({
          table: 'materials',
          mutation: 'insert',
          data: {
            title: item.title,
            description: item.customDescription || commonDescription || '',
            file_type: item.fileType,
            file_url: uploadResult.publicUrl,
            storage_path: uploadResult.storagePath,
            year: selectedYear,
            subject_id: selectedSubjectId,
            file_size: item.file.size,
            likes_count: 0,
          },
        });

        if (!mutateRes.success) {
          throw new Error(mutateRes.error || 'فشل حفظ بيانات الملف');
        }

        // Mark completed
        setFilesQueue((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'completed', progress: 100 } : f
          )
        );
        completedCount++;
      } catch (err: any) {
        failedCount++;
        setFilesQueue((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'error',
                  errorMessage: err?.message || 'حدث خطأ أثناء الرفع',
                }
              : f
          )
        );
      }
    }

    setIsUploadingAll(false);
    onUploadSuccess();

    if (failedCount === 0) {
      setGlobalSuccess(`تم رفع جميع الملفات بنجاح (${completedCount} ملف/فيديو)!`);
      // Clear completed files after 2 seconds
      setTimeout(() => {
        setFilesQueue((prev) => prev.filter((f) => f.status !== 'completed'));
      }, 2500);
    } else {
      setGlobalError(`اكتمل الرفع مع وجود خطأ في ${failedCount} ملف.`);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-right text-white">
      {/* Title */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              رفع المحاضرات والفيديوهات (رفع جماعي متعدد)
            </h3>
            <p className="text-xs text-slate-400">
              اختر عدة ملفات PDF أو مقاطع فيديو ليتم رفعها وتخزينها سحابياً في Supabase فوراً
            </p>
          </div>
        </div>
      </div>

      {/* Target Year & Subject Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
        {/* Academic Year Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            الفرقة الدراسية المستهدفة:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value) as AcademicYearId)}
            className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 text-white text-xs sm:text-sm outline-none"
          >
            {ACADEMIC_YEARS.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name} ({year.shortName})
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Subject Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            المادة الدراسية:
          </label>
          {availableSubjects.length > 0 ? (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 text-white text-xs sm:text-sm outline-none"
            >
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="h-11 px-3 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-400 text-xs flex items-center">
              لا توجد مواد مضافة لهذه الفرقة (يرجى إضافتها أولاً من تبويب المواد)
            </div>
          )}
        </div>

        {/* Common Note / Description */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            ملاحظة / وصف افتراضي للمحاضرات:
          </label>
          <input
            type="text"
            value={commonDescription}
            onChange={(e) => setCommonDescription(e.target.value)}
            placeholder="مثال: مراجعة نهائية، الجزء الأول، مهم للامتحان..."
            className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 text-white text-xs sm:text-sm outline-none"
          />
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFilesSelected(e.dataTransfer.files);
        }}
        className="w-full border-2 border-dashed border-amber-500/40 hover:border-amber-500 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,video/mp4,video/webm,video/mkv,video/quicktime,video/*"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h4 className="text-base font-bold text-white mb-1">
          اضغط هنا أو اسحب الملفات للإفلات
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mb-3">
          يمكنك تحديد عدة ملفات في نفس الوقت. ندعم ملفات PDF والمحاضرات المرئية المباشرة (MP4, WebM)
        </p>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-amber-300 font-medium">
          <Plus className="w-3.5 h-3.5" />
          تحديد ملفات جديدة
        </span>
      </div>

      {/* Global Status Notifications */}
      {globalSuccess && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{globalSuccess}</span>
        </div>
      )}

      {globalError && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Selected Files Queue Table / Cards */}
      {filesQueue.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>الملفات المحددة للرفع ({filesQueue.length}):</span>
            <button
              onClick={() => setFilesQueue([])}
              disabled={isUploadingAll}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              مسح الكل
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            <AnimatePresence>
              {filesQueue.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right"
                >
                  {/* File icon and title inputs */}
                  <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                    <span
                      className={`p-2 rounded-xl shrink-0 ${
                        item.fileType === 'pdf'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {item.fileType === 'pdf' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <Video className="w-5 h-5" />
                      )}
                    </span>

                    <div className="flex-1 w-full space-y-1">
                      {/* Editable Title */}
                      <input
                        type="text"
                        value={item.title}
                        disabled={item.status === 'uploading' || item.status === 'completed'}
                        onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                        className="w-full text-xs sm:text-sm font-bold bg-transparent border-b border-slate-700 focus:border-amber-400 text-white outline-none pb-0.5"
                        placeholder="عنوان المحاضرة..."
                      />

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{formatFileSize(item.file.size)}</span>
                        <span>•</span>
                        <span>{item.fileType === 'pdf' ? 'ملف PDF' : 'فيديو مباشر'}</span>
                        {item.errorMessage && (
                          <span className="text-red-400">{item.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Progress */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Status badge / Progress Bar */}
                    <div className="w-28 sm:w-32">
                      {item.status === 'uploading' && (
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-amber-400 mb-1">
                            <span>جارٍ الرفع...</span>
                            <span>{item.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {item.status === 'completed' && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم الرفع بنجاح</span>
                        </span>
                      )}

                      {item.status === 'error' && (
                        <span className="flex items-center gap-1 text-xs text-red-400 font-bold">
                          <AlertCircle className="w-4 h-4" />
                          <span>فشل الرفع</span>
                        </span>
                      )}

                      {item.status === 'pending' && (
                        <span className="text-xs text-slate-400">في الانتظار</span>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveFile(item.id)}
                      disabled={item.status === 'uploading'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                      title="إزالة من القائمة"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleStartUpload}
            disabled={isUploadingAll || filesQueue.length === 0 || !selectedSubjectId}
            className="w-full mt-4 h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {isUploadingAll ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جارٍ الرفع السحابي للملفات...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                <span>بدء الرفع السحابي ({filesQueue.length} ملف/فيديو)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

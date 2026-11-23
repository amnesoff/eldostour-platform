'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  FileText,
  Moon,
  Sun,
  Loader2,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Material } from '@/types';
import { COLLEGE_NAME, PLATFORM_NAME } from '@/lib/constants';
import { useStudentAuth } from '@/context/StudentAuthContext';
import { downloadDirectWatermarkedPdf } from '@/lib/pdfWatermark';

interface PdfModalProps {
  material: Material | null;
  onClose: () => void;
}

interface PdfPageCanvasProps {
  pdfDoc: any;
  pageNumber: number;
  zoomScale: number;
  isNightReader: boolean;
}

function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  zoomScale,
  isNightReader,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!canvasRef.current || !pdfDoc) return;

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Ignore cancel error
          }
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        // Container width calculation for responsive crisp scaling
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
        const containerWidth = Math.min(screenWidth - 32, 850);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetWidth = containerWidth * zoomScale;
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1.5 : 1.5;
        const scale = (targetWidth / unscaledViewport.width) * dpr;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${(viewport.height / viewport.width) * targetWidth}px`;

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering page ${pageNumber}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, zoomScale]);

  return (
    <div className="relative my-3 flex flex-col items-center select-none shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      {!isRendered && (
        <div className="w-full h-80 sm:h-96 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-xs">جاري تجهيز صفحة {pageNumber}...</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full transition-all duration-300 ${
          isNightReader ? 'filter invert-[0.92] hue-rotate-180 brightness-95 contrast-125' : ''
        }`}
      />
      <div className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[10px] text-center font-mono border-t border-slate-200 dark:border-slate-800">
        صفحة {pageNumber}
      </div>
    </div>
  );
}

export function PdfModal({ material, onClose }: PdfModalProps) {
  const { student, isGuest } = useStudentAuth();
  const [isNightReader, setIsNightReader] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const watermarkName = student?.full_name || (isGuest ? 'زائر' : 'طالب كلية الحقوق');
  const watermarkCode = student?.student_code || 'DST-LAW';
  const fullWatermarkText = `${watermarkName} • ${watermarkCode} • ${PLATFORM_NAME}`;

  // Load PDF with PDF.js
  useEffect(() => {
    if (!material?.file_url) return;

    let isCancelled = false;
    setIsLoadingPdf(true);
    setLoadError(null);
    setPdfDoc(null);
    setNumPages(0);

    const loadPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({
          url: material.file_url,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setIsLoadingPdf(false);
        }
      } catch (err: any) {
        console.warn('PDF.js loading error:', err);
        if (!isCancelled) {
          setLoadError(err?.message || 'تعذر تحميل صفحات ملف الـ PDF');
          setIsLoadingPdf(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [material?.file_url]);

  if (!material) return null;

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadDirectWatermarkedPdf(material.file_url, material.title, {
        name: watermarkName,
        code: watermarkCode,
      });
    } catch (err) {
      console.warn('Download error in viewer:', err);
      window.open(material.file_url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.15, 0.7));
  const handleZoomReset = () => setZoomScale(1);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[92vh]"
        >
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 gap-2 shrink-0">
            {/* Title & Subject */}
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0 max-w-[45%] sm:max-w-[40%]">
              <span className="p-1.5 rounded-lg bg-red-500/20 text-red-500 shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <div className="truncate text-right">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {material.title}
                </h3>
                {numPages > 0 && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                    {numPages} صفحة
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Zoom + Night + Download + Close */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-amber-500 rounded-lg"
                  title="تكبير"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300 hover:text-amber-500 rounded"
                  title="إعادة ضبط الحجم"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-amber-500 rounded-lg"
                  title="تصغير"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* PDF Night Reader Inverter */}
              <button
                onClick={() => setIsNightReader(!isNightReader)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  isNightReader
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                }`}
                title="عكس ألوان ملف الـ PDF لقراءة مريحة ليلاً"
              >
                {isNightReader ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isNightReader ? 'نهاري' : 'ليلي'}</span>
              </button>

              {/* Direct One-Tap Download Button */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer"
                title="تحميل مباشر إلى الجهاز"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل مباشر</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-red-500/20 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Canvas Scroll Viewer Area with Anti-Leak Repeating Watermark */}
          <div
            ref={containerRef}
            className="flex-1 w-full bg-slate-200/90 dark:bg-slate-950 relative overflow-y-auto overflow-x-hidden p-2 sm:p-5 flex flex-col items-center"
          >
            {/* Dynamic Repeating Watermark Layer */}
            <div className="absolute inset-0 z-20 pointer-events-none select-none flex flex-wrap items-center justify-around overflow-hidden opacity-[0.07] dark:opacity-[0.05] rotate-[-22deg] scale-125">
              {Array.from({ length: 24 }).map((_, idx) => (
                <div key={idx} className="p-8 text-center space-y-1">
                  <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-wider">
                    {fullWatermarkText}
                  </div>
                  <div className="text-xs font-bold text-amber-500 tracking-widest">
                    {COLLEGE_NAME}
                  </div>
                </div>
              ))}
            </div>

            {/* Loading State */}
            {isLoadingPdf && (
              <div className="my-auto flex flex-col items-center justify-center p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  جاري إعداد صفحات ملف الـ PDF...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  عرض بدقة عالية ومباشر بدون زر فتح خارجي
                </p>
              </div>
            )}

            {/* Error State with Direct Link Fallback */}
            {loadError && (
              <div className="my-auto flex flex-col items-center justify-center p-8 text-center max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-xl">
                <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  تعذر العرض المباشر لصفحات الملف
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
                  يمكنك تحميل الملف مباشرة أو فتحه في المتصفح بكل سهولة:
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الملف الآن</span>
                  </button>
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>فتح في تبويب</span>
                  </a>
                </div>
              </div>
            )}

            {/* Render All Pages as Native HTML5 Canvases */}
            {pdfDoc && numPages > 0 && (
              <div className="w-full flex flex-col items-center max-w-4xl z-10">
                {Array.from({ length: numPages }).map((_, index) => (
                  <PdfPageCanvas
                    key={index + 1}
                    pdfDoc={pdfDoc}
                    pageNumber={index + 1}
                    zoomScale={zoomScale}
                    isNightReader={isNightReader}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Note footer if present */}
          {material.description && (
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-right shrink-0">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold text-amber-600 dark:text-amber-400 ml-1">توجيه:</span>
                {material.description}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

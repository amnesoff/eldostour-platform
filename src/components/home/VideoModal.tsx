'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Download,
  Video as VideoIcon,
} from 'lucide-react';
import { Material } from '@/types';

interface VideoModalProps {
  material: Material | null;
  onClose: () => void;
}

export function VideoModal({ material, onClose }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Feature #9: Resume Video Timestamp
  const [savedResumeTime, setSavedResumeTime] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  useEffect(() => {
    if (!material) return;
    const savedTime = localStorage.getItem(`eldostour_video_pos_${material.id}`);
    if (savedTime && Number(savedTime) > 15) {
      setSavedResumeTime(Number(savedTime));
      setShowResumePrompt(true);
    } else {
      setShowResumePrompt(false);
      setSavedResumeTime(null);
    }
  }, [material]);

  const handleResumePlayback = () => {
    if (videoRef.current && savedResumeTime) {
      videoRef.current.currentTime = savedResumeTime;
      videoRef.current.play();
      setIsPlaying(true);
    }
    setShowResumePrompt(false);
  };

  const togglePlay = React.useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Keyboard shortcut listener (Space to play/pause, Esc to close)
  useEffect(() => {
    if (!material) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [material, onClose, togglePlay]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      if (material && cur > 5) {
        localStorage.setItem(`eldostour_video_pos_${material.id}`, String(Math.floor(cur)));
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const skipSeconds = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        Math.max(videoRef.current.currentTime + seconds, 0),
        duration
      );
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const rates = [0.75, 1, 1.25, 1.5, 2];

  if (!material) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/80 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <VideoIcon className="w-4 h-4" />
              </span>
              <div className="truncate text-right">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {material.title}
                </h3>
                {material.subjects?.name && (
                  <span className="text-[11px] text-amber-400 font-medium">
                    {material.subjects.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={material.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white transition-colors"
                title="تحميل ملف الفيديو"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تحميل</span>
              </a>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-red-400 transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Video Player Box */}
          <div
            ref={containerRef}
            className="relative bg-black flex items-center justify-center aspect-video w-full select-none overflow-hidden group"
            onMouseEnter={() => setShowControls(true)}
            onMouseMove={() => setShowControls(true)}
          >
            {/* Feature #9: Resume Playback Toast */}
            {showResumePrompt && savedResumeTime && (
              <div className="absolute top-4 right-4 z-30 p-3 rounded-2xl bg-slate-900/95 border border-amber-500 text-white text-xs shadow-2xl flex items-center gap-3 backdrop-blur-md">
                <div className="text-right">
                  <span className="font-bold block text-amber-400">استئناف المشاهدة:</span>
                  <span>توقفت سابقاً عند الدقيقة {Math.floor(savedResumeTime / 60)}:{('0' + (savedResumeTime % 60)).slice(-2)}</span>
                </div>
                <button
                  onClick={handleResumePlayback}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 flex items-center gap-1 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استئناف</span>
                </button>
                <button
                  onClick={() => setShowResumePrompt(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <video
              ref={videoRef}
              src={material.file_url}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              playsInline
            />

            {/* Big center play icon overlay if paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-10"
                aria-label="تشغيل"
              >
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-0.5" />
              </button>
            )}

            {/* Custom Bottom Controls Bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 z-20 ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Progress Bar Seek Slider */}
              <div className="relative mb-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                {/* Left controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-1 hover:text-amber-400 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  <button
                    onClick={() => skipSeconds(-10)}
                    className="p-1 text-slate-300 hover:text-white transition-colors"
                    title="ترجيع 10 ثواني"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => skipSeconds(10)}
                    className="p-1 text-slate-300 hover:text-white transition-colors"
                    title="تقديم 10 ثواني"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={toggleMute} className="p-1 hover:text-amber-400">
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-14 sm:w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-amber-500 hidden sm:inline-block"
                    />
                  </div>

                  {/* Time display */}
                  <span className="text-[11px] text-slate-300 tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right controls: Playback speeds & fullscreen */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white/10 rounded-lg p-0.5">
                    {rates.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold transition-colors ${
                          playbackRate === rate
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 text-slate-300 hover:text-white transition-colors"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Notes at bottom */}
          {material.description && (
            <div className="p-4 sm:p-5 bg-slate-900 border-t border-white/5 text-right overflow-y-auto">
              <h4 className="text-xs font-bold text-amber-400 mb-1">
                ملاحظات وتوجيهات المحاضرة:
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {material.description}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

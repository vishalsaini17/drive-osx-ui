import React, { useState, useEffect } from 'react';
import { PageSize, Slide } from '../types';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Clock,
  FileText,
  MousePointer,
  RotateCcw,
  Play,
  Pause,
  Tv,
} from 'lucide-react';
import { SlideCanvas } from './SlideCanvas';
import { useContainerWidth } from '../../../platform/layout/useContainerWidth';

interface PresentationModeProps {
  slides: Slide[];
  initialSlideIndex?: number;
  onClose: () => void;
  pageSize?: PageSize;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  slides,
  initialSlideIndex = 0,
  onClose,
  pageSize,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialSlideIndex);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [isLaserPointerActive, setIsLaserPointerActive] = useState<boolean>(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Presentation Timer
  const [seconds, setSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  const currentSlide = slides[currentIndex] || slides[0];

  // This overlay fills whatever the app window actually is — which on a
  // narrow window (or a phone, where the shell forces the window to fill the
  // real screen below its own mobile breakpoint) can be well under the width
  // the fixed w-96 notes panel below assumed. Same container-width approach
  // as the editor behind it, not the browser viewport.
  const { ref: rootRef, width } = useContainerWidth<HTMLDivElement>(0, 1024);
  const isCompact = width < 760;

  // Timer Interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, onClose]);

  // Track Laser Pointer Cursor
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLaserPointerActive) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  // Format Timer
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Transition Animation Style
  const getTransitionClass = (transition: string) => {
    switch (transition) {
      case 'fade':
        return 'animate-fade-in transition-all duration-500';
      case 'slide':
        return 'animate-slide-in-right transition-all duration-500';
      case 'zoom':
        return 'animate-zoom-in transition-all duration-500';
      default:
        return '';
    }
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-sans overflow-hidden select-none"
    >
      {/* Laser Pointer Red Glow Follower */}
      {isLaserPointerActive && (
        <div
          className="fixed w-6 h-6 rounded-full bg-rose-500 shadow-[0_0_20px_#f43f5e] pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 border-2 border-white animate-pulse"
          style={{ left: laserPos.x, top: laserPos.y }}
        />
      )}

      {/* Top Controls Overlay */}
      <div
        className={`bg-slate-900/90 backdrop-blur-md py-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 z-30 ${
          isCompact ? 'px-3' : 'px-6'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white shrink-0">
            <Tv size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-sm text-white tracking-wide truncate">{currentSlide.title}</h3>
            <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">
              Slide {currentIndex + 1} of {slides.length}
            </span>
          </div>
        </div>

        {/* Presenter Utilities — labels drop below `isCompact` so this row
            keeps up with the slide title chip instead of wrapping onto it. */}
        <div className={`flex items-center shrink-0 ${isCompact ? 'gap-1.5' : 'gap-3'}`}>
          {/* Timer Widget */}
          <div
            className={`flex items-center gap-2 bg-slate-800/80 py-1.5 rounded-xl border border-slate-700 text-xs font-mono font-bold ${
              isCompact ? 'px-2' : 'px-3'
            }`}
          >
            <Clock size={14} className="text-emerald-400" />
            <span>{formatTime(seconds)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="hover:text-emerald-400 cursor-pointer p-0.5 ml-1"
            >
              {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              onClick={() => setSeconds(0)}
              className="hover:text-rose-400 cursor-pointer p-0.5"
              title="Reset Timer"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Laser Pointer Toggle */}
          <button
            onClick={() => setIsLaserPointerActive(!isLaserPointerActive)}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isCompact ? 'px-2.5' : 'px-3'
            } ${
              isLaserPointerActive
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Laser Pointer"
          >
            <MousePointer size={14} /> {!isCompact && 'Laser Pointer'}
          </button>

          {/* Speaker Notes Toggle */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isCompact ? 'px-2.5' : 'px-3'
            } ${
              showNotes
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Presenter Notes"
          >
            <FileText size={14} /> {!isCompact && 'Presenter Notes'}
          </button>

          {/* Exit Fullscreen Presentation */}
          <button
            onClick={onClose}
            className={`py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
              isCompact ? 'px-2.5' : 'px-3.5'
            }`}
            title="Exit (Esc)"
          >
            <X size={14} /> {!isCompact && 'Exit (Esc)'}
          </button>
        </div>
      </div>

      {/* Main Presentation Viewport & Speaker Notes Split */}
      <div
        className={`flex-1 flex items-center justify-center relative overflow-hidden ${
          isCompact ? 'p-3' : 'p-8'
        }`}
      >
        {/* Slide Canvas Wrapper with Transition */}
        <div className={`w-full max-w-5xl ${getTransitionClass(currentSlide.transition)}`}>
          <SlideCanvas
            slide={currentSlide}
            selectedElementId={null}
            onSelectElement={() => {}}
            onUpdateElement={() => {}}
            onDeleteElement={() => {}}
            isReadOnly={true}
            pageSize={pageSize}
          />
        </div>

        {/* Presenter Notes Drawer Overlay — a right-hand panel on a wide
            window; on `isCompact` a w-96 (384px) panel would run off the edge
            of a phone-width screen, so it becomes a bottom sheet instead. */}
        {showNotes && (
          <div
            className={`bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md p-5 flex flex-col z-40 ${
              isCompact ? 'absolute inset-x-3 bottom-3 top-1/2' : 'absolute right-6 bottom-6 top-6 w-96'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-400" />
                <span className="font-extrabold text-xs text-white uppercase tracking-wider">Presenter Notes</span>
              </div>
              <button
                onClick={() => setShowNotes(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto text-xs font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">
              {currentSlide.notes || 'No speaker notes written for this slide.'}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Slideshow Navigator */}
      <div
        className={`bg-slate-900/90 backdrop-blur-md py-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0 z-30 ${
          isCompact ? 'px-3' : 'px-6'
        }`}
      >
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl cursor-pointer transition-colors"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1))}
            disabled={currentIndex === slides.length - 1}
            className={`p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-bold ${
              isCompact ? 'px-2.5' : 'px-4'
            }`}
            title="Next Slide (Right Arrow / Space)"
          >
            {!isCompact && <span>Next</span>}
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Thumbnail Dots Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 max-w-md px-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentIndex(idx)}
              className={`shrink-0 h-2 rounded-full transition-all cursor-pointer ${
                idx === currentIndex ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* Decorative hint — the first thing dropped once space is tight. */}
        {!isCompact && (
          <span className="text-xs font-extrabold text-slate-400 shrink-0">
            Use ← → Arrow Keys to navigate
          </span>
        )}
      </div>
    </div>
  );
};

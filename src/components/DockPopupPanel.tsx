import React from 'react';
import { motion } from 'framer-motion';
import { useSystemStore } from '../systemStore';

interface DockPopupPanelProps {
  id: string;
  position?: 'left' | 'right';
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
  className?: string;
}

export function DockPopupPanel({
  id,
  position = 'left',
  onClose,
  children,
  widthClass = 'w-[335px]',
  className = '',
}: DockPopupPanelProps) {
  const theme = useSystemStore((state) => state.settings.theme);
  const isLight = theme === 'classic-light';

  const positionClass =
    position === 'left'
      ? 'left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 md:-translate-x-[15%]'
      : 'right-1/2 translate-x-1/2 sm:right-0 sm:translate-x-0';

  return (
    <>
      {/* Click outside backdrop */}
      <div
        className="fixed inset-0 z-[990] cursor-default pointer-events-auto bg-black/10 sm:bg-transparent transition-opacity"
        onClick={onClose}
      />

      {/* Reusable Popup Panel Container */}
      <motion.div
        id={id}
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.94 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className={`absolute bottom-[76px] sm:bottom-[86px] ${positionClass} ${widthClass} max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-95px)] overflow-y-auto rounded-[22px] sm:rounded-[26px] p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3 z-[999] pointer-events-auto select-none font-sans ${
          isLight
            ? 'bg-[#f2f2f6]/95 backdrop-blur-2xl text-slate-800 border border-slate-300/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)]'
            : 'bg-[#2d2c30] backdrop-blur-2xl text-white border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
        } ${className}`}
      >
        {children}
      </motion.div>
    </>
  );
}

interface DockPopupCardProps {
  children: React.ReactNode;
  className?: string;
}

export function DockPopupCard({ children, className = '' }: DockPopupCardProps) {
  const theme = useSystemStore((state) => state.settings.theme);
  const isLight = theme === 'classic-light';

  return (
    <div
      className={`rounded-[16px] sm:rounded-[20px] p-2.5 sm:p-3.5 flex flex-col gap-2 sm:gap-2.5 shadow-xs border ${
        isLight ? 'bg-white border-slate-200/80 text-slate-800' : 'bg-[#3c3b40] border-white/5 text-white'
      } ${className}`}
    >
      {children}
    </div>
  );
}

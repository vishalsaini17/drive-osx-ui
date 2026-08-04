import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { SystemNotification } from '../types';

export default function SystemToastNotifier() {
  const [activeToast, setActiveToast] = useState<SystemNotification | null>(null);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SystemNotification>;
      if (customEvent.detail) {
        setActiveToast(customEvent.detail);
      }
    };

    window.addEventListener('system-toast-notification', handleToastEvent);
    return () => window.removeEventListener('system-toast-notification', handleToastEvent);
  }, []);

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  if (!activeToast) return null;

  const isError = activeToast.type === 'error';
  const isWarning = activeToast.type === 'warning';
  const isSuccess = activeToast.type === 'success';

  return (
    <div className="fixed top-12 right-6 z-[99999] pointer-events-auto max-w-sm select-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className={`p-3.5 rounded-2xl shadow-2xl border backdrop-blur-2xl flex items-start gap-3 ${
            isError
              ? 'bg-red-950/90 border-red-500/50 text-white'
              : isWarning
              ? 'bg-amber-950/90 border-amber-500/50 text-white'
              : isSuccess
              ? 'bg-emerald-950/90 border-emerald-500/50 text-white'
              : 'bg-zinc-900/90 border-zinc-700/60 text-white'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {isError ? (
              <AlertCircle size={20} className="text-red-400 animate-pulse" />
            ) : isWarning ? (
              <AlertTriangle size={20} className="text-amber-400" />
            ) : isSuccess ? (
              <CheckCircle2 size={20} className="text-emerald-400" />
            ) : (
              <Info size={20} className="text-blue-400" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-xs font-bold truncate tracking-wide uppercase text-white/90">
                {activeToast.sender}
              </span>
              <span className="text-[10px] text-white/50 font-medium">Just now</span>
            </div>
            <p className="text-xs text-white/80 leading-snug break-words">
              {activeToast.text}
            </p>
          </div>

          <button
            onClick={() => setActiveToast(null)}
            className="p-1 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

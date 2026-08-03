import React from 'react';
import { motion } from 'framer-motion';
import { useSystemStore, getAppIcon } from '../systemStore';
import { DockPopupPanel, DockPopupCard } from './DockPopupPanel';
import { WindowState } from '../types';

interface MoreAppsPopupProps {
  onClose: () => void;
  overflowApps: WindowState[];
  toggleWindow: (id: string) => void;
}

export default function MoreAppsPopup({
  onClose,
  overflowApps,
  toggleWindow,
}: MoreAppsPopupProps) {
  const theme = useSystemStore((state) => state.settings.theme);
  const isLight = theme === 'classic-light';

  return (
    <DockPopupPanel
      id="dock-more-apps-panel"
      position="right"
      widthClass="w-[260px]"
      onClose={onClose}
    >
      <DockPopupCard className="gap-2">
        <div className="flex items-center justify-between px-0.5 select-none">
          <span
            className={`text-[10px] font-extrabold tracking-wider uppercase ${
              isLight ? 'text-slate-500' : 'text-white/60'
            }`}
          >
            More Apps
          </span>
          <span
            className={`text-[10px] font-bold ${
              isLight ? 'text-slate-400' : 'text-white/40'
            }`}
          >
            {overflowApps.length} Apps
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {overflowApps.map((app) => {
            const isActive = app.isOpen;

            return (
              <motion.button
                key={app.id}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  toggleWindow(app.id);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer text-center relative group focus:outline-none ${
                  isLight
                    ? 'bg-slate-50/90 border-slate-200/80 hover:bg-white hover:border-blue-300 hover:shadow-sm'
                    : 'bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/20'
                }`}
                title={`Open ${app.title}`}
              >
                <div className="w-8.5 h-8.5 flex items-center justify-center rounded-xl mb-1 shrink-0">
                  {getAppIcon(app.id, 'w-full h-full')}
                </div>
                <span
                  className={`text-[9px] font-bold tracking-tight leading-tight truncate w-full ${
                    isLight ? 'text-slate-800' : 'text-white/90'
                  }`}
                >
                  {app.title.replace('System ', '').replace('Web ', '')}
                </span>

                {/* Running Status Dot */}
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.9)]" />
                )}
              </motion.button>
            );
          })}
        </div>
      </DockPopupCard>
    </DockPopupPanel>
  );
}

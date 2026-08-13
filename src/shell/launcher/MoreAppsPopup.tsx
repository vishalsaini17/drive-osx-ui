import React from 'react';
import { motion } from 'framer-motion';
import { getAppIcon } from '../state/systemStore';
import { useShellTheme } from '../../platform/theme/useShellTheme';
import { DockPopupPanel, DockPopupCard, DockPopupSectionLabel } from '../taskbar/DockPopupPanel';
import { WindowState } from '../../platform/types';

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
  const shell = useShellTheme();

  return (
    <DockPopupPanel
      id="dock-more-apps-panel"
      position="right"
      widthClass="w-[260px]"
      onClose={onClose}
    >
      <DockPopupCard className="gap-2">
        <div className="flex items-center justify-between select-none">
          <DockPopupSectionLabel>More Apps</DockPopupSectionLabel>
          <span
            className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full font-bold ${shell.card} ${shell.textSubtle}`}
          >
            {overflowApps.length}
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
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer text-center relative group focus:outline-none ${shell.card} ${shell.cardHover}`}
                title={`Open ${app.title}`}
              >
                <div className="w-8.5 h-8.5 flex items-center justify-center rounded-xl mb-1 shrink-0">
                  {getAppIcon(app.id, 'w-full h-full')}
                </div>
                <span
                  className={`text-[9px] font-semibold tracking-tight leading-tight truncate w-full ${shell.textMuted}`}
                >
                  {app.title.replace('System ', '').replace('Web ', '')}
                </span>

                {/* Running Status Dot */}
                {isActive && (
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: shell.accentColor, boxShadow: `0 0 5px ${shell.accentColor}` }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </DockPopupCard>
    </DockPopupPanel>
  );
}

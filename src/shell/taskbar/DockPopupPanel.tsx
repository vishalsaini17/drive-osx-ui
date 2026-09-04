import React from 'react';
import { motion } from 'framer-motion';
import { useShellTheme } from '../../platform/theme/useShellTheme';

/**
 * The shared surface for everything that opens out of the dock.
 *
 * These panels are visually anchored to the dock pill they emerge from, so they
 * use the same material: `shell.panel`. That is the whole point of the surface
 * tokens — the dock, its panels, the application menu and the notification
 * centre are one system, and none of them can drift on its own any more. This
 * component previously hardcoded a violet tint, which was correct only while
 * the dock happened to be violet.
 *
 * Radii are concentric — a nested corner only looks right when the outer radius
 * equals the inner radius plus the padding between them. The dock pill is 20px,
 * so cards inside a panel use 16px and the panel adds 12px of padding to reach
 * 28px. Change one of the three and the other two have to move with it.
 */

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
  const shell = useShellTheme();

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

      <motion.div
        id={id}
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.94 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className={`absolute bottom-[76px] sm:bottom-[86px] ${positionClass} ${widthClass} max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-95px)] overflow-y-auto rounded-[28px] p-3 flex flex-col gap-2.5 z-[999] pointer-events-auto select-none font-sans ${shell.panel} ${shell.text} ${className}`}
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

/**
 * A section inside a panel. Sits one step above the panel surface so sections
 * separate without needing heavy borders between them.
 */
export function DockPopupCard({ children, className = '' }: DockPopupCardProps) {
  const shell = useShellTheme();

  return (
    // 16px — the dock pill's radius less the panel padding. See the note above.
    <div className={`rounded-2xl p-3 flex flex-col gap-2.5 ${shell.card} ${shell.text} ${className}`}>
      {children}
    </div>
  );
}

/**
 * The small uppercase label that titles a section. Extracted because the two
 * panels had drifted to different sizes and weights for the same role.
 */
export function DockPopupSectionLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shell = useShellTheme();

  return (
    <span
      className={`text-[10px] font-bold tracking-wider uppercase select-none ${shell.textSubtle} ${className}`}
    >
      {children}
    </span>
  );
}

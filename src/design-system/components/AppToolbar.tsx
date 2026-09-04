import React from 'react';

interface AppToolbarProps {
  title?: string;
  icon?: React.ReactNode;
  leftActions?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightActions?: React.ReactNode;
  className?: string;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({
  title,
  icon,
  leftActions,
  centerContent,
  rightActions,
  className = '',
}) => {
  return (
    <div
      className={`h-10 px-3 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between shrink-0 gap-2 select-none ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {leftActions}
        {icon && <span className="shrink-0">{icon}</span>}
        {title && (
          <h2 className="text-xs font-semibold text-current truncate tracking-wide">
            {title}
          </h2>
        )}
      </div>

      {centerContent && (
        <div className="flex-1 max-w-md mx-2 flex justify-center">
          {centerContent}
        </div>
      )}

      {rightActions && (
        <div className="flex items-center gap-1.5 shrink-0 justify-end">
          {rightActions}
        </div>
      )}
    </div>
  );
};

export default AppToolbar;

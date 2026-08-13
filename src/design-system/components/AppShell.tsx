import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  ({ children, className = '', style }, ref) => {
    return (
      <div
        ref={ref}
        style={style}
        className={`w-full h-full flex flex-col select-none overflow-hidden relative ${className}`.trim()}
      >
        {children}
      </div>
    );
  }
);

AppShell.displayName = 'AppShell';

export default AppShell;

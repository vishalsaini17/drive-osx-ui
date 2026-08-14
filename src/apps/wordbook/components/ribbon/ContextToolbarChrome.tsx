import React from 'react';

/** Shared floating-pill chrome for the table/image contextual toolbars — the Word/Docs "select an object, a small toolbar appears above it" pattern. */
export function ContextToolbarChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 bg-[#1e1a2e] text-white rounded-lg shadow-xl border border-white/10 px-1.5 py-1">
      {children}
    </div>
  );
}

export function ContextToolbarButton({
  onClick,
  title,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-7 min-w-7 px-1.5 rounded flex items-center justify-center gap-1 text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        danger ? 'text-red-300 hover:bg-red-500/20' : 'text-white/85 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export function ContextToolbarDivider() {
  return <div className="w-px h-5 bg-white/15 mx-1" />;
}

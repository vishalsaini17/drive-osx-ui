import React from 'react';

interface SidebarPanelProps {
  dataName?: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The common frame every Activity Bar panel (Explorer, Search, …) sits in —
 * fixed width, dark background, and the view's own title row pinned to the
 * top exactly like VS Code's side bar, which always shows "EXPLORER" /
 * "SEARCH" above whatever that view is currently displaying (even an empty
 * state), not just when there's content.
 */
export default function SidebarPanel({ dataName, title, actions, children }: SidebarPanelProps) {
  return (
    <div data-name={dataName} className="w-60 shrink-0 border-r border-[var(--wb-border-strong)] bg-[var(--wb-surface-raised)] flex flex-col overflow-hidden">
      <div className="h-9 px-4 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold tracking-wide text-[var(--wb-fg)]/60">{title}</span>
        {actions && <div className="flex items-center gap-0.5 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

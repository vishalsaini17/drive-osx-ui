import React from 'react';
import { Files, Search, Settings } from 'lucide-react';

export type ActivityPanel = 'explorer' | 'search';

interface ActivityBarProps {
  active: ActivityPanel | null;
  onSelect: (panel: ActivityPanel) => void;
  settingsActive: boolean;
  onOpenSettings: () => void;
}

const ITEMS: { id: ActivityPanel; label: string; Icon: typeof Files }[] = [
  { id: 'explorer', label: 'Explorer', Icon: Files },
  { id: 'search', label: 'Search', Icon: Search },
];

/**
 * VS Code's Activity Bar — narrow icon strip on the far left that switches
 * which sidebar panel is showing. Source Control, Run/Debug, and Extensions
 * are deliberately not here: this platform has no Git integration, no
 * code-execution/debugger backend, and no extension host/marketplace, so
 * those icons would open panels with nothing real behind them.
 */
export default function ActivityBar({ active, onSelect, settingsActive, onOpenSettings }: ActivityBarProps) {
  return (
    <div id="editor-activity-bar" className="w-11 shrink-0 bg-[var(--wb-surface-sunken)] border-r border-[var(--wb-border-strong)] flex flex-col items-center py-2 gap-1">
      {ITEMS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            id={`editor-activity-bar-${id}`}
            onClick={() => onSelect(id)}
            title={label}
            className={`relative w-11 h-11 flex items-center justify-center cursor-pointer ${
              isActive ? 'text-[var(--wb-fg)]' : 'text-[var(--wb-fg)]/40 hover:text-[var(--wb-fg)]/80'
            }`}
          >
            {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--wb-accent)]" />}
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.75} />
          </button>
        );
      })}
      <button
        id="editor-activity-bar-settings"
        onClick={onOpenSettings}
        title="Settings"
        className={`mt-auto relative w-11 h-11 flex items-center justify-center cursor-pointer ${
          settingsActive ? 'text-[var(--wb-fg)]' : 'text-[var(--wb-fg)]/40 hover:text-[var(--wb-fg)]/80'
        }`}
      >
        {settingsActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--wb-accent)]" />}
        <Settings className="w-5 h-5" strokeWidth={settingsActive ? 2.25 : 1.75} />
      </button>
    </div>
  );
}

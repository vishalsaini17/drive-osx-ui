import React from 'react';
import { X, Plus, Circle } from 'lucide-react';

export interface EditorTabMeta {
  id: string;
  fileName: string;
  isDirty: boolean;
}

interface EditorTabBarProps {
  tabs: EditorTabMeta[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

export default function EditorTabBar({ tabs, activeTabId, onSelect, onClose, onNew }: EditorTabBarProps) {
  return (
    <div id="editor-tab-bar" className="flex items-stretch h-9 bg-[var(--wb-surface)] border-b border-[var(--wb-border-strong)] overflow-x-auto shrink-0 select-none">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`group flex items-center gap-2 pl-3 pr-2 h-full text-xs cursor-pointer border-r border-[var(--wb-border-strong)] min-w-[110px] max-w-[200px] shrink-0 ${
              active ? 'bg-[var(--wb-surface)] text-[var(--wb-fg)]' : 'bg-[var(--wb-surface-overlay)] text-[var(--wb-fg)]/50 hover:bg-[var(--wb-tab-hover)] hover:text-[var(--wb-fg)]/80'
            }`}
            style={active ? { boxShadow: 'inset 0 -2px 0 0 var(--wb-accent)' } : undefined}
            title={tab.fileName}
          >
            <span className="truncate flex-1">{tab.fileName}</span>
            {tab.isDirty ? (
              <Circle
                className="w-2 h-2 shrink-0 fill-current text-[var(--wb-fg)]/70 group-hover:hidden"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            ) : null}
            <button
              type="button"
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              className={`w-4 h-4 shrink-0 rounded hover:bg-[var(--wb-fg)]/15 items-center justify-center ${
                tab.isDirty ? 'hidden group-hover:flex' : 'flex'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        title="New file (Ctrl+N)"
        onClick={onNew}
        className="w-9 h-full flex items-center justify-center text-[var(--wb-fg)]/50 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-tab-hover)] shrink-0"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Plus,
  FileText,
  MoreVertical,
  Trash2,
  Copy,
  Pencil,
  SmilePlus,
  Link2,
  PanelLeft,
  ArrowUp,
  ArrowDown,
  Indent,
} from 'lucide-react';
import { BookSection } from '../../../platform/documents/book/bookFormat';
import { MenuItem, separator } from '../../../platform/menus/types';
import { MenuPanel, placePanel, Placement } from '../../../shell/window-manager/WindowMenu';
import { buildTabTree, descendantIds, TabNode } from '../documentTabs';

const LIGHT_THEME_ID = 'nova-light';

export interface DocumentTabsApi {
  tabs: BookSection[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
  onAddSubtab: (parentId: string) => void;
  onDeleteTab: (id: string) => void;
  onDuplicateTab: (id: string) => void;
  onRenameTab: (id: string, title: string) => void;
  onChooseEmoji: (id: string) => void;
  onCopyLink: (id: string) => void;
  onShowOutline: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveInto: (id: string, parentId: string | null) => void;
}

interface DocumentTabsSidebarProps extends DocumentTabsApi {
  /** Returns to the outline view in the same sidebar slot. */
  onBack: () => void;
}

/**
 * The other half of Docs' "Document tabs" panel — `OutlineSidebar.tsx`
 * covers the live heading outline; this covers the tab tree itself, each
 * tab a genuinely independent chunk of document content (see
 * `documentTabs.ts` and `index.tsx`'s `tabs`/`activeTabId` state), not just
 * a strip of jump-markers into one document.
 */
export default function DocumentTabsSidebar({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onAddSubtab,
  onDeleteTab,
  onDuplicateTab,
  onRenameTab,
  onChooseEmoji,
  onCopyLink,
  onShowOutline,
  onMoveUp,
  onMoveDown,
  onMoveInto,
  onBack,
}: DocumentTabsSidebarProps) {
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const closeMenu = () => {
    setOpenMenuFor(null);
    setPlacement(null);
  };

  const openMenu = (id: string) => {
    const btn = buttonRefs.current[id];
    if (!btn) return;
    setPlacement(placePanel(btn.getBoundingClientRect(), 'below'));
    setOpenMenuFor(id);
  };

  useEffect(() => {
    if (!openMenuFor) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (rootRef.current?.contains(target)) return;
      if (target.closest('[role="menu"]')) return;
      closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuFor]);

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  const startRename = (tab: BookSection) => {
    setRenameDraft(tab.title);
    setRenamingId(tab.id);
  };

  const commitRename = () => {
    if (renamingId) onRenameTab(renamingId, renameDraft);
    setRenamingId(null);
  };

  const buildMoveIntoItems = (tab: BookSection): MenuItem[] => {
    const excluded = descendantIds(tabs, tab.id);
    const candidates = buildTabTree(tabs.filter((t) => !excluded.has(t.id)));
    const items: MenuItem[] = [];
    const walk = (nodes: TabNode[], depth: number) => {
      for (const node of nodes) {
        items.push({
          id: `into-${node.id}`,
          label: `${'  '.repeat(depth)}${node.emoji ? `${node.emoji} ` : ''}${node.title}`,
          onSelect: () => onMoveInto(tab.id, node.id),
        });
        walk(node.children, depth + 1);
      }
    };
    walk(candidates, 0);
    if (items.length === 0) items.push({ id: 'into-none', label: 'No other tabs', disabled: true, onSelect: () => {} });
    items.push(separator(), { id: 'into-top', label: 'Top level', disabled: tab.parentId === null, onSelect: () => onMoveInto(tab.id, null) });
    return items;
  };

  const buildMenuItems = (tab: BookSection): MenuItem[] => {
    const siblings = tabs.filter((t) => t.parentId === tab.parentId).sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((s) => s.id === tab.id);
    return [
      { id: 'add-subtab', label: 'Add subtab', icon: Plus, onSelect: () => onAddSubtab(tab.id) },
      { id: 'delete', label: 'Delete', icon: Trash2, danger: true, disabled: tabs.length <= 1, onSelect: () => onDeleteTab(tab.id) },
      { id: 'duplicate', label: 'Duplicate', icon: Copy, onSelect: () => onDuplicateTab(tab.id) },
      { id: 'rename', label: 'Rename', icon: Pencil, onSelect: () => startRename(tab) },
      { id: 'choose-emoji', label: 'Choose emoji', icon: SmilePlus, onSelect: () => onChooseEmoji(tab.id) },
      separator(),
      { id: 'copy-link', label: 'Copy link', icon: Link2, onSelect: () => onCopyLink(tab.id) },
      { id: 'show-outline', label: 'Show outline', icon: PanelLeft, onSelect: () => onShowOutline(tab.id) },
      separator(),
      { id: 'move-up', label: 'Move up', icon: ArrowUp, disabled: index <= 0, onSelect: () => onMoveUp(tab.id) },
      { id: 'move-down', label: 'Move down', icon: ArrowDown, disabled: index === -1 || index >= siblings.length - 1, onSelect: () => onMoveDown(tab.id) },
      { kind: 'submenu', id: 'move-into', label: 'Move into', icon: Indent, items: buildMoveIntoItems(tab) },
    ];
  };

  const renderRow = (node: TabNode, depth: number): React.ReactNode => (
    <li key={node.id}>
      <div
        className={`group flex items-center gap-1 pr-1 ${node.id === activeTabId ? 'bg-blue-50' : 'hover:bg-zinc-100'}`}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {renamingId === node.id ? (
          <input
            ref={renameInputRef}
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              else if (e.key === 'Escape') setRenamingId(null);
            }}
            className="flex-1 min-w-0 my-1 text-xs bg-white border border-purple-400 rounded px-1 py-0.5 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab(node.id)}
            title={node.title}
            className={`flex-1 min-w-0 flex items-center gap-1.5 py-1.5 text-left text-xs truncate cursor-pointer ${
              node.id === activeTabId ? 'text-blue-700 font-medium' : 'text-zinc-700'
            }`}
          >
            {node.emoji ? <span className="shrink-0 text-sm leading-none">{node.emoji}</span> : <FileText className="w-3.5 h-3.5 shrink-0 text-zinc-400" />}
            <span className="truncate">{node.title}</span>
          </button>
        )}
        <button
          ref={(el) => {
            buttonRefs.current[node.id] = el;
          }}
          type="button"
          title="Tab options"
          onClick={() => (openMenuFor === node.id ? closeMenu() : openMenu(node.id))}
          className={`shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 cursor-pointer text-zinc-500 ${
            openMenuFor === node.id ? 'opacity-100 bg-zinc-200' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
      {openMenuFor === node.id && placement && (
        <MenuPanel items={buildMenuItems(node)} theme={LIGHT_THEME_ID} onClose={closeMenu} placement={placement} />
      )}
      {node.children.length > 0 && <ul>{node.children.map((child) => renderRow(child, depth + 1))}</ul>}
    </li>
  );

  const tree = buildTabTree(tabs);

  return (
    <div ref={rootRef} className="w-60 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
      <div className="h-10 px-2 flex items-center gap-1.5 border-b border-zinc-200 shrink-0">
        <button
          type="button"
          title="Back to outline"
          onClick={onBack}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 cursor-pointer text-zinc-600"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="flex-1 text-xs font-medium text-zinc-700">Document tabs</span>
        <button
          type="button"
          title="Add tab"
          onClick={onAddTab}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 cursor-pointer text-zinc-600"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        <ul>{tree.map((node) => renderRow(node, 0))}</ul>
      </div>
    </div>
  );
}

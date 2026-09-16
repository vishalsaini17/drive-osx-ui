import React from 'react';
import { Editor } from '@tiptap/react';
import AppShell from '../../../design-system/components/AppShell';
import TitleBar from './TitleBar';
import RibbonToolbar from './ribbon/RibbonToolbar';
import TableContextToolbar from './ribbon/TableContextToolbar';
import ImageContextToolbar from './ribbon/ImageContextToolbar';
import PageCanvas from './PageCanvas';
import OutlineSidebar from './OutlineSidebar';
import { PageBreakPlan } from '../../../platform/documents/pagination/types';
import { PageSetup } from '../../../platform/documents/book/pageSetup';

interface WordBookShellProps {
  windowId: string;
  editor: Editor | null;
  docTitle: string;
  isDirty: boolean;
  plan: PageBreakPlan;
  pageSetup: PageSetup;
  onSave: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentFolderId: string | null;
  resolveDefaultFolderId: (name: string) => string | null;
  isStarred: boolean;
  onRenameTitle: (newTitle: string) => void;
  onToggleStar: () => void;
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
  spellcheckOn: boolean;
  onToggleSpellcheck: () => void;
  showLineNumbers: boolean;
  isViewOnly: boolean;
  onSetViewOnly: (viewOnly: boolean) => void;
  canShare: boolean;
  onShare: () => void;
  onShareToChat: () => void;
}

export default function WordBookShell({
  windowId,
  editor,
  docTitle,
  isDirty,
  plan,
  pageSetup,
  onSave,
  zoom,
  onZoomChange,
  currentFolderId,
  resolveDefaultFolderId,
  isStarred,
  onRenameTitle,
  onToggleStar,
  isOutlineOpen,
  onToggleOutline,
  spellcheckOn,
  onToggleSpellcheck,
  showLineNumbers,
  isViewOnly,
  onSetViewOnly,
  canShare,
  onShare,
  onShareToChat,
}: WordBookShellProps) {
  return (
    <AppShell className="bg-[#d8d9de] text-zinc-900">
      <TitleBar
        windowId={windowId}
        docTitle={docTitle}
        isDirty={isDirty}
        pageCount={plan.pages.length}
        isStarred={isStarred}
        onSave={onSave}
        onRename={onRenameTitle}
        onToggleStar={onToggleStar}
        isViewOnly={isViewOnly}
        onSetViewOnly={onSetViewOnly}
        canShare={canShare}
        onShare={onShare}
        onShareToChat={onShareToChat}
      />
      {/* Viewing hides the whole editing ribbon rather than just disabling
          it — a row of buttons that visibly do nothing when clicked is a
          worse signal of "read-only" than the row simply not being there. */}
      {!isViewOnly && (
        <RibbonToolbar
          editor={editor}
          zoom={zoom}
          onZoomChange={onZoomChange}
          currentFolderId={currentFolderId}
          resolveDefaultFolderId={resolveDefaultFolderId}
          isOutlineOpen={isOutlineOpen}
          onToggleOutline={onToggleOutline}
          spellcheckOn={spellcheckOn}
          onToggleSpellcheck={onToggleSpellcheck}
        />
      )}
      {isViewOnly && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[11px] text-amber-800 flex items-center gap-1.5">
          <span>Viewing — this document is read-only.</span>
          <button type="button" onClick={() => onSetViewOnly(false)} className="underline hover:no-underline cursor-pointer font-medium">
            Switch to Editing
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 flex">
        {isOutlineOpen && editor && <OutlineSidebar editor={editor} onClose={onToggleOutline} />}
        <PageCanvas editor={editor} plan={plan} pageSetup={pageSetup} zoom={zoom} showLineNumbers={showLineNumbers} />
      </div>
      {!isViewOnly && editor && <TableContextToolbar editor={editor} />}
      {!isViewOnly && editor && (
        <ImageContextToolbar editor={editor} currentFolderId={currentFolderId} resolveDefaultFolderId={resolveDefaultFolderId} />
      )}
    </AppShell>
  );
}

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
      />
      <RibbonToolbar
        editor={editor}
        zoom={zoom}
        onZoomChange={onZoomChange}
        currentFolderId={currentFolderId}
        resolveDefaultFolderId={resolveDefaultFolderId}
        isOutlineOpen={isOutlineOpen}
        onToggleOutline={onToggleOutline}
      />
      <div className="flex-1 min-h-0 flex">
        {isOutlineOpen && editor && <OutlineSidebar editor={editor} onClose={onToggleOutline} />}
        <PageCanvas editor={editor} plan={plan} pageSetup={pageSetup} zoom={zoom} />
      </div>
      {editor && <TableContextToolbar editor={editor} />}
      {editor && (
        <ImageContextToolbar editor={editor} currentFolderId={currentFolderId} resolveDefaultFolderId={resolveDefaultFolderId} />
      )}
    </AppShell>
  );
}

import React from 'react';
import { Editor } from '@tiptap/react';
import AppShell from '../../../design-system/components/AppShell';
import ToolbarStub from './ToolbarStub';
import RibbonToolbar from './ribbon/RibbonToolbar';
import TableContextToolbar from './ribbon/TableContextToolbar';
import ImageContextToolbar from './ribbon/ImageContextToolbar';
import PageCanvas from './PageCanvas';
import { PageBreakPlan } from '../../../platform/documents/pagination/types';
import { PageSetup } from '../../../platform/documents/book/pageSetup';

interface WordBookShellProps {
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
}

export default function WordBookShell({
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
}: WordBookShellProps) {
  return (
    <AppShell className="bg-[#d8d9de] text-zinc-900">
      <ToolbarStub docTitle={docTitle} isDirty={isDirty} pageCount={plan.pages.length} onSave={onSave} />
      <RibbonToolbar
        editor={editor}
        zoom={zoom}
        onZoomChange={onZoomChange}
        currentFolderId={currentFolderId}
        resolveDefaultFolderId={resolveDefaultFolderId}
      />
      <PageCanvas editor={editor} plan={plan} pageSetup={pageSetup} zoom={zoom} />
      {editor && <TableContextToolbar editor={editor} />}
      {editor && (
        <ImageContextToolbar editor={editor} currentFolderId={currentFolderId} resolveDefaultFolderId={resolveDefaultFolderId} />
      )}
    </AppShell>
  );
}

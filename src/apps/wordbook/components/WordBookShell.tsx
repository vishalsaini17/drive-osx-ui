import React from 'react';
import { Editor } from '@tiptap/react';
import AppShell from '../../../design-system/components/AppShell';
import TitleBar from './TitleBar';
import RibbonToolbar from './ribbon/RibbonToolbar';
import TableContextToolbar from './ribbon/TableContextToolbar';
import ImageContextToolbar from './ribbon/ImageContextToolbar';
import PageCanvas from './PageCanvas';
import OutlineSidebar from './OutlineSidebar';
import DocumentTabsSidebar, { DocumentTabsApi } from './DocumentTabsSidebar';
import EquationToolbar from './EquationToolbar';
import { PageBreakPlan } from '../../../platform/documents/pagination/types';
import { PageSetup } from '../../../platform/documents/book/pageSetup';

export type SidebarPanel = 'none' | 'outline' | 'tabs';

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
  sidebarPanel: SidebarPanel;
  onSetSidebarPanel: (panel: SidebarPanel) => void;
  tabsApi: DocumentTabsApi;
  spellcheckOn: boolean;
  onToggleSpellcheck: () => void;
  showLineNumbers: boolean;
  isViewOnly: boolean;
  onSetViewOnly: (viewOnly: boolean) => void;
  canShare: boolean;
  onShare: () => void;
  onShareToChat: () => void;
  onOpenLinkModal: () => void;
  showRuler: boolean;
  printLayoutOn: boolean;
  showEquationToolbar: boolean;
  showNonPrintingChars: boolean;
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
  sidebarPanel,
  onSetSidebarPanel,
  tabsApi,
  spellcheckOn,
  onToggleSpellcheck,
  showLineNumbers,
  isViewOnly,
  onSetViewOnly,
  canShare,
  onShare,
  onShareToChat,
  onOpenLinkModal,
  showRuler,
  printLayoutOn,
  showEquationToolbar,
  showNonPrintingChars,
}: WordBookShellProps) {
  const isOutlineOpen = sidebarPanel === 'outline';
  const toggleOutline = () => onSetSidebarPanel(isOutlineOpen ? 'none' : 'outline');

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
          windowId={windowId}
          editor={editor}
          zoom={zoom}
          onZoomChange={onZoomChange}
          currentFolderId={currentFolderId}
          resolveDefaultFolderId={resolveDefaultFolderId}
          isOutlineOpen={isOutlineOpen}
          onToggleOutline={toggleOutline}
          spellcheckOn={spellcheckOn}
          onToggleSpellcheck={onToggleSpellcheck}
          onOpenLinkModal={onOpenLinkModal}
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
      {!isViewOnly && showEquationToolbar && <EquationToolbar editor={editor} />}
      <div className="flex-1 min-h-0 flex">
        {sidebarPanel === 'outline' && editor && (
          <OutlineSidebar editor={editor} onClose={toggleOutline} onShowTabs={() => onSetSidebarPanel('tabs')} tabCount={tabsApi.tabs.length} />
        )}
        {sidebarPanel === 'tabs' && <DocumentTabsSidebar {...tabsApi} onBack={() => onSetSidebarPanel('outline')} />}
        <PageCanvas
          editor={editor}
          plan={plan}
          pageSetup={pageSetup}
          zoom={zoom}
          showLineNumbers={showLineNumbers}
          showRuler={showRuler}
          printLayoutOn={printLayoutOn}
          showNonPrintingChars={showNonPrintingChars}
        />
      </div>
      {!isViewOnly && editor && <TableContextToolbar editor={editor} />}
      {!isViewOnly && editor && (
        <ImageContextToolbar editor={editor} currentFolderId={currentFolderId} resolveDefaultFolderId={resolveDefaultFolderId} />
      )}
    </AppShell>
  );
}

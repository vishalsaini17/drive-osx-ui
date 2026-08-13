import React, { useState, useEffect, useRef } from 'react';
import { Save, Download, Trash, Type, ZoomIn, ZoomOut, FileText, Check } from 'lucide-react';
import { useSystemStore } from '../../shell/state/systemStore';
import { useContextMenuStore, ContextMenuItem } from '../../shell/context-menu/contextMenuStore';
import { FileService } from '../../platform/files/FileService';
import { StorageService } from '../../platform/storage/StorageService';
import WindowStatusBar from '../../shell/window-manager/WindowStatusBar';

import Toolbar from './components/Toolbar';
import RichEditor from './components/RichEditor';
import PlainEditor from './components/PlainEditor';
import FindReplaceBar from './components/FindReplaceBar';
import OpenDocModal from './components/OpenDocModal';
import VersionHistoryModal from './components/VersionHistoryModal';
import ShareModal from './components/ShareModal';
import CommentsDrawer from './components/CommentsDrawer';

import { DocumentVersion, DocumentComment, EditorMode } from './types';

export default function TextEditor() {
  const activeFileId = useSystemStore((state) => state.editorFileId);
  const activeFileName = useSystemStore((state) => state.editorFileName);
  const activeFileContent = useSystemStore((state) => state.editorFileContent);
  const saveTextFile = useSystemStore((state) => state.handleSaveTextFile);
  const setFiles = useSystemStore((state) => state.setFiles);
  const allFiles = useSystemStore((state) => state.files);
  const editorCurrentFolderId = useSystemStore((state) => state.editorCurrentFolderId);
  const setEditorCurrentFolderId = useSystemStore((state) => state.setEditorCurrentFolderId);
  const resolveDefaultFolderId = useSystemStore((state) => state.resolveDefaultFolderId);
  const settings = useSystemStore((state) => state.settings);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu);

  // Editor Core State
  const [docContent, setDocContent] = useState<string>('');
  const [docName, setDocName] = useState<string>('untitled.txt');
  const [currentLinkedId, setCurrentLinkedId] = useState<string | null>(null);

  // Formatting & Mode Settings
  const [editorMode, setEditorMode] = useState<EditorMode>('rich');
  const [fontFamily, setFontFamily] = useState<string>('Inter, sans-serif');
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [spellCheck, setSpellCheck] = useState<boolean>(true);
  const [readOnly, setReadOnly] = useState<boolean>(false);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('All changes saved');

  // History Stack (Undo/Redo)
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Version Snapshots History
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  // Comments
  const [comments, setComments] = useState<DocumentComment[]>([
    {
      id: 'c-1',
      author: 'Sarah Chen',
      text: 'Great structure! Make sure to verify line wrapping and export settings.',
      timestamp: '10 mins ago',
      resolved: false,
    },
  ]);

  // Modals & Panels State
  const [isOpenDocModalOpen, setIsOpenDocModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);

  // Find & Replace State
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Recent Doc IDs
  const [recentDocIds, setRecentDocIds] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Synchronize on external file open
  useEffect(() => {
    if (activeFileId) {
      setCurrentLinkedId(activeFileId);
      setDocName(activeFileName || 'untitled.txt');
      setDocContent(activeFileContent || '');
      setRecentDocIds((prev) => Array.from(new Set([activeFileId, ...prev])));

      // Initial version snapshot
      const wordCount = (activeFileContent || '').trim() === '' ? 0 : (activeFileContent || '').trim().split(/\s+/).length;
      setVersions([
        {
          id: `ver-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          content: activeFileContent || '',
          wordCount,
          charCount: (activeFileContent || '').length,
          label: 'Initial File State',
        },
      ]);
    }
  }, [activeFileId, activeFileName, activeFileContent]);

  // Document modification tracker for Undo stack
  const updateContentWithHistory = (newContent: string) => {
    if (newContent === docContent) return;
    setUndoStack((prev) => [...prev.slice(-30), docContent]);
    setRedoStack([]);
    setDocContent(newContent);
    setAutoSaveStatus('Unsaved changes');
  };

  // Auto Save Effect
  useEffect(() => {
    if (!autoSave) return;
    const timer = setTimeout(() => {
      if (autoSaveStatus === 'Unsaved changes') {
        handleSave(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [docContent, autoSave, autoSaveStatus]);

  // Save Document
  const handleSave = async (isAutoSave = false) => {
    if (currentLinkedId) {
      await saveTextFile(currentLinkedId, docContent);
      if (!isAutoSave) {
        alert(`💾 Document "${docName}" saved successfully!`);
      }
    } else {
      try {
        const parentId = editorCurrentFolderId || resolveDefaultFolderId('Documents') || null;
        const created = await FileService.createFile({
          name: docName,
          type: 'file',
          parentId,
          content: docContent,
          mimeType: 'text/plain',
        });

        setCurrentLinkedId(created._id);
      setFiles((prev) => {
        const next = [
          ...prev,
          {
            id: created._id,
            name: created.name,
            type: 'file' as const,
            content: docContent,
            parentId: created.parentId,
            createdAt: created.createdAt,
          },
        ];
        StorageService.set('webos-files', JSON.stringify(next));
        return next;
      });

        if (!isAutoSave) {
          alert(`💾 Document "${docName}" saved successfully!`);
        }
      } catch (error) {
        console.error('Failed to save file:', error);
        alert('Failed to save file. Please try again.');
      }
    }

    const words = docContent.trim() === '' ? 0 : docContent.trim().split(/\s+/).length;
    setVersions((prev) => [
      {
        id: `ver-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        content: docContent,
        wordCount: words,
        charCount: docContent.length,
        label: isAutoSave ? 'Auto-saved Snapshot' : 'Manual Save Snapshot',
      },
      ...prev,
    ]);

    setAutoSaveStatus('All changes saved');
  };

  // Save As
  const handleSaveAs = async () => {
    const newName = prompt('Enter new document name:', docName);
    if (!newName) return;
    setDocName(newName);
    try {
      const parentId = editorCurrentFolderId || resolveDefaultFolderId('Documents') || null;
      const created = await FileService.createFile({
        name: newName,
        type: 'file',
        parentId,
        content: docContent,
        mimeType: 'text/plain',
      });

      setCurrentLinkedId(created._id);
      setFiles((prev) => {
        const next = [
          ...prev,
          {
            id: created._id,
            name: created.name,
            type: 'file' as const,
            content: docContent,
            parentId: created.parentId,
            createdAt: created.createdAt,
          },
        ];
        StorageService.set('webos-files', JSON.stringify(next));
        return next;
      });

      setAutoSaveStatus('All changes saved');
      alert(`📄 Document saved as "${newName}"`);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file. Please try again.');
    }
  };

  // New Document
  const handleNew = () => {
    setDocName('untitled.txt');
    setDocContent('');
    setCurrentLinkedId(null);
    setUndoStack([]);
    setRedoStack([]);
    setAutoSaveStatus('All changes saved');
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, docContent]);
    setUndoStack((prev) => prev.slice(0, -1));
    setDocContent(last);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, docContent]);
    setRedoStack((prev) => prev.slice(0, -1));
    setDocContent(next);
  };

  // Formatting commands for Rich Mode
  const handleFormatCommand = (command: string, value?: string) => {
    if (readOnly) return;
    if (editorMode === 'rich') {
      document.execCommand(command, false, value);
    } else {
      // In Plain Text mode, wrap selection or insert markdown formatting
      if (command === 'bold') updateContentWithHistory(`**${docContent}**`);
      if (command === 'italic') updateContentWithHistory(`*${docContent}*`);
    }
  };

  // Insert Operations
  const handleInsertImage = () => {
    const url = prompt('Enter Image URL or base64:', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600');
    if (!url) return;
    if (editorMode === 'rich') {
      document.execCommand('insertImage', false, url);
    } else {
      updateContentWithHistory(`${docContent}\n![Image](${url})\n`);
    }
  };

  const handleInsertTable = () => {
    const tableHtml = `<table border="1" style="width:100%; border-collapse:collapse; margin:10px 0;"><thead><tr style="background:#f3f4f6;"><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr></thead><tbody><tr><td>Cell 1</td><td>Cell 2</td><td>Cell 3</td></tr><tr><td>Cell 4</td><td>Cell 5</td><td>Cell 6</td></tr></tbody></table>`;
    if (editorMode === 'rich') {
      document.execCommand('insertHTML', false, tableHtml);
    } else {
      const tableMd = `\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n`;
      updateContentWithHistory(docContent + tableMd);
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter Hyperlink URL:', 'https://example.com');
    if (!url) return;
    if (editorMode === 'rich') {
      document.execCommand('createLink', false, url);
    } else {
      updateContentWithHistory(`${docContent} [Link](${url})`);
    }
  };

  const handleInsertDateTime = () => {
    const nowStr = new Date().toLocaleString();
    if (editorMode === 'rich') {
      document.execCommand('insertHTML', false, `<span>${nowStr}</span>`);
    } else {
      updateContentWithHistory(`${docContent} ${nowStr}`);
    }
  };

  // Export File
  const handleExport = (format: 'txt' | 'docx' | 'pdf' | 'html') => {
    if (format === 'pdf') {
      window.print();
      return;
    }

    let mimeType = 'text/plain';
    let fileExtension = '.txt';
    let exportData = docContent;

    if (format === 'html') {
      mimeType = 'text/html';
      fileExtension = '.html';
      exportData = `<!DOCTYPE html><html><head><title>${docName}</title><style>body{font-family:${fontFamily};padding:2rem;line-height:1.6;}</style></head><body>${docContent}</body></html>`;
    } else if (format === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileExtension = '.docx';
      exportData = docContent;
    }

    const blob = new Blob([exportData], { type: `${mimeType};charset=utf-8` });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = docName.replace(/\.[^/.]+$/, '') + fileExtension;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Context Menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      { id: 'save', label: 'Save Document', icon: <Save size={15} className="text-purple-400" />, shortcut: 'Ctrl+S', onClick: () => handleSave() },
      { id: 'undo', label: 'Undo', onClick: handleUndo },
      { id: 'redo', label: 'Redo', onClick: handleRedo },
      { divider: true },
      { id: 'find', label: 'Find & Replace', icon: <FileText size={15} className="text-blue-400" />, shortcut: 'Ctrl+F', onClick: () => setIsFindReplaceOpen(true) },
      { id: 'export', label: 'Export File', icon: <Download size={15} className="text-emerald-400" />, onClick: () => handleExport('txt') },
      { divider: true },
      { id: 'clear', label: 'Clear Document', icon: <Trash size={15} className="text-rose-400" />, danger: true, onClick: () => updateContentWithHistory('') },
    ];

    openContextMenu(e, items, 'Text Editor');
  };

  // Word & Character count calculations
  const textOnly = docContent.replace(/<[^>]*>/g, '');
  const charCount = textOnly.length;
  const wordCount = textOnly.trim() === '' ? 0 : textOnly.trim().split(/\s+/).length;

  // Find matches count calculation
  const getMatchesCount = () => {
    if (!findText) return 0;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const matches = textOnly.match(regex);
    return matches ? matches.length : 0;
  };

  const matchCount = getMatchesCount();

  const handleReplace = () => {
    if (!findText) return;
    const flags = matchCase ? '' : 'i';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    updateContentWithHistory(docContent.replace(regex, replaceText));
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    updateContentWithHistory(docContent.replace(regex, replaceText));
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans text-sm overflow-hidden select-none">
      {/* 1. TOP TOOLBAR */}
      <Toolbar
        documentName={docName}
        isLinkedFile={!!currentLinkedId}
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        readOnly={readOnly}
        setReadOnly={setReadOnly}
        autoSave={autoSave}
        setAutoSave={setAutoSave}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        showLineNumbers={showLineNumbers}
        setShowLineNumbers={setShowLineNumbers}
        spellCheck={spellCheck}
        setSpellCheck={setSpellCheck}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onNew={handleNew}
        onOpen={() => setIsOpenDocModalOpen(true)}
        onSave={() => handleSave()}
        onSaveAs={handleSaveAs}
        onVersionHistory={() => setIsVersionModalOpen(true)}
        onShare={() => setIsShareModalOpen(true)}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCut={() => document.execCommand('cut')}
        onCopy={() => document.execCommand('copy')}
        onPaste={() => alert('Press Ctrl+V / Cmd+V to paste into editor.')}
        onFindReplace={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
        onFormatCommand={handleFormatCommand}
        onInsertImage={handleInsertImage}
        onInsertTable={handleInsertTable}
        onInsertLink={handleInsertLink}
        onInsertDateTime={handleInsertDateTime}
        onToggleComments={() => setIsCommentsDrawerOpen(!isCommentsDrawerOpen)}
        unreadCommentsCount={comments.filter((c) => !c.resolved).length}
        activeCollaboratorsCount={2}
      />

      {/* 2. FIND & REPLACE BAR */}
      <FindReplaceBar
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        findText={findText}
        setFindText={setFindText}
        replaceText={replaceText}
        setReplaceText={setReplaceText}
        matchCase={matchCase}
        setMatchCase={setMatchCase}
        matchCount={matchCount}
        currentMatchIndex={currentMatchIndex}
        onNextMatch={() => setCurrentMatchIndex((prev) => (prev + 1) % Math.max(matchCount, 1))}
        onPrevMatch={() => setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % Math.max(matchCount, 1))}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
      />

      {/* 3. MAIN EDITOR STAGE & COMMENTS SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {editorMode === 'rich' ? (
          <RichEditor
            contentHtml={docContent}
            onChangeHtml={updateContentWithHistory}
            fontFamily={fontFamily}
            fontSize={fontSize}
            readOnly={readOnly}
            spellCheck={spellCheck}
            wordWrap={wordWrap}
            onContextMenu={handleContextMenu}
          />
        ) : (
          <PlainEditor
            content={docContent}
            onChangeContent={updateContentWithHistory}
            fontFamily={fontFamily}
            fontSize={fontSize}
            readOnly={readOnly}
            spellCheck={spellCheck}
            wordWrap={wordWrap}
            showLineNumbers={showLineNumbers}
            onContextMenu={handleContextMenu}
            textareaRef={textareaRef}
          />
        )}

        {/* Slide-out Comments Drawer */}
        <CommentsDrawer
          isOpen={isCommentsDrawerOpen}
          onClose={() => setIsCommentsDrawerOpen(false)}
          comments={comments}
          onAddComment={(text) =>
            setComments((prev) => [
              ...prev,
              {
                id: `c-${Date.now()}`,
                author: 'You',
                text,
                timestamp: 'Just now',
                resolved: false,
              },
            ])
          }
          onToggleResolve={(id) =>
            setComments((prev) =>
              prev.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))
            )
          }
          onDeleteComment={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
        />
      </div>

      {/* 4. STATUS BAR FOOTER */}
      <WindowStatusBar
        id="text-editor-status-bar"
        appId="editor"
        leftInfo={
          <div className="flex items-center gap-3">
            <span>{autoSaveStatus}</span>
            {readOnly && (
              <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded text-[9px] font-bold">
                Read Only
              </span>
            )}
          </div>
        }
        rightInfo={
          <div className="flex items-center gap-3 font-mono">
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
            <span>{editorMode.toUpperCase()} Mode</span>
          </div>
        }
      />

      {/* MODALS */}
      <OpenDocModal
        isOpen={isOpenDocModalOpen}
        onClose={() => setIsOpenDocModalOpen(false)}
        allFiles={allFiles}
        recentDocIds={recentDocIds}
        onSelectFile={(file) => {
          setCurrentLinkedId(file.id);
          setDocName(file.name);
          setDocContent(file.content || '');
          setRecentDocIds((prev) => Array.from(new Set([file.id, ...prev])));
        }}
        onNewTemplate={(name, content) => {
          setDocName(`${name}.html`);
          setDocContent(content);
          setCurrentLinkedId(null);
        }}
        onUploadFile={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            setDocName(file.name);
            setDocContent(text);
            setCurrentLinkedId(null);
          };
          reader.readAsText(file);
        }}
      />

      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        versions={versions}
        onRestoreVersion={(version) => {
          updateContentWithHistory(version.content);
          alert(`Restored snapshot from ${version.timestamp}`);
        }}
        onCreateSnapshot={() => {
          const words = docContent.trim() === '' ? 0 : docContent.trim().split(/\s+/).length;
          setVersions((prev) => [
            {
              id: `ver-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              content: docContent,
              wordCount: words,
              charCount: docContent.length,
              label: 'User Snapshot',
            },
            ...prev,
          ]);
        }}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentName={docName}
        onSendViaMail={() => openAppWindow('mail')}
      />
    </div>
  );
}

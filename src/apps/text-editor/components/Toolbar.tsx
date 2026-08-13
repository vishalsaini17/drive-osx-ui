import React, { useState } from 'react';
import {
  FileText,
  Save,
  Download,
  FolderOpen,
  Plus,
  Clock,
  Share2,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  Search,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Palette,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Image as ImageIcon,
  Table as TableIcon,
  Link as LinkIcon,
  Calendar,
  MessageSquare,
  Eye,
  Lock,
  Sparkles,
  ChevronDown,
  Layers,
  Code,
  Check,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
import { EditorMode } from '../types';

interface ToolbarProps {
  documentName: string;
  isLinkedFile: boolean;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  readOnly: boolean;
  setReadOnly: (val: boolean) => void;
  autoSave: boolean;
  setAutoSave: (val: boolean) => void;
  wordWrap: boolean;
  setWordWrap: (val: boolean) => void;
  showLineNumbers: boolean;
  setShowLineNumbers: (val: boolean) => void;
  spellCheck: boolean;
  setSpellCheck: (val: boolean) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  // Execution Handlers
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onVersionHistory: () => void;
  onShare: () => void;
  onExport: (format: 'txt' | 'docx' | 'pdf' | 'html') => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onFindReplace: () => void;
  onFormatCommand: (command: string, value?: string) => void;
  onInsertImage: () => void;
  onInsertTable: () => void;
  onInsertLink: () => void;
  onInsertDateTime: () => void;
  onToggleComments: () => void;
  unreadCommentsCount: number;
  activeCollaboratorsCount: number;
}

export default function Toolbar({
  documentName,
  isLinkedFile,
  editorMode,
  setEditorMode,
  readOnly,
  setReadOnly,
  autoSave,
  setAutoSave,
  wordWrap,
  setWordWrap,
  showLineNumbers,
  setShowLineNumbers,
  spellCheck,
  setSpellCheck,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onVersionHistory,
  onShare,
  onExport,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onFindReplace,
  onFormatCommand,
  onInsertImage,
  onInsertTable,
  onInsertLink,
  onInsertDateTime,
  onToggleComments,
  unreadCommentsCount,
  activeCollaboratorsCount,
}: ToolbarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const fontOptions = [
    { label: 'Sans-Serif (Inter)', value: 'Inter, sans-serif' },
    { label: 'Serif (Playfair)', value: "'Playfair Display', Georgia, serif" },
    { label: 'Monospace (Code)', value: "'Fira Code', monospace" },
    { label: 'Cursive (Handwriting)', value: "'Caveat', cursive" },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
  ];

  const fontSizeOptions = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

  return (
    <div className="flex flex-col bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 select-none shrink-0 shadow-xs">
      {/* 1. TOP MENU BAR */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 text-xs gap-2 flex-wrap">
        {/* Left Title & Menu Items */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              📝 {documentName}
            </span>
            {isLinkedFile ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                Linked File
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full">
                Draft
              </span>
            )}
          </div>

          {/* Menus Row */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium relative">
            {/* File Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-[13000] p-1 flex flex-col gap-0.5">
                  <button
                    onClick={() => { onNew(); setActiveMenu(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> New Document</span>
                  </button>
                  <button
                    onClick={() => { onOpen(); setActiveMenu(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5" /> Open...</span>
                  </button>
                  <button
                    onClick={() => { onSave(); setActiveMenu(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><Save className="w-3.5 h-3.5" /> Save</span>
                    <span className="text-[10px] text-zinc-400">Ctrl+S</span>
                  </button>
                  <button
                    onClick={() => { onSaveAs(); setActiveMenu(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Save As...</span>
                  </button>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <button
                    onClick={() => setAutoSave(!autoSave)}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"
                  >
                    <span>Auto Save</span>
                    {autoSave && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                  <button
                    onClick={() => { onVersionHistory(); setActiveMenu(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-500" /> Version History</span>
                  </button>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <div className="px-3 py-1 text-[10px] text-zinc-400 uppercase font-bold">Export Format</div>
                  <button onClick={() => { onExport('txt'); setActiveMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-purple-500/10 rounded cursor-pointer">Export TXT</button>
                  <button onClick={() => { onExport('docx'); setActiveMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-purple-500/10 rounded cursor-pointer">Export DOCX</button>
                  <button onClick={() => { onExport('pdf'); setActiveMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-purple-500/10 rounded cursor-pointer">Export PDF</button>
                  <button onClick={() => { onExport('html'); setActiveMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-purple-500/10 rounded cursor-pointer">Export HTML</button>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Edit
              </button>
              {activeMenu === 'edit' && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-[13000] p-1 flex flex-col gap-0.5">
                  <button onClick={() => { onUndo(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"><span>Undo</span><span className="text-[10px] text-zinc-400">Ctrl+Z</span></button>
                  <button onClick={() => { onRedo(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"><span>Redo</span><span className="text-[10px] text-zinc-400">Ctrl+Y</span></button>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <button onClick={() => { onCut(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 cursor-pointer">Cut</button>
                  <button onClick={() => { onCopy(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 cursor-pointer">Copy</button>
                  <button onClick={() => { onPaste(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 cursor-pointer">Paste</button>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <button onClick={() => { onFindReplace(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"><span>Find & Replace</span><span className="text-[10px] text-zinc-400">Ctrl+F</span></button>
                </div>
              )}
            </div>

            {/* View & Settings Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
                className="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                View
              </button>
              {activeMenu === 'view' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-[13000] p-1 flex flex-col gap-0.5">
                  <button onClick={() => setWordWrap(!wordWrap)} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"><span>Word Wrap</span>{wordWrap && <Check className="w-3.5 h-3.5 text-purple-500" />}</button>
                  <button onClick={() => setShowLineNumbers(!showLineNumbers)} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"><span>Line Numbers</span>{showLineNumbers && <Check className="w-3.5 h-3.5 text-purple-500" />}</button>
                  <button onClick={() => setSpellCheck(!spellCheck)} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"><span>Spell Check</span>{spellCheck && <Check className="w-3.5 h-3.5 text-purple-500" />}</button>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <button onClick={() => setReadOnly(!readOnly)} className="w-full text-left px-3 py-1.5 rounded hover:bg-purple-500/10 flex items-center justify-between cursor-pointer"><span>Read-Only Mode</span>{readOnly && <Check className="w-3.5 h-3.5 text-amber-500" />}</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Status Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-300 dark:border-zinc-700">
            <button
              onClick={() => setEditorMode('rich')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                editorMode === 'rich' ? 'bg-purple-600 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Rich
            </button>
            <button
              onClick={() => setEditorMode('plain')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                editorMode === 'plain' ? 'bg-purple-600 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Plain / Code
            </button>
          </div>

          {/* Comments drawer trigger */}
          <button
            onClick={onToggleComments}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 relative cursor-pointer"
            title="Comments & Feedback"
          >
            <MessageSquare className="w-4 h-4 text-purple-500" />
            {unreadCommentsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                {unreadCommentsCount}
              </span>
            )}
          </button>

          {/* Share */}
          <button
            onClick={onShare}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* 2. ACTION RIBBON TOOLBAR ROW */}
      <div className="p-1.5 px-3 flex flex-wrap items-center gap-2 text-xs overflow-x-auto bg-zinc-50 dark:bg-zinc-950/60">
        {/* Font Family Dropdown */}
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer max-w-[140px]"
        >
          {fontOptions.map((f, i) => (
            <option key={i} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font Size Dropdown */}
        <select
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer w-16"
        >
          {fontSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>

        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

        {/* Format Action Buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onFormatCommand('bold')}
            disabled={readOnly}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onFormatCommand('italic')}
            disabled={readOnly}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onFormatCommand('underline')}
            disabled={readOnly}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onFormatCommand('strikeThrough')}
            disabled={readOnly}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

        {/* Text Colors */}
        <div className="flex items-center gap-1">
          <input
            type="color"
            onChange={(e) => onFormatCommand('foreColor', e.target.value)}
            disabled={readOnly}
            className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
            title="Text Color"
          />
          <button
            onClick={() => onFormatCommand('hiliteColor', '#fef08a')}
            disabled={readOnly}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer text-amber-500"
            title="Highlight Yellow"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => onFormatCommand('justifyLeft')} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => onFormatCommand('justifyCenter')} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
          <button onClick={() => onFormatCommand('justifyRight')} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => onFormatCommand('justifyFull')} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Justify"><AlignJustify className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

        {/* Lists & Indents */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => onFormatCommand('insertUnorderedList')} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Bullet List"><List className="w-3.5 h-3.5" /></button>
          <button onClick={() => onFormatCommand('insertOrderedList')} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></button>
          <button onClick={() => onFormatCommand('indent')} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Increase Indent"><Indent className="w-3.5 h-3.5" /></button>
          <button onClick={() => onFormatCommand('outdent')} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Decrease Indent"><Outdent className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

        {/* Insert Options */}
        <div className="flex items-center gap-1">
          <button onClick={onInsertImage} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer text-sky-500" title="Insert Image"><ImageIcon className="w-3.5 h-3.5" /></button>
          <button onClick={onInsertTable} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer text-emerald-500" title="Insert Table"><TableIcon className="w-3.5 h-3.5" /></button>
          <button onClick={onInsertLink} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer text-purple-500" title="Insert Link"><LinkIcon className="w-3.5 h-3.5" /></button>
          <button onClick={onInsertDateTime} disabled={readOnly} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer text-amber-500" title="Insert Date & Time"><Calendar className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

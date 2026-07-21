import React, { useState, useEffect } from 'react';
import { Save, Download, Trash, Type } from 'lucide-react';
import { useSystemStore } from '../../systemStore';

export default function TextEditor() {
  // Central store state slice
  const activeFileId = useSystemStore((state) => state.editorFileId);
  const activeFileName = useSystemStore((state) => state.editorFileName);
  const activeFileContent = useSystemStore((state) => state.editorFileContent);
  const saveTextFile = useSystemStore((state) => state.handleSaveTextFile);
  const settings = useSystemStore((state) => state.settings);

  const activeTheme = settings.theme || 'classic-light';

  const [docContent, setDocContent] = useState('');
  const [docName, setDocName] = useState('untitled.txt');
  const [fontSize, setFontSize] = useState<number>(13); // pixels

  // Synchronize buffer on active file selection shifts
  useEffect(() => {
    setDocContent(activeFileContent || '');
    setDocName(activeFileName || 'untitled.txt');
  }, [activeFileId, activeFileName, activeFileContent]);

  // Handle local save back into OS file system
  const handleSave = () => {
    if (activeFileId) {
      saveTextFile(activeFileId, docContent);
      alert(`💾 Document "${docName}" saved successfully back into your virtual filesystem!`);
    } else {
      alert('💡 To save this draft, create/open a text file inside "File Manager" to load it here for editing.');
    }
  };

  // Download draft file directly to physical host machine
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = docName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Word & Character count calculations
  const charCount = docContent.length;
  const wordCount = docContent.trim() === '' ? 0 : docContent.trim().split(/\s+/).length;

  const themeStyles = {
    'classic-light': {
      toolbar: 'h-12 bg-white/40 border-b border-[#211625]/10 px-4 flex items-center justify-between select-none shrink-0 text-[#211625]',
      main: 'flex-1 p-4 bg-white/30 flex flex-col text-[#211625]',
      textarea: 'flex-1 w-full h-full bg-transparent text-[#211625] border-none outline-none focus:ring-0 resize-none placeholder-[#211625]/30 leading-relaxed overflow-auto',
      footer: 'h-8 bg-white/40 border-t border-[#211625]/10 px-4 flex items-center justify-between text-[10px] text-[#211625]/60 select-none shrink-0 font-sans',
      textPrimary: 'text-[#211625]',
      accentText: 'text-purple-600',
    },
    'modern-dark': {
      toolbar: 'h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between select-none shrink-0 text-white',
      main: 'flex-1 p-4 bg-zinc-950 flex flex-col text-white',
      textarea: 'flex-1 w-full h-full bg-transparent text-zinc-100 border-none outline-none focus:ring-0 resize-none placeholder-zinc-700 leading-relaxed overflow-auto',
      footer: 'h-8 bg-zinc-900 border-t border-zinc-800 px-4 flex items-center justify-between text-[10px] text-zinc-500 select-none font-mono shrink-0',
      textPrimary: 'text-white',
      accentText: 'text-pink-400',
    },
    'retro-terminal': {
      toolbar: 'h-12 bg-black border-b border-green-500/25 px-4 flex items-center justify-between select-none shrink-0 text-[#22c55e] font-mono',
      main: 'flex-1 p-4 bg-black flex flex-col text-[#22c55e]',
      textarea: 'flex-1 w-full h-full bg-transparent text-[#22c55e] border-none outline-none focus:ring-0 resize-none placeholder-green-500/30 leading-relaxed overflow-auto font-mono',
      footer: 'h-8 bg-black border-t border-green-500/25 px-4 flex items-center justify-between text-[10px] text-green-500/50 select-none font-mono shrink-0',
      textPrimary: 'text-[#22c55e]',
      accentText: 'text-green-400 font-bold',
    },
  };

  const ts = themeStyles[activeTheme] || themeStyles['classic-light'];

  return (
    <div className={`h-full flex flex-col text-sm`}>
      {/* 1. TEXT EDITOR TOOLBAR */}
      <div className={ts.toolbar}>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold tracking-wide truncate max-w-[140px] md:max-w-[200px] ${ts.textPrimary}`}>
            📝 {docName}
          </span>
          {activeFileId && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full select-none">
              Linked File
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Font Size slider control */}
          <div className="hidden sm:flex items-center gap-2 mr-2 bg-black/10 px-3 py-1 rounded-lg border border-black/5">
            <Type className="w-3.5 h-3.5 opacity-50" />
            <input
              type="range"
              min="10"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
              title="Font Size"
            />
            <span className="text-[10px] opacity-60 font-mono w-4">{fontSize}</span>
          </div>

          <button
            onClick={handleSave}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Save back to operating system"
          >
            <Save className={`w-4 h-4 ${ts.accentText}`} /> <span className="hidden md:inline">Save</span>
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Download file to computer"
          >
            <Download className="w-4 h-4" /> <span className="hidden md:inline">Export</span>
          </button>
          <button
            onClick={() => setDocContent('')}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-rose-500"
            title="Clear active draft"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TEXT AREA EDITOR STAGE */}
      <div className={ts.main}>
        <textarea
          value={docContent}
          onChange={(e) => setDocContent(e.target.value)}
          style={{ fontSize: `${fontSize}px` }}
          className={ts.textarea}
          placeholder="Start writing files here... Double-click text files inside 'File Manager' to open them directly in this editor, then click Save to write updates back!"
        />
      </div>

      {/* 3. STATUS BAR FOOTER */}
      <div className={ts.footer}>
        <div className="flex items-center gap-3">
          <span>Words: <span className="font-semibold opacity-80">{wordCount}</span></span>
          <span>Characters: <span className="font-semibold opacity-80">{charCount}</span></span>
        </div>
        <div>
          <span>UTF-8 Encoding</span>
        </div>
      </div>
    </div>
  );
}

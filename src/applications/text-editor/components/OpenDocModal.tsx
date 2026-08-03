import React from 'react';
import { X, FileText, Upload, Clock, Plus, Folder, Sparkles } from 'lucide-react';
import { FileItem } from '../../../types';

interface OpenDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  allFiles: FileItem[];
  recentDocIds: string[];
  onSelectFile: (file: FileItem) => void;
  onNewTemplate: (templateName: string, content: string) => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function OpenDocModal({
  isOpen,
  onClose,
  allFiles,
  recentDocIds,
  onSelectFile,
  onNewTemplate,
  onUploadFile,
}: OpenDocModalProps) {
  if (!isOpen) return null;

  const textFiles = allFiles.filter((f) => f.type === 'file');
  const recentFiles = textFiles.filter((f) => recentDocIds.includes(f.id));

  const templates = [
    {
      name: 'Blank Document',
      desc: 'Start with a clean slate',
      content: '',
    },
    {
      name: 'Meeting Minutes',
      desc: 'Agenda, Attendees, Action Items',
      content: `<h1>Meeting Minutes</h1><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><p><strong>Attendees:</strong> Alex, Sarah, Team</p><h2>Agenda</h2><ul><li>Project updates</li><li>Q3 Milestones</li><li>Action Items</li></ul>`,
    },
    {
      name: 'Project Proposal',
      desc: 'Executive summary & specifications',
      content: `<h1>Project Proposal</h1><h3>Overview</h3><p>Brief summary of project scope, objectives, and deliverables.</p><h3>Key Features</h3><ul><li>Feature 1: Real-time processing</li><li>Feature 2: Modern responsive UI</li></ul>`,
    },
    {
      name: 'Markdown / Notes',
      desc: 'Plain text notes and documentation',
      content: `# Document Title\n\nDate: ${new Date().toLocaleDateString()}\n\n## Overview\nType your notes here...`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Open or Create Document</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Choose a document from system files or start from a template
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-5 text-xs">
          {/* Templates Section */}
          <div>
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Start New Document
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((tpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onNewTemplate(tpl.name, tpl.content);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 hover:bg-purple-500/5 text-left transition-all cursor-pointer group"
                >
                  <div className="font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    {tpl.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{tpl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Button */}
          <div className="p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-purple-500" />
              <div>
                <div className="font-bold">Upload Local File</div>
                <div className="text-[10px] text-zinc-400">Open TXT, HTML, DOC, or Code files from your machine</div>
              </div>
            </div>
            <label className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors">
              Browse...
              <input
                type="file"
                accept=".txt,.html,.htm,.md,.json,.js,.ts,.tsx,.css"
                onChange={(e) => {
                  onUploadFile(e);
                  onClose();
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* System Files Section */}
          <div>
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-blue-500" /> System File Storage ({textFiles.length})
            </h4>
            {textFiles.length === 0 ? (
              <p className="text-zinc-400 italic">No files available in system storage.</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {textFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      onSelectFile(file);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="font-semibold truncate">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0">{file.createdAt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

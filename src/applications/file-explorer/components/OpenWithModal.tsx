import React from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Code,
  Info,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { FileItem } from '../../../types';

interface OpenWithModalProps {
  item: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectApp: (appKey: string, item: FileItem) => void;
}

export default function OpenWithModal({
  item,
  isOpen,
  onClose,
  onSelectApp,
}: OpenWithModalProps) {
  if (!isOpen || !item) return null;

  const appOptions = [
    {
      key: 'text-editor',
      name: 'Text Editor (Notepad)',
      desc: 'View & edit raw text or code files',
      icon: FileText,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      key: 'image-viewer',
      name: 'Photos & Image Preview',
      desc: 'View images and graphic assets',
      icon: ImageIcon,
      color: 'text-sky-500 bg-sky-500/10',
    },
    {
      key: 'audio-player',
      name: 'Audio Player',
      desc: 'Listen to music tracks & sound recordings',
      icon: Music,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      key: 'video-player',
      name: 'Video Player',
      desc: 'Watch video recordings & clips',
      icon: Video,
      color: 'text-purple-500 bg-purple-500/10',
    },
    {
      key: 'code-viewer',
      name: 'Code Inspector',
      desc: 'Syntax formatted code reader',
      icon: Code,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      key: 'properties',
      name: 'Properties Inspector',
      desc: 'Inspect file metadata, permissions, & activity log',
      icon: Info,
      color: 'text-zinc-500 bg-zinc-500/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold truncate max-w-[240px]">
                Open "{item.name}" With...
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Choose an application to open this file
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

        {/* Options List */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[360px] flex flex-col gap-2">
          {appOptions.map((app) => {
            const IconComponent = app.icon;

            return (
              <button
                key={app.key}
                onClick={() => {
                  onSelectApp(app.key, item);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-purple-500/50 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-purple-500/5 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${app.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {app.name}
                    </div>
                    <div className="text-[10px] text-zinc-400">{app.desc}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            );
          })}
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

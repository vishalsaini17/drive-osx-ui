import React, { useState } from 'react';
import {
  X,
  Image as ImageIcon,
  FileText,
  FileCode,
  Music,
  Video as VideoIcon,
  Download,
  Share2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Info,
  Sparkles
} from 'lucide-react';
import { FileItem } from '../../../types';

interface FilePreviewModalProps {
  item: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (item: FileItem) => void;
  onShare: (item: FileItem) => void;
}

export default function FilePreviewModal({
  item,
  isOpen,
  onClose,
  onDownload,
  onShare,
}: FilePreviewModalProps) {
  if (!isOpen || !item) return null;

  const [copiedCode, setCopiedCode] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const lowerName = item.name.toLowerCase();

  const isImage =
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.svg') ||
    lowerName.endsWith('.webp');

  const isAudio =
    lowerName.endsWith('.mp3') ||
    lowerName.endsWith('.wav') ||
    lowerName.endsWith('.ogg') ||
    lowerName.endsWith('.m4a');

  const isVideo =
    lowerName.endsWith('.mp4') ||
    lowerName.endsWith('.webm') ||
    lowerName.endsWith('.ogv');

  const isCode =
    lowerName.endsWith('.js') ||
    lowerName.endsWith('.ts') ||
    lowerName.endsWith('.tsx') ||
    lowerName.endsWith('.html') ||
    lowerName.endsWith('.css') ||
    lowerName.endsWith('.json') ||
    lowerName.endsWith('.py') ||
    lowerName.endsWith('.cpp') ||
    lowerName.endsWith('.sh');

  const handleCopyText = () => {
    if (item.content) {
      navigator.clipboard?.writeText(item.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const getCategoryIcon = () => {
    if (isImage) return <ImageIcon className="w-4 h-4 text-sky-400" />;
    if (isAudio) return <Music className="w-4 h-4 text-emerald-400" />;
    if (isVideo) return <VideoIcon className="w-4 h-4 text-purple-400" />;
    if (isCode) return <FileCode className="w-4 h-4 text-amber-400" />;
    return <FileText className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        className={`bg-zinc-900 text-white rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col transition-all duration-200 ${
          isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-3xl max-h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-zinc-800">{getCategoryIcon()}</div>
            <div className="truncate">
              <h3 className="text-sm font-bold truncate">{item.name}</h3>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                {item.createdAt} • {item.content ? `${item.content.length} bytes` : 'System File'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onShare(item)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Share file"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDownload(item)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isFullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-950/80">
          {isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={
                  item.content ||
                  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&auto=format&fit=crop&q=85'
                }
                alt={item.name}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] w-auto object-contain rounded-xl border border-white/10 shadow-lg"
              />
            </div>
          ) : isAudio ? (
            <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center gap-4 text-center max-w-md w-full">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{item.name}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Audio Track</p>
              </div>
              <audio controls className="w-full mt-2">
                <source src={item.content || ''} />
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : isVideo ? (
            <div className="max-w-full max-h-[65vh] overflow-hidden rounded-xl bg-black border border-zinc-800 flex items-center justify-center">
              <video controls className="max-h-[65vh] w-full">
                <source src={item.content || ''} />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : isCode || lowerName.endsWith('.txt') || lowerName.endsWith('.log') ? (
            <div className="w-full h-full max-h-[65vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
              <div className="p-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-zinc-400 px-4">
                <span>
                  {item.name} ({item.content?.split('\n').length || 0} lines)
                </span>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedCode ? 'Copied' : 'Copy Content'}
                </button>
              </div>
              <pre className="p-4 overflow-auto flex-1 text-zinc-200 select-text leading-relaxed whitespace-pre-wrap">
                {item.content || '// Empty document'}
              </pre>
            </div>
          ) : (
            <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center gap-3 text-center max-w-sm">
              <FileText className="w-12 h-12 text-zinc-500 stroke-[1.2]" />
              <div>
                <h4 className="font-bold text-sm">{item.name}</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Preview not directly supported for this format.
                </p>
              </div>
              <button
                onClick={() => onDownload(item)}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download File
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
          <span>Format: {item.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

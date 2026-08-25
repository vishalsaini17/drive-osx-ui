import React, { useState } from 'react';
import { Loader2, ImageOff, FileText, Trash2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import type { MediaItem, LinkItem } from '../../platform/messaging/MessagingService';
import type { MessengerPalette } from './useMessengerTheme';
import { useSupportsHover } from '../../platform/layout/useSupportsHover';

/**
 * Media / Docs / Links tabs — shared by ContactDetailsPanel and
 * GroupDetailsPanel, which otherwise duplicate every byte of this. Media and
 * Docs both come from the same attachment list (`media`), split client-side
 * by mime type; Links comes from a separate fetch since a shared link lives
 * in a text message's body, not an attachment.
 */

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

type Tab = 'media' | 'docs' | 'links';

export interface SharedMediaSectionProps {
  palette: MessengerPalette;

  media: MediaItem[];
  isLoadingMedia: boolean;
  mediaError: string | null;
  onDeleteMedia: (item: MediaItem) => void;
  deletingMediaId: string | null;

  links: LinkItem[];
  isLoadingLinks: boolean;
  linksError: string | null;
}

export default function SharedMediaSection({
  palette,
  media,
  isLoadingMedia,
  mediaError,
  onDeleteMedia,
  deletingMediaId,
  links,
  isLoadingLinks,
  linksError,
}: SharedMediaSectionProps) {
  const [tab, setTab] = useState<Tab>('media');
  const supportsHover = useSupportsHover();

  const isVisual = (item: MediaItem) =>
    (item.mimeType?.startsWith('image/') || item.mimeType?.startsWith('video/')) ?? false;
  const mediaItems = media.filter(isVisual);
  const docItems = media.filter((item) => !isVisual(item));

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: 'media', label: 'Media', count: mediaItems.length },
    { id: 'docs', label: 'Docs', count: docItems.length },
    { id: 'links', label: 'Links', count: links.length },
  ];

  return (
    <div className="p-3">
      <div className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${palette.textSubtle}`}>
        Media, links and docs
      </div>

      <div className={`flex items-center gap-1 mb-3 p-0.5 rounded-xl border ${palette.border}`}>
        {tabs.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setTab(entry.id)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
              tab === entry.id ? 'bg-blue-600 text-white' : `${palette.hover} ${palette.textMuted}`
            }`}
          >
            {entry.label}
            {entry.count > 0 && <span className="ml-1 opacity-70">{entry.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'media' &&
        (isLoadingMedia ? (
          <div className={`flex items-center justify-center gap-2 py-6 text-xs ${palette.textMuted}`}>
            <Loader2 size={13} className="animate-spin" /> Loading media…
          </div>
        ) : mediaError ? (
          <p className={`text-[11px] ${palette.textMuted}`}>{mediaError}</p>
        ) : mediaItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ImageOff size={20} className={palette.textSubtle} />
            <p className={`text-[11px] ${palette.textMuted}`}>No photos or videos shared yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {mediaItems.map((item) => (
              <div key={item.id} className="relative group aspect-square">
                {item.url && item.mimeType?.startsWith('image/') ? (
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                ) : item.url ? (
                  <video src={item.url} className="w-full h-full object-cover rounded-lg" muted />
                ) : (
                  <div className={`w-full h-full rounded-lg flex items-center justify-center border ${palette.border}`}>
                    <ImageOff size={16} className={palette.textSubtle} />
                  </div>
                )}
                <button
                  onClick={() => onDeleteMedia(item)}
                  disabled={deletingMediaId === item.id}
                  title="Delete"
                  className={`absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white transition-opacity cursor-pointer disabled:opacity-100 ${supportsHover ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : 'opacity-100'}`}
                >
                  {deletingMediaId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </div>
            ))}
          </div>
        ))}

      {tab === 'docs' &&
        (isLoadingMedia ? (
          <div className={`flex items-center justify-center gap-2 py-6 text-xs ${palette.textMuted}`}>
            <Loader2 size={13} className="animate-spin" /> Loading docs…
          </div>
        ) : mediaError ? (
          <p className={`text-[11px] ${palette.textMuted}`}>{mediaError}</p>
        ) : docItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText size={20} className={palette.textSubtle} />
            <p className={`text-[11px] ${palette.textMuted}`}>No documents shared yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {docItems.map((item) => (
              <div key={item.id} className={`group flex items-center gap-2.5 p-2 rounded-xl ${palette.hover}`}>
                <span className={`p-2 rounded-lg shrink-0 border ${palette.border}`}>
                  <FileText size={14} className={palette.textSubtle} />
                </span>
                <a
                  href={item.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1"
                  title={item.name}
                >
                  <span className={`block text-xs font-bold truncate ${palette.text}`}>{item.name}</span>
                  <span className={`block text-[10px] ${palette.textMuted}`}>
                    {formatSize(item.size)} · {formatDate(item.createdAt)}
                  </span>
                </a>
                <button
                  onClick={() => onDeleteMedia(item)}
                  disabled={deletingMediaId === item.id}
                  title="Delete"
                  className={`shrink-0 p-1.5 rounded-lg transition-opacity cursor-pointer disabled:opacity-100 ${supportsHover ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : 'opacity-100'}`}
                >
                  {deletingMediaId === item.id ? (
                    <Loader2 size={12} className={`animate-spin ${palette.textMuted}`} />
                  ) : (
                    <Trash2 size={12} className="text-rose-500" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ))}

      {tab === 'links' &&
        (isLoadingLinks ? (
          <div className={`flex items-center justify-center gap-2 py-6 text-xs ${palette.textMuted}`}>
            <Loader2 size={13} className="animate-spin" /> Loading links…
          </div>
        ) : linksError ? (
          <p className={`text-[11px] ${palette.textMuted}`}>{linksError}</p>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <LinkIcon size={20} className={palette.textSubtle} />
            <p className={`text-[11px] ${palette.textMuted}`}>No links shared yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {links.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className={`flex items-start gap-2.5 p-2 rounded-xl ${palette.hover}`}
              >
                <span className={`p-2 rounded-lg shrink-0 border ${palette.border}`}>
                  <LinkIcon size={14} className={palette.textSubtle} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`flex items-center gap-1 text-xs font-bold truncate ${palette.text}`}>
                    {item.domain}
                    <ExternalLink size={10} className={palette.textSubtle} />
                  </span>
                  <span className={`block text-[10px] truncate ${palette.textMuted}`}>{item.snippet}</span>
                  <span className={`block text-[9px] ${palette.textSubtle}`}>{formatDate(item.createdAt)}</span>
                </span>
              </a>
            ))}
          </div>
        ))}
    </div>
  );
}

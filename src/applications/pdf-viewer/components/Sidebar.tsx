import React, { useState } from 'react';
import { Bookmark, PDFDocumentData, StickyNote, TextAnnotation, SearchMatch } from '../types';
import {
  Grid,
  Bookmark as BookmarkIcon,
  Search,
  MessageSquare,
  Plus,
  Trash2,
  ChevronRight,
  FileText,
  X,
  Highlighter,
  Pencil,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  document: PDFDocumentData;
  currentPage: number;
  stickyNotes: StickyNote[];
  textAnnotations: TextAnnotation[];
  searchQuery: string;
  searchResults: SearchMatch[];
  onPageSelect: (pageIndex: number) => void;
  onAddBookmark: (pageIndex: number) => void;
  onDeleteBookmark: (id: string) => void;
  onSearchChange: (query: string) => void;
  onDeleteStickyNote: (id: string) => void;
  onDeleteTextAnnotation: (id: string) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  document,
  currentPage,
  stickyNotes,
  textAnnotations,
  searchQuery,
  searchResults,
  onPageSelect,
  onAddBookmark,
  onDeleteBookmark,
  onSearchChange,
  onDeleteStickyNote,
  onDeleteTextAnnotation,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'thumbnails' | 'bookmarks' | 'search' | 'annotations'>('thumbnails');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState<string>('');

  const handleCreateBookmark = () => {
    onAddBookmark(currentPage - 1);
  };

  return (
    <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col font-sans shrink-0 overflow-hidden select-none">
      {/* Sidebar Navigation Tabs Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-1 grid grid-cols-4 gap-1 text-xs font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('thumbnails')}
          className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTab === 'thumbnails' ? 'bg-slate-800 text-blue-400 font-extrabold' : 'hover:text-slate-200'
          }`}
          title="Page Thumbnails"
        >
          <Grid size={15} />
          <span className="text-[10px]">Pages</span>
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTab === 'bookmarks' ? 'bg-slate-800 text-amber-400 font-extrabold' : 'hover:text-slate-200'
          }`}
          title="Bookmarks"
        >
          <BookmarkIcon size={15} />
          <span className="text-[10px]">Bookmarks</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTab === 'search' ? 'bg-slate-800 text-emerald-400 font-extrabold' : 'hover:text-slate-200'
          }`}
          title="Search Text"
        >
          <Search size={15} />
          <span className="text-[10px]">Search</span>
        </button>

        <button
          onClick={() => setActiveTab('annotations')}
          className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTab === 'annotations' ? 'bg-slate-800 text-purple-400 font-extrabold' : 'hover:text-slate-200'
          }`}
          title="Annotations"
        >
          <MessageSquare size={15} />
          <span className="text-[10px]">Notes</span>
        </button>
      </div>

      {/* Sidebar Content Area */}
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
        {/* ================= THUMBNAILS TAB ================= */}
        {activeTab === 'thumbnails' && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Page Thumbnails ({document.totalPages})
            </span>

            {document.pages.map((page, idx) => {
              const isActive = currentPage === page.pageNumber;
              return (
                <div
                  key={page.pageNumber}
                  onClick={() => onPageSelect(idx)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={isActive ? 'text-blue-400' : 'text-slate-300'}>
                      Page {page.pageNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px] font-medium">
                      {page.title}
                    </span>
                  </div>

                  {/* Thumbnail Card Representation */}
                  <div className="w-full aspect-[1/1.3] bg-white rounded-lg p-2 border border-slate-700 text-[6px] text-slate-800 overflow-hidden shadow-inner flex flex-col justify-between">
                    <div>
                      <div className="font-extrabold text-[7px] text-blue-900 border-b border-slate-300 pb-0.5 mb-1 truncate">
                        {page.title}
                      </div>
                      <div className="space-y-0.5 text-slate-600 font-sans line-clamp-6">
                        {page.contentLines.map((l, i) => (
                          <p key={i}>{l}</p>
                        ))}
                      </div>
                    </div>
                    <div className="text-[5px] text-slate-400 text-right font-mono border-t border-slate-200 pt-0.5">
                      {page.pageNumber}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= BOOKMARKS TAB ================= */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Bookmarks ({document.bookmarks.length})
              </span>
              <button
                onClick={handleCreateBookmark}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={12} /> Bookmark Page {currentPage}
              </button>
            </div>

            <div className="space-y-2">
              {document.bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => onPageSelect(bm.pageIndex)}
                  className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookmarkIcon size={14} className="text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-amber-300">
                        {bm.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Page {bm.pageIndex + 1}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBookmark(bm.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    title="Delete Bookmark"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SEARCH TAB ================= */}
        {activeTab === 'search' && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Search Text across PDF
            </span>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Type keyword to search..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pl-8"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
            </div>

            <span className="text-[11px] font-bold text-slate-400 block">
              Matches Found: {searchResults.length}
            </span>

            <div className="space-y-2">
              {searchResults.map((match) => (
                <div
                  key={match.id}
                  onClick={() => onPageSelect(match.pageIndex)}
                  className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl space-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                    <span>Page {match.pageIndex + 1}</span>
                    <ChevronRight size={12} />
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
                    "...{match.textSnippet}..."
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= ANNOTATIONS TAB ================= */}
        {activeTab === 'annotations' && (
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Annotations & Notes ({stickyNotes.length + textAnnotations.length})
            </span>

            {/* Sticky Notes */}
            {stickyNotes.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Sticky Notes</span>
                {stickyNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onPageSelect(note.pageIndex)}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-emerald-400">Page {note.pageIndex + 1}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteStickyNote(note.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 font-medium">{note.text}</p>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {note.author} • {note.createdAt}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Text Annotations */}
            {textAnnotations.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Markup Annotations</span>
                {textAnnotations.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => onPageSelect(ann.pageIndex)}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-blue-400 capitalize">
                        {ann.type} on Page {ann.pageIndex + 1}
                      </span>
                      <p className="text-xs text-slate-300 italic truncate max-w-[180px]">"{ann.text}"</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTextAnnotation(ann.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {stickyNotes.length === 0 && textAnnotations.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs font-medium">
                No notes or highlights added yet.<br />Use annotation tools on top bar!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

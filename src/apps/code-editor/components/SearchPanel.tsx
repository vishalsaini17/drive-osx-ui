import React, { useEffect, useRef, useState } from 'react';
import { Search, X, ChevronRight, ChevronDown, Loader2, FileCode, Replace } from 'lucide-react';
import { FileService, FileItemResponse } from '../../../platform/files/FileService';
import { FileItem } from '../../../platform/types';
import { isSearchableTextFile } from '../editor/languages';

const MAX_FILES = 500;
const MAX_FOLDERS = 300;
const MAX_MATCHES = 1000;

interface Match {
  lineNumber: number;
  lineText: string;
  start: number;
  end: number;
}

interface FileResult {
  file: FileItemResponse;
  matches: Match[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPattern(query: string, opts: { caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }): RegExp {
  let source = opts.useRegex ? query : escapeRegExp(query);
  if (opts.wholeWord) source = `\\b(?:${source})\\b`;
  return new RegExp(source, opts.caseSensitive ? 'g' : 'gi');
}

async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = items[idx++];
      await fn(current);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
}

async function walkAllFiles(rootId: string | null): Promise<{ files: FileItemResponse[]; truncated: boolean }> {
  const files: FileItemResponse[] = [];
  const queue: (string | null)[] = [rootId];
  let foldersVisited = 0;
  let truncated = false;
  while (queue.length > 0) {
    if (foldersVisited >= MAX_FOLDERS) {
      truncated = true;
      break;
    }
    const folderId = queue.shift()!;
    foldersVisited++;
    let children: FileItemResponse[];
    try {
      children = await FileService.listChildren(folderId);
    } catch {
      continue;
    }
    for (const child of children) {
      if (child.type === 'folder') {
        queue.push(child.id);
      } else if (files.length < MAX_FILES) {
        files.push(child);
      } else {
        truncated = true;
      }
    }
  }
  return { files, truncated };
}

/** Line display window around a match, so a 5000-char minified line doesn't blow out the panel. */
function snippet(lineText: string, start: number, end: number): { before: string; match: string; after: string } {
  const WINDOW = 60;
  const from = Math.max(0, start - WINDOW);
  const to = Math.min(lineText.length, end + WINDOW);
  return {
    before: (from > 0 ? '…' : '') + lineText.slice(from, start),
    match: lineText.slice(start, end),
    after: lineText.slice(end, to) + (to < lineText.length ? '…' : ''),
  };
}

function toFileItem(f: FileItemResponse): FileItem {
  return { id: f.id, name: f.name, type: f.type, parentId: f.parentId, createdAt: f.createdAt };
}

interface SearchPanelProps {
  rootId: string | null;
  rootName: string;
  getDirtyOpenFileIds: () => Set<string>;
  onOpenResult: (file: FileItem, lineNumber: number, column: number, length: number) => void;
  onFileContentReplaced: (fileId: string, newContent: string) => void;
}

/**
 * Search across every saved file under the current scope (the open folder,
 * or the whole Drive if none is open). There's no server-side full-text
 * index (CLAUDE.md §13 — don't introduce a search engine prematurely), so
 * this walks the tree and greps client-side; it searches saved content, not
 * unsaved editor buffers, which is disclosed in the panel itself rather than
 * silently missing matches a user would expect to see.
 */
export default function SearchPanel({ rootId, rootName, getDirtyOpenFileIds, onOpenResult, onFileContentReplaced }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [status, setStatus] = useState<'idle' | 'searching' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<FileResult[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [replacing, setReplacing] = useState(false);
  const searchIdRef = useRef(0);

  const performSearch = async (id: number) => {
    let regex: RegExp;
    try {
      regex = buildPattern(query, { caseSensitive, wholeWord, useRegex });
    } catch {
      if (id !== searchIdRef.current) return;
      setStatus('error');
      setErrorMessage('Invalid regular expression.');
      setResults([]);
      return;
    }

    const { files: candidates, truncated: filesTruncated } = await walkAllFiles(rootId);
    if (id !== searchIdRef.current) return;

    const found: FileResult[] = [];
    let totalMatches = 0;
    let matchesTruncated = false;

    await runPool(candidates, 6, async (entry) => {
      if (id !== searchIdRef.current || totalMatches >= MAX_MATCHES) return;
      if (!isSearchableTextFile(entry.name, entry.mimeType)) return;
      const full = await FileService.getFile(entry.id).catch(() => null);
      if (id !== searchIdRef.current || !full || full.content === undefined) return;

      const matches: Match[] = [];
      const lines = full.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (totalMatches >= MAX_MATCHES) {
          matchesTruncated = true;
          break;
        }
        const lineText = lines[i];
        regex.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(lineText))) {
          matches.push({ lineNumber: i + 1, lineText, start: m.index, end: m.index + m[0].length });
          totalMatches++;
          if (m[0].length === 0) regex.lastIndex++;
          if (totalMatches >= MAX_MATCHES) {
            matchesTruncated = true;
            break;
          }
        }
      }
      if (matches.length > 0) found.push({ file: entry, matches });
    });

    if (id !== searchIdRef.current) return;
    found.sort((a, b) => a.file.name.localeCompare(b.file.name));
    setResults(found);
    setTruncated(filesTruncated || matchesTruncated);
    setStatus('done');
    setErrorMessage(null);
  };

  useEffect(() => {
    if (!query.trim()) {
      searchIdRef.current++;
      setResults([]);
      setStatus('idle');
      setErrorMessage(null);
      setTruncated(false);
      return;
    }
    const id = ++searchIdRef.current;
    setStatus('searching');
    const timer = setTimeout(() => void performSearch(id), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive, wholeWord, useRegex, rootId]);

  const totalMatches = results.reduce((n, r) => n + r.matches.length, 0);

  const handleReplaceAll = async (scope?: FileResult[]) => {
    const targets = scope ?? results;
    if (targets.length === 0 || !replaceValue) return;
    let regex: RegExp;
    try {
      regex = buildPattern(query, { caseSensitive, wholeWord, useRegex });
    } catch {
      return;
    }

    const dirty = getDirtyOpenFileIds();
    const skipped = targets.filter((r) => dirty.has(r.file.id));
    const toReplace = targets.filter((r) => !dirty.has(r.file.id));
    const matchCount = toReplace.reduce((n, r) => n + r.matches.length, 0);

    if (toReplace.length === 0) {
      alert('Nothing to replace — every matching file has unsaved changes open. Save them first.');
      return;
    }
    const confirmMsg =
      `Replace ${matchCount} match${matchCount === 1 ? '' : 'es'} across ${toReplace.length} file${toReplace.length === 1 ? '' : 's'}?` +
      (skipped.length ? `\n\n${skipped.length} file(s) skipped — they have unsaved changes open in a tab.` : '');
    if (!confirm(confirmMsg)) return;

    setReplacing(true);
    let succeeded = 0;
    let failed = 0;
    await runPool(toReplace, 4, async (r) => {
      try {
        const full = await FileService.getFile(r.file.id);
        if (!full || full.content === undefined) {
          failed++;
          return;
        }
        regex.lastIndex = 0;
        const newContent = useRegex ? full.content.replace(regex, replaceValue) : full.content.replace(regex, () => replaceValue);
        await FileService.updateFile(r.file.id, { content: newContent });
        onFileContentReplaced(r.file.id, newContent);
        succeeded++;
      } catch {
        failed++;
      }
    });
    setReplacing(false);
    alert(`Replaced matches in ${succeeded} file${succeeded === 1 ? '' : 's'}.${failed ? ` ${failed} failed — please retry.` : ''}`);
    const id = ++searchIdRef.current;
    setStatus('searching');
    void performSearch(id);
  };

  const toggleCollapsed = (fileId: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleBtn = (active: boolean, label: string, title: string, onClick: () => void) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold cursor-pointer ${
        active ? 'bg-[var(--wb-accent)]/40 text-[var(--wb-fg)] ring-1 ring-[var(--wb-accent)]' : 'text-[var(--wb-fg)]/40 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-fg)]/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="px-3 pt-1 pb-2 shrink-0 border-b border-[var(--wb-border-subtle)]">
        <div className="flex items-center justify-end mb-1">
          <button
            onClick={() => setShowReplace((v) => !v)}
            title="Toggle Replace"
            className={`p-1 rounded cursor-pointer ${showReplace ? 'text-[var(--wb-fg)] bg-[var(--wb-fg)]/10' : 'text-[var(--wb-fg)]/40 hover:text-[var(--wb-fg)] hover:bg-[var(--wb-fg)]/10'}`}
          >
            <Replace className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[var(--wb-control-bg)] rounded px-2 py-1 mb-1">
          <Search className="w-3.5 h-3.5 text-[var(--wb-fg)]/40 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in ${rootName}`}
            className="flex-1 bg-transparent text-[12px] text-[var(--wb-fg)] placeholder:text-[var(--wb-fg)]/30 outline-none min-w-0"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[var(--wb-fg)]/40 hover:text-[var(--wb-fg)] cursor-pointer shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
          <div className="flex items-center gap-0.5 shrink-0">
            {toggleBtn(caseSensitive, 'Aa', 'Match Case', () => setCaseSensitive((v) => !v))}
            {toggleBtn(wholeWord, 'ab', 'Match Whole Word', () => setWholeWord((v) => !v))}
            {toggleBtn(useRegex, '.*', 'Use Regular Expression', () => setUseRegex((v) => !v))}
          </div>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1 bg-[var(--wb-control-bg)] rounded px-2 py-1">
            <Replace className="w-3.5 h-3.5 text-[var(--wb-fg)]/40 shrink-0" />
            <input
              value={replaceValue}
              onChange={(e) => setReplaceValue(e.target.value)}
              placeholder="Replace"
              className="flex-1 bg-transparent text-[12px] text-[var(--wb-fg)] placeholder:text-[var(--wb-fg)]/30 outline-none min-w-0"
            />
            <button
              onClick={() => void handleReplaceAll()}
              disabled={!replaceValue || results.length === 0 || replacing}
              title="Replace All"
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--wb-accent-soft)] hover:bg-[var(--wb-accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--wb-on-accent)] cursor-pointer shrink-0"
            >
              Replace All
            </button>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 text-[11px] text-[var(--wb-fg)]/40 shrink-0 border-b border-[var(--wb-border-subtle)] flex items-center gap-1.5">
        {status === 'searching' || replacing ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" /> {replacing ? 'Replacing…' : 'Searching…'}
          </>
        ) : status === 'error' ? (
          <span className="text-red-400/80">{errorMessage}</span>
        ) : status === 'done' ? (
          <span>
            {totalMatches} result{totalMatches === 1 ? '' : 's'} in {results.length} file{results.length === 1 ? '' : 's'}
            {truncated ? ' (truncated)' : ''}
          </span>
        ) : (
          <span className="italic">Searches saved file contents under {rootName}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {results.map((r) => {
          const collapsed = collapsedFiles.has(r.file.id);
          return (
            <div key={r.file.id}>
              <div className="w-full flex items-center gap-1 px-2 py-[3px] text-[12px] text-[var(--wb-fg)]/80 hover:bg-[var(--wb-fg)]/10 group">
                <button onClick={() => toggleCollapsed(r.file.id)} className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer">
                  {collapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--wb-fg)]/40" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--wb-fg)]/40" />}
                  <FileCode className="w-3.5 h-3.5 shrink-0 text-[var(--wb-accent)]" />
                  <span className="truncate font-medium">{r.file.name}</span>
                  <span className="text-[var(--wb-fg)]/30 shrink-0">{r.matches.length}</span>
                </button>
                {showReplace && (
                  <button
                    onClick={() => void handleReplaceAll([r])}
                    disabled={!replaceValue || replacing}
                    title="Replace All in File"
                    className="opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.5 rounded hover:bg-[var(--wb-fg)]/10 disabled:opacity-0 cursor-pointer shrink-0"
                  >
                    Replace
                  </button>
                )}
              </div>
              {!collapsed &&
                r.matches.map((m, i) => {
                  const { before, match, after } = snippet(m.lineText, m.start, m.end);
                  return (
                    <button
                      key={i}
                      onClick={() => onOpenResult(toFileItem(r.file), m.lineNumber, m.start + 1, m.end - m.start)}
                      className="w-full flex items-start gap-1.5 pl-8 pr-2 py-[2px] text-left cursor-pointer hover:bg-[var(--wb-fg)]/10 text-[11.5px]"
                    >
                      <span className="text-[var(--wb-fg)]/30 shrink-0 tabular-nums pt-[1px]">{m.lineNumber}</span>
                      <span className="truncate text-[var(--wb-fg)]/60">
                        {before}
                        <mark className="bg-[var(--wb-match-bg)] text-[var(--wb-match-fg)] rounded-sm">{match}</mark>
                        {after}
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })}
        {status === 'done' && results.length === 0 && <div className="text-[11px] text-[var(--wb-fg)]/30 italic px-3 py-4">No results found.</div>}
      </div>
    </div>
  );
}

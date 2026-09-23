import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

/** One match's absolute document range. */
export interface FindMatch {
  from: number;
  to: number;
}

interface FindReplaceState {
  matches: FindMatch[];
  activeIndex: number;
  decorations: DecorationSet;
}

const SET_MATCHES_META = 'wordbook-find-set-matches';

export const findReplacePluginKey = new PluginKey<FindReplaceState>('wordbook-find-replace');

/**
 * Search is a per-text-node regex scan (via `doc.descendants`) rather than a
 * single regex over `doc.textContent` — `textContent` silently skips
 * non-text nodes (images, page breaks), so offsets computed from it would
 * drift out of sync with real document positions the moment a search term
 * appears after one. A match is never expected to span *across* a non-text
 * node (searching document text, not node boundaries), so per-node matching
 * loses nothing in practice.
 */
export function findMatches(doc: PMNode, query: string, caseSensitive: boolean): FindMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
  const matches: FindMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(node.text))) {
      matches.push({ from: pos + m.index, to: pos + m.index + m[0].length });
      if (m[0].length === 0) re.lastIndex += 1; // guard against a zero-width query looping forever
    }
  });

  return matches;
}

function buildDecorations(doc: PMNode, matches: FindMatch[], activeIndex: number): DecorationSet {
  const decorations = matches.map((match, i) =>
    Decoration.inline(match.from, match.to, {
      class: i === activeIndex ? 'wb-search-match wb-search-match-current' : 'wb-search-match',
    })
  );
  return DecorationSet.create(doc, decorations);
}

/** Pushes a fresh match list + active index into the plugin, driving the highlight decorations. Called from the find/replace bar, not from typing. */
export function setFindMatches(view: EditorView, matches: FindMatch[], activeIndex: number): void {
  const decorations = buildDecorations(view.state.doc, matches, activeIndex);
  view.dispatch(view.state.tr.setMeta(SET_MATCHES_META, { matches, activeIndex, decorations } satisfies FindReplaceState));
}

export function clearFindMatches(view: EditorView): void {
  setFindMatches(view, [], -1);
}

export function createFindReplaceExtension() {
  return Extension.create({
    name: 'wordbookFindReplace',
    addProseMirrorPlugins() {
      return [
        new Plugin<FindReplaceState>({
          key: findReplacePluginKey,
          state: {
            init(): FindReplaceState {
              return { matches: [], activeIndex: -1, decorations: DecorationSet.empty };
            },
            apply(tr, prev): FindReplaceState {
              const forced = tr.getMeta(SET_MATCHES_META) as FindReplaceState | undefined;
              if (forced) return forced;
              if (!tr.docChanged) return prev;
              // A doc edit invalidates stale positions — the find bar
              // re-searches on every keystroke anyway, but until that next
              // search lands, mapping keeps existing highlights from
              // pointing at the wrong text rather than just dropping them.
              return { ...prev, decorations: prev.decorations.map(tr.mapping, tr.doc) };
            },
          },
          props: {
            decorations(state) {
              return findReplacePluginKey.getState(state)?.decorations ?? DecorationSet.empty;
            },
          },
        }),
      ];
    },
  });
}

import { BookSection, generateBookId } from '../../platform/documents/book/bookFormat';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export interface TabNode extends BookSection {
  children: TabNode[];
}

/** Builds a parent/child tree from the flat, order-carrying section list — siblings sorted by `order`. */
export function buildTabTree(sections: BookSection[]): TabNode[] {
  const byParent = new Map<string | null, BookSection[]>();
  for (const s of sections) {
    const list = byParent.get(s.parentId) ?? [];
    list.push(s);
    byParent.set(s.parentId, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order);

  const build = (parentId: string | null): TabNode[] => (byParent.get(parentId) ?? []).map((s) => ({ ...s, children: build(s.id) }));

  return build(null);
}

/** The first top-level tab, in display order — used to pick which tab a freshly-loaded document opens to. */
export function firstRootTab(sections: BookSection[]): BookSection | undefined {
  return sections
    .filter((s) => s.parentId === null)
    .sort((a, b) => a.order - b.order)[0];
}

/** Every id in `id`'s own subtree, `id` itself included — used to block deleting/nesting a tab into its own descendant. */
export function descendantIds(sections: BookSection[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const s of sections) {
      if (s.parentId && result.has(s.parentId) && !result.has(s.id)) {
        result.add(s.id);
        grew = true;
      }
    }
  }
  return result;
}

function nextOrder(sections: BookSection[], parentId: string | null): number {
  const siblings = sections.filter((s) => s.parentId === parentId);
  return siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1;
}

export function makeBlankTab(title: string, parentId: string | null, sections: BookSection[]): BookSection {
  return {
    id: generateBookId('tab'),
    title,
    emoji: null,
    parentId,
    order: nextOrder(sections, parentId),
    pageSetup: {},
    headerRef: null,
    footerRef: null,
    content: EMPTY_DOC,
  };
}

/** Returns just the new, duplicated copies of `id`'s subtree (ids remapped, titled "<original> (copy)") — callers append these to the existing list. */
export function duplicateTabSubtree(sections: BookSection[], id: string): BookSection[] {
  const original = sections.find((s) => s.id === id);
  if (!original) return [];

  const subtreeIds = descendantIds(sections, id);
  const toCopy = sections.filter((s) => subtreeIds.has(s.id));
  const idMap = new Map<string, string>();
  toCopy.forEach((s) => idMap.set(s.id, generateBookId('tab')));

  const newOrder = nextOrder(sections, original.parentId);

  return toCopy.map((s) => ({
    ...s,
    id: idMap.get(s.id)!,
    parentId: s.id === id ? original.parentId : idMap.get(s.parentId!) ?? s.parentId,
    order: s.id === id ? newOrder : s.order,
    title: s.id === id ? `${s.title} (copy)` : s.title,
  }));
}

/** Removes a tab and its whole subtree. Returns null (a no-op) if that would remove the last tab — a document always needs at least one. */
export function removeTabSubtree(sections: BookSection[], id: string): BookSection[] | null {
  const toRemove = descendantIds(sections, id);
  const remaining = sections.filter((s) => !toRemove.has(s.id));
  return remaining.length === 0 ? null : remaining;
}

export function moveSibling(sections: BookSection[], id: string, direction: 'up' | 'down'): BookSection[] {
  const tab = sections.find((s) => s.id === id);
  if (!tab) return sections;
  const siblings = sections.filter((s) => s.parentId === tab.parentId).sort((a, b) => a.order - b.order);
  const index = siblings.findIndex((s) => s.id === id);
  const swapWith = direction === 'up' ? siblings[index - 1] : siblings[index + 1];
  if (!swapWith) return sections;
  return sections.map((s) => {
    if (s.id === tab.id) return { ...s, order: swapWith.order };
    if (s.id === swapWith.id) return { ...s, order: tab.order };
    return s;
  });
}

/** Re-parents a tab under `newParentId` (null = top level), appended after its new siblings. A no-op if that would move a tab into its own descendant. */
export function moveIntoParent(sections: BookSection[], id: string, newParentId: string | null): BookSection[] {
  if (id === newParentId) return sections;
  if (newParentId && descendantIds(sections, id).has(newParentId)) return sections;
  const order = nextOrder(sections, newParentId);
  return sections.map((s) => (s.id === id ? { ...s, parentId: newParentId, order } : s));
}

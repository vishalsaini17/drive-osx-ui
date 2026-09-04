import { Extension } from '@tiptap/core';
import { createPaginationPlugin, PaginationPluginOptions } from './paginationPlugin';

/** Thin TipTap wrapper so the raw ProseMirror pagination plugin can join the extension list. */
export function createPaginationExtension(options: PaginationPluginOptions) {
  return Extension.create({
    name: 'wordbookPagination',
    addProseMirrorPlugins() {
      return [createPaginationPlugin(options)];
    },
  });
}

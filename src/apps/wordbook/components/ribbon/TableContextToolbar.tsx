import React from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Rows3,
  Columns3,
  Combine,
  Grid2x2,
  Trash2,
} from 'lucide-react';
import { ContextToolbarChrome, ContextToolbarButton, ContextToolbarDivider } from './ContextToolbarChrome';

/** Appears only while the cursor is inside a table — Word/Docs never show row/column controls otherwise. */
export default function TableContextToolbar({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="wb-table-menu"
      shouldShow={({ editor: e }) => e.isActive('table')}
      options={{ placement: 'top', offset: 8 }}
    >
      <ContextToolbarChrome>
        <ContextToolbarButton title="Add row above" onClick={() => editor.chain().focus().addRowBefore().run()}>
          <ArrowUpToLine className="w-3.5 h-3.5" />
        </ContextToolbarButton>
        <ContextToolbarButton title="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
          <ArrowDownToLine className="w-3.5 h-3.5" />
        </ContextToolbarButton>
        <ContextToolbarButton title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
          <Rows3 className="w-3.5 h-3.5" />
        </ContextToolbarButton>

        <ContextToolbarDivider />

        <ContextToolbarButton title="Add column left" onClick={() => editor.chain().focus().addColumnBefore().run()}>
          <ArrowLeftToLine className="w-3.5 h-3.5" />
        </ContextToolbarButton>
        <ContextToolbarButton title="Add column right" onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <ArrowRightToLine className="w-3.5 h-3.5" />
        </ContextToolbarButton>
        <ContextToolbarButton title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
          <Columns3 className="w-3.5 h-3.5" />
        </ContextToolbarButton>

        <ContextToolbarDivider />

        <ContextToolbarButton title="Merge cells" onClick={() => editor.chain().focus().mergeCells().run()}>
          <Combine className="w-3.5 h-3.5" />
        </ContextToolbarButton>
        <ContextToolbarButton title="Split cell" onClick={() => editor.chain().focus().splitCell().run()}>
          <Grid2x2 className="w-3.5 h-3.5" />
        </ContextToolbarButton>

        <ContextToolbarDivider />

        <ContextToolbarButton danger title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
          <Trash2 className="w-3.5 h-3.5" />
        </ContextToolbarButton>
      </ContextToolbarChrome>
    </BubbleMenu>
  );
}

import { Editor } from '@tiptap/react';

/** Shared by the ribbon's link button and the Insert menu's "Link…" item, so prompting/clearing behavior never diverges between the two entry points. */
export function promptForLink(editor: Editor): void {
  const previousUrl = editor.getAttributes('link').href as string | undefined;
  const url = prompt('Link URL:', previousUrl ?? 'https://');
  if (url === null) return;
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}

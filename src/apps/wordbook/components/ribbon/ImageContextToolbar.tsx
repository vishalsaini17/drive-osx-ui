import React, { useRef } from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { AlignLeft, AlignCenter, AlignRight, WrapText, RectangleHorizontal, Replace, Trash2 } from 'lucide-react';
import { ContextToolbarChrome, ContextToolbarButton, ContextToolbarDivider } from './ContextToolbarChrome';
import { FileService } from '../../../../platform/files/FileService';

interface ImageContextToolbarProps {
  editor: Editor;
  currentFolderId: string | null;
  resolveDefaultFolderId: (name: string) => string | null;
}

/** Appears only while an image is selected — resizing itself is handled natively by the Image node's own drag handles, not this toolbar. */
export default function ImageContextToolbar({ editor, currentFolderId, resolveDefaultFolderId }: ImageContextToolbarProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const align = (editor.getAttributes('image').align as string) ?? 'left';
  const wrap = (editor.getAttributes('image').wrap as string) ?? 'block';

  const replaceImage = async (file: File) => {
    try {
      const parentId = currentFolderId ?? resolveDefaultFolderId('Documents');
      const uploaded = await FileService.upload(file, { parentId: parentId ?? undefined });
      const url = await FileService.downloadUrl(uploaded._id);
      editor.chain().focus().updateAttributes('image', { src: url, alt: file.name }).run();
    } catch (error) {
      console.error('Failed to replace image:', error);
      alert('Could not replace that image. Please try again.');
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="wb-image-menu"
      shouldShow={({ editor: e }) => e.isActive('image')}
      options={{ placement: 'top', offset: 8 }}
    >
      <ContextToolbarChrome>
        <ContextToolbarButton title="Align left" onClick={() => editor.chain().focus().setImageAlign('left').run()} disabled={align === 'left'}>
          <AlignLeft className="w-3.5 h-3.5" />
        </ContextToolbarButton>
        <ContextToolbarButton title="Align center" onClick={() => editor.chain().focus().setImageAlign('center').run()} disabled={align === 'center'}>
          <AlignCenter className="w-3.5 h-3.5" />
        </ContextToolbarButton>
        <ContextToolbarButton title="Align right" onClick={() => editor.chain().focus().setImageAlign('right').run()} disabled={align === 'right'}>
          <AlignRight className="w-3.5 h-3.5" />
        </ContextToolbarButton>

        <ContextToolbarDivider />

        <ContextToolbarButton
          title={wrap === 'inline' ? 'Wrapping with text — click to move to its own line' : 'On its own line — click to wrap with text'}
          onClick={() => editor.chain().focus().setImageWrap(wrap === 'inline' ? 'block' : 'inline').run()}
        >
          {wrap === 'inline' ? <WrapText className="w-3.5 h-3.5" /> : <RectangleHorizontal className="w-3.5 h-3.5" />}
        </ContextToolbarButton>

        <ContextToolbarDivider />

        <ContextToolbarButton title="Replace image" onClick={() => replaceInputRef.current?.click()}>
          <Replace className="w-3.5 h-3.5" />
        </ContextToolbarButton>
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void replaceImage(file);
            e.target.value = '';
          }}
        />
        <ContextToolbarButton danger title="Delete image" onClick={() => editor.chain().focus().deleteSelection().run()}>
          <Trash2 className="w-3.5 h-3.5" />
        </ContextToolbarButton>
      </ContextToolbarChrome>
    </BubbleMenu>
  );
}

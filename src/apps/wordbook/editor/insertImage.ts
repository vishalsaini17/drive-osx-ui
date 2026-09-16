import { Editor } from '@tiptap/react';
import { FileService } from '../../../platform/files/FileService';

/**
 * Uploads a local file through the platform's real file storage (same path
 * as dragging it into File Manager) and inserts it as an image node —
 * shared by the ribbon's image button and the Insert menu's "Upload from
 * computer" so the two never drift into two different upload behaviors.
 */
export async function uploadAndInsertImage(
  editor: Editor,
  file: File,
  currentFolderId: string | null,
  resolveDefaultFolderId: (name: string) => string | null
): Promise<void> {
  const parentId = currentFolderId ?? resolveDefaultFolderId('Documents');
  const uploaded = await FileService.upload(file, { parentId: parentId ?? undefined });
  const url = await FileService.downloadUrl(uploaded._id);
  editor.chain().focus().setImage({ src: url, alt: file.name }).run();
}

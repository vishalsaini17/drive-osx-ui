export interface DocumentVersion {
  id: string;
  timestamp: string;
  content: string;
  wordCount: number;
  charCount: number;
  label?: string;
}

export interface DocumentComment {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  timestamp: string;
  resolved: boolean;
  selectedText?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  status: 'active' | 'idle' | 'viewing';
  color: string;
}

export type EditorMode = 'rich' | 'plain';

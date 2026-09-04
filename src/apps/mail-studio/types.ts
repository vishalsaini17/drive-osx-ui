export type FolderType = 'inbox' | 'sent' | 'drafts' | 'outbox' | 'archive' | 'trash' | 'spam' | string;

export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  content?: string;
}

export interface Email {
  id: string;
  senderName: string;
  senderEmail: string;
  avatarBg?: string;
  recipientEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  subject: string;
  preview: string;
  body: string;
  /** Rich-text version of `body`; sanitized before it is ever put in the DOM. */
  bodyHtml?: string | null;
  timestamp: string;
  dateISO: string;
  folder: FolderType;
  isUnread: boolean;
  isStarred: boolean;
  isImportant?: boolean;
  isPinned?: boolean;
  isBlocked?: boolean;
  labels?: string[];
  attachments?: EmailAttachment[];
  priority?: 'normal' | 'high' | 'low';
}

export interface CustomFolder {
  id: string;
  name: string;
  iconName?: string;
  color?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  avatarBg: string;
  role?: string;
}

export interface EmailRule {
  id: string;
  name: string;
  conditionField: 'subject' | 'sender' | 'body';
  conditionValue: string;
  action: 'addLabel' | 'moveToFolder' | 'markImportant' | 'markSpam';
  actionValue: string;
  enabled: boolean;
}

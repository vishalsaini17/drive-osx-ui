import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Mail, 
  Inbox, 
  Send, 
  Star, 
  Trash2, 
  Archive, 
  Reply, 
  ReplyAll, 
  Forward, 
  Search, 
  Plus, 
  Paperclip, 
  Tag, 
  X, 
  Sparkles, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  FileText,
  CornerUpLeft,
  Filter,
  User,
  ShieldAlert,
  ArrowLeft,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Folder,
  FolderPlus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Code,
  Smile,
  Save,
  AtSign,
  Wand2,
  FileUp,
  Quote,
  PenTool,
  Pin,
  HardDrive,
  Calendar,
  CheckSquare,
  Share2,
  Ban,
  Type,
  Palette,
  Table as TableIcon,
  Image as ImageIcon,
  Clock3,
  FileCode,
  Sliders,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapUnderline from '@tiptap/extension-underline';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import { Table as TiptapTable, TableRow as TiptapTableRow, TableHeader as TiptapTableHeader, TableCell as TiptapTableCell } from '@tiptap/extension-table';
import DOMPurify from 'dompurify';
import { useSystemStore } from '../../shell/state/systemStore';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import AppShell from '../../design-system/components/AppShell';
import { ApiService } from '../../platform/api/ApiService';
import { Email, FolderType, CustomFolder, Contact, EmailRule, EmailAttachment } from './types';
import { INITIAL_EMAILS, INITIAL_CUSTOM_FOLDERS, INITIAL_CONTACTS, INITIAL_RULES } from './data/mockEmails';
import { DrivePickerModal } from './components/DrivePickerModal';
import { PreviewAttachmentModal } from './components/PreviewAttachmentModal';
import { CalendarEventModal } from './components/CalendarEventModal';
import { TaskModal } from './components/TaskModal';
import { RulesModal } from './components/RulesModal';
import { ContactsModal } from './components/ContactsModal';
import { CustomFolderModal } from './components/CustomFolderModal';

/** Escapes plain text and turns line breaks into <br> so it is safe to drop into the rich editor. */
function textToEditorHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return `<p>${div.innerHTML.replace(/\n/g, '<br>')}</p>`;
}

const MAIL_EDITOR_EXTENSIONS = [
  StarterKit,
  TiptapUnderline,
  TiptapLink.configure({ openOnClick: false, autolink: true }),
  TiptapImage,
  TiptapTable.configure({ resizable: false }),
  TiptapTableRow,
  TiptapTableHeader,
  TiptapTableCell,
];

export default function MailApp() {
  const isLight = !useAppTheme('mail').isDark;
  const currentUser = useSystemStore((state) => state.currentUser);

  // Responsive Container Observer
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [compactView, setCompactView] = useState<'sidebar' | 'list' | 'reader'>('list');
  const prevWidthRef = useRef<number>(900);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setContainerWidth(w);
        if (prevWidthRef.current >= 780 && w < 780) {
          setIsSidebarOpen(false);
        } else if (prevWidthRef.current < 780 && w >= 780) {
          setIsSidebarOpen(true);
        }
        prevWidthRef.current = w;
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isCompact = containerWidth < 600;

  const [emails, setEmails] = useState<Email[]>([]);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>(INITIAL_CUSTOM_FOLDERS);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [rules, setRules] = useState<EmailRule[]>(INITIAL_RULES);
  const [blockedEmails, setBlockedEmails] = useState<string[]>(['spammer@fakedeals.xyz']);
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false);
  const [emailsLoadError, setEmailsLoadError] = useState<string | null>(null);

  const loadEmails = async () => {
    if (!currentUser) return;
    setIsLoadingEmails(true);
    setEmailsLoadError(null);
    try {
      const inbox = await ApiService.getInbox();
      const sent = await ApiService.getSent();
      const starred = await ApiService.getStarred();
      const allEmails = [...inbox, ...sent, ...starred];
      if (allEmails.length > 0) {
        const mapped: Email[] = allEmails.map((e: any) => ({
          id: e._id || e.id,
          senderName: e.from?.split('<')[0]?.trim() || e.from || 'Unknown',
          senderEmail: e.from?.replace(/<.*>/g, '').trim() || e.from || 'unknown@example.com',
          recipientEmail: e.to || '',
          subject: e.subject || '(No Subject)',
          preview: (e.body || '').slice(0, 120) || 'No preview',
          body: e.body || '',
          bodyHtml: e.bodyHtml ?? null,
          timestamp: e.timestamp || new Date(e.createdAt).toLocaleString(),
          dateISO: e.dateISO || e.createdAt || new Date().toISOString(),
          folder: e.folder || 'inbox',
          isUnread: e.isUnread ?? true,
          isStarred: e.isStarred ?? false,
          isPinned: e.isPinned ?? false,
          isImportant: e.isImportant ?? false,
          labels: e.labels || [],
          attachments: e.attachments || [],
        }));
        setEmails(mapped);
        setSelectedEmailId(mapped[0]?.id || null);
      } else {
        setEmails([]);
        setSelectedEmailId(null);
      }
    } catch (error) {
      console.warn('Failed to load emails from API:', error);
      setEmails([]);
      setSelectedEmailId(null);
      setEmailsLoadError('Unable to load emails. Please check your connection and try again.');
    } finally {
      setIsLoadingEmails(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [currentUser]);

  // Navigation States
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'starred' | 'attachments'>('all');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick Reply State
  const [quickReplyText, setQuickReplyText] = useState<string>('');

  // Compose State
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeCc, setComposeCc] = useState<string>('');
  const [composeBcc, setComposeBcc] = useState<string>('');
  const [showCcBcc, setShowCcBcc] = useState<boolean>(false);
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [composeBodyHtml, setComposeBodyHtml] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'low'>('normal');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [isAiDrafting, setIsAiDrafting] = useState<boolean>(false);

  // Drag & Drop State for Compose / Mail area
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Modal States
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachment | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [contactTargetField, setContactTargetField] = useState<'to' | 'cc' | 'bcc'>('to');
  const [isCustomFolderModalOpen, setIsCustomFolderModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rich text compose editor. Kept mounted for the app's whole lifetime (not
  // just while isComposing is true) so reply/forward/draft-load can push
  // content into it with a plain command call, no mount-timing dance.
  const editor = useEditor({
    extensions: MAIL_EDITOR_EXTENSIONS,
    content: '',
    onUpdate: ({ editor: instance }) => {
      setComposeBody(instance.getText());
      setComposeBodyHtml(instance.getHTML());
    },
  });

  /** Replaces the editor's content and keeps composeBody/composeBodyHtml in sync. */
  const setEditorContent = (html: string) => {
    if (editor) {
      editor.commands.setContent(html);
      setComposeBody(editor.getText());
      setComposeBodyHtml(editor.getHTML());
    } else {
      setComposeBody(html.replace(/<[^>]+>/g, ''));
      setComposeBodyHtml(html);
    }
  };

  // Auto-Save Draft Debounce Timer
  useEffect(() => {
    if (!isComposing) return;
    if (!composeSubject.trim() && !composeBody.trim() && !composeTo.trim()) return;

    const timer = setTimeout(() => {
      setAutoSaveStatus('Draft auto-saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 2000);

    return () => clearTimeout(timer);
  }, [composeSubject, composeBody, composeTo, isComposing]);

  // Selected Email Reference
  const selectedEmail = useMemo(() => {
    return emails.find((e) => e.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  // Folder Unread Counts
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    emails.forEach((e) => {
      if (e.isUnread) {
        counts[e.folder] = (counts[e.folder] || 0) + 1;
      }
    });
    return counts;
  }, [emails]);

  // Filtered Emails Calculation
  const filteredEmails = useMemo(() => {
    let result = emails.filter((email) => {
      // Security Filter: Blocked Senders
      if (blockedEmails.includes(email.senderEmail.toLowerCase()) && activeFolder !== 'spam' && activeFolder !== 'trash') {
        return false;
      }

      // Folder filtering
      if (activeFolder === 'starred') {
        if (!email.isStarred) return false;
      } else if (activeFolder === 'important') {
        if (!email.isImportant) return false;
      } else {
        if (email.folder !== activeFolder) return false;
      }

      // Label filtering
      if (activeLabel && (!email.labels || !email.labels.includes(activeLabel))) {
        return false;
      }

      // Quick tab filters
      if (filterTab === 'unread' && !email.isUnread) return false;
      if (filterTab === 'starred' && !email.isStarred) return false;
      if (filterTab === 'attachments' && (!email.attachments || email.attachments.length === 0)) return false;

      // Comprehensive search query across subject, sender, recipient, body, date, attachments, labels
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSender = email.senderName.toLowerCase().includes(q) || email.senderEmail.toLowerCase().includes(q);
        const matchesRecipient = email.recipientEmail.toLowerCase().includes(q);
        const matchesSubj = email.subject.toLowerCase().includes(q);
        const matchesBody = email.body.toLowerCase().includes(q);
        const matchesDate = email.timestamp.toLowerCase().includes(q);
        const matchesLabels = email.labels?.some((l) => l.toLowerCase().includes(q));
        const matchesAtt = email.attachments?.some((a) => a.name.toLowerCase().includes(q));

        if (!matchesSender && !matchesRecipient && !matchesSubj && !matchesBody && !matchesDate && !matchesLabels && !matchesAtt) {
          return false;
        }
      }

      return true;
    });

    // Sort: Pinned items first, then by dateISO descending
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime();
    });
  }, [emails, activeFolder, activeLabel, filterTab, searchQuery, blockedEmails]);

  // Handlers & Actions
  const handleStartCompose = () => {
    setIsComposing(true);
    setAutoSaveStatus('');
    if (isCompact) setCompactView('reader');
  };

  const handleCloseEmail = () => {
    setSelectedEmailId(null);
    if (isCompact) setCompactView('list');
  };

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    if (isCompact) setCompactView('reader');

    const target = emails.find((e) => e.id === id);
    if (!target || !target.isUnread || target.id.startsWith('draft-') || target.id.startsWith('sent-')) return;

    // Optimistic: the reader should feel instant. If the persist call fails,
    // the row goes back to unread rather than silently keeping a state the
    // server never agreed to (CLAUDE.md §36 — errors must be explicit).
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isUnread: false } : e)));
    ApiService.markMailRead(id).then((result) => {
      if (!result.success) {
        setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isUnread: true } : e)));
        showToast(result.message || 'Could not mark this message as read.');
      }
    });
  };

  const toggleStar = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (id.startsWith('draft-') || id.startsWith('sent-')) return;

    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isStarred: !item.isStarred } : item))
    );
    ApiService.toggleMailStar(id).then((result) => {
      if (!result.success) {
        setEmails((prev) => prev.map((item) => (item.id === id ? { ...item, isStarred: !item.isStarred } : item)));
        showToast(result.message || 'Could not update the star.');
      }
    });
  };

  const togglePin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (id.startsWith('draft-') || id.startsWith('sent-')) return;

    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPinned: !item.isPinned } : item))
    );
    showToast('Updated pin status');
    ApiService.toggleMailPin(id).then((result) => {
      if (!result.success) {
        setEmails((prev) => prev.map((item) => (item.id === id ? { ...item, isPinned: !item.isPinned } : item)));
        showToast(result.message || 'Could not update the pin.');
      }
    });
  };

  const BACKEND_FOLDERS = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive'];

  const handleMoveFolder = (id: string, targetFolder: FolderType) => {
    const previousFolder = emails.find((item) => item.id === id)?.folder;

    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, folder: targetFolder } : item))
    );
    showToast(`Moved email to ${targetFolder}`);
    if (selectedEmailId === id) {
      handleCloseEmail();
    }

    // Custom folders are a client-only concept; the server only knows the
    // standard set, so there is nothing to persist for the rest.
    if (!BACKEND_FOLDERS.includes(targetFolder) || id.startsWith('draft-') || id.startsWith('sent-')) return;

    ApiService.moveMailToFolder(id, targetFolder).then((result) => {
      if (!result.success && previousFolder) {
        setEmails((prev) => prev.map((item) => (item.id === id ? { ...item, folder: previousFolder } : item)));
        showToast(result.message || 'Could not move the message.');
      }
    });
  };

  const handleBlockSender = (emailAddress: string) => {
    if (confirm(`Block all future emails from ${emailAddress}?`)) {
      setBlockedEmails((prev) => [...prev, emailAddress.toLowerCase()]);
      setEmails((prev) => prev.map((e) => e.senderEmail.toLowerCase() === emailAddress.toLowerCase() ? { ...e, folder: 'spam' } : e));
      showToast(`Blocked sender ${emailAddress}`);
    }
  };

  const handleReply = (email: Email, isAll: boolean = false) => {
    setIsComposing(true);
    setComposeTo(email.senderEmail);
    if (isAll && email.ccEmail) setComposeCc(email.ccEmail);
    setComposeSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    setEditorContent(textToEditorHtml(`\n\n---\nOn ${new Date(email.dateISO).toLocaleString()}, ${email.senderName} <${email.senderEmail}> wrote:\n> ${email.body.replace(/\n/g, '\n> ')}`));
    if (isCompact) setCompactView('reader');
  };

  const handleForward = (email: Email) => {
    setIsComposing(true);
    setComposeTo('');
    setComposeSubject(email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`);
    setEditorContent(textToEditorHtml(`\n\n---------- Forwarded message ---------\nFrom: ${email.senderName} <${email.senderEmail}>\nSubject: ${email.subject}\nDate: ${email.timestamp}\n\n${email.body}`));
    if (email.attachments) {
      setAttachments(email.attachments);
    }
    if (isCompact) setCompactView('reader');
  };

  const handleForwardAsAttachment = (email: Email) => {
    setIsComposing(true);
    setComposeTo('');
    setComposeSubject(`Fwd: [Attachment] ${email.subject}`);
    setEditorContent(textToEditorHtml(`Please find the attached raw message file (.eml) for "${email.subject}".`));
    const emlAttachment: EmailAttachment = {
      id: `eml-${Date.now()}`,
      name: `${email.subject.slice(0, 20)}.eml`,
      size: '24 KB',
      type: 'message/rfc822',
      content: `From: ${email.senderName} <${email.senderEmail}>\nTo: ${email.recipientEmail}\nSubject: ${email.subject}\nDate: ${email.dateISO}\n\n${email.body}`,
    };
    setAttachments([emlAttachment]);
    if (isCompact) setCompactView('reader');
    showToast('Email attached as .eml file');
  };

  const handleShareEmail = (email: Email) => {
    const shareText = `Email Summary from Drive OSX Mail Studio:\nSubject: ${email.subject}\nFrom: ${email.senderName} (${email.senderEmail})\nSnippet: ${email.preview}`;
    navigator.clipboard.writeText(shareText);
    showToast('Email summary copied to clipboard!');
  };

  const handleSendQuickReply = async () => {
    if (!quickReplyText.trim() || !selectedEmail) return;

    const newSentEmail: Email = {
      id: `sent-${Date.now()}`,
      senderName: currentUser?.fullName || 'Vishal Saini',
      senderEmail: currentUser?.email || 'vishalsaini154@gmail.com',
      recipientEmail: selectedEmail.senderEmail,
      subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      preview: quickReplyText,
      body: quickReplyText,
      timestamp: 'Just now',
      dateISO: new Date().toISOString(),
      folder: 'sent',
      isUnread: false,
      isStarred: false,
      labels: selectedEmail.labels,
    };

    if (currentUser) {
      try {
        await ApiService.sendMail({
          to: selectedEmail.senderEmail,
          subject: newSentEmail.subject,
          body: quickReplyText
        });
      } catch (error) {
        console.warn('Failed to send quick reply via API:', error);
      }
    }

    setEmails((prev) => [newSentEmail, ...prev]);
    setQuickReplyText('');
    showToast(`Reply sent to ${selectedEmail.senderName}`);
  };

  const resetComposeForm = () => {
    setComposeTo('');
    setComposeCc('');
    setComposeBcc('');
    setShowCcBcc(false);
    setComposeSubject('');
    setEditorContent('');
    setPriority('normal');
    setAttachments([]);
    setAutoSaveStatus('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const newAttachments: EmailAttachment[] = files.map((file, idx) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeKB = Math.round(file.size / 1024);
      return {
        id: `att-${Date.now()}-${idx}`,
        name: file.name,
        size: file.size >= 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`,
        type: file.type || 'document',
      };
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const newAtts: EmailAttachment[] = files.map((f, idx) => ({
        id: `drop-${Date.now()}-${idx}`,
        name: f.name,
        size: `${Math.round(f.size / 1024)} KB`,
        type: f.type || 'file',
      }));
      setAttachments((prev) => [...prev, ...newAtts]);
      showToast(`Attached ${files.length} file(s) via Drag & Drop`);
    }
  };

  const handleInsertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleInsertHyperlink = () => {
    const url = prompt('Enter link URL (e.g. https://drive-osx.local):', 'https://');
    if (!url || !editor) return;

    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const handleInsertImage = () => {
    const imgUrl = prompt('Enter image URL or path:', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600');
    if (imgUrl) {
      editor?.chain().focus().setImage({ src: imgUrl }).run();
    }
  };

  const handleSaveDraft = () => {
    if (!composeSubject.trim() && !composeBody.trim() && !composeTo.trim()) {
      showToast('Draft is empty.');
      return;
    }

    const draftEmail: Email = {
      id: `draft-${Date.now()}`,
      senderName: currentUser?.fullName || 'Vishal Saini',
      senderEmail: currentUser?.email || 'vishalsaini154@gmail.com',
      recipientEmail: composeTo || 'No recipient',
      subject: composeSubject ? `[Draft] ${composeSubject}` : '[Draft] (No subject)',
      preview: composeBody.slice(0, 80) || 'Empty draft body...',
      body: composeBody,
      bodyHtml: composeBodyHtml,
      timestamp: 'Draft',
      dateISO: new Date().toISOString(),
      folder: 'drafts',
      isUnread: false,
      isStarred: false,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setEmails((prev) => [draftEmail, ...prev]);
    setIsComposing(false);
    resetComposeForm();
    if (isCompact) setCompactView('list');
    showToast('Saved to Drafts');
  };

  const handleSendNewCompose = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      alert('Please enter recipient email and subject.');
      return;
    }

    const signaturePlain = `\n\n--\nBest regards,\n${currentUser?.fullName || 'Vishal Saini'}\nProduct Engineer | Drive OSX Mail Studio`;
    const signatureHtml = `<p>--<br>Best regards,<br>${currentUser?.fullName || 'Vishal Saini'}<br>Product Engineer | Drive OSX Mail Studio</p>`;

    const finalBody = includeSignature ? composeBody + signaturePlain : composeBody;
    // Sanitized here too, not just at render time: this HTML is about to be
    // stored and later rendered back in every recipient's reading pane, so
    // it should never carry more than what the editor itself can produce.
    const finalBodyHtml = DOMPurify.sanitize(includeSignature ? composeBodyHtml + signatureHtml : composeBodyHtml);

    const newSentEmail: Email = {
      id: `sent-${Date.now()}`,
      senderName: currentUser?.fullName || 'Vishal Saini',
      senderEmail: currentUser?.email || 'vishalsaini154@gmail.com',
      recipientEmail: composeTo,
      ccEmail: composeCc || undefined,
      bccEmail: composeBcc || undefined,
      subject: priority === 'high' ? `[URGENT] ${composeSubject}` : composeSubject,
      preview: composeBody.slice(0, 80) || 'No content preview',
      body: finalBody,
      bodyHtml: finalBodyHtml,
      timestamp: 'Just now',
      dateISO: new Date().toISOString(),
      folder: 'sent',
      isUnread: false,
      isStarred: priority === 'high',
      isImportant: priority === 'high',
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    if (currentUser) {
      try {
        await ApiService.sendMail({
          to: composeTo,
          subject: composeSubject,
          body: finalBody,
          bodyHtml: finalBodyHtml,
          cc: composeCc,
          bcc: composeBcc,
          priority,
          attachments
        });
      } catch (error) {
        console.warn('Failed to send email via API:', error);
      }
    }

    setEmails((prev) => [newSentEmail, ...prev]);
    setIsComposing(false);
    resetComposeForm();
    if (isCompact) setCompactView('list');
    showToast(`Email sent to ${composeTo}`);
  };

  const handleAiDraft = () => {
    setIsAiDrafting(true);
    setTimeout(() => {
      setComposeSubject('Drive OSX Mail Studio Upgrade Summary');
      setEditorContent(textToEditorHtml(`Hi team,\n\nI am excited to announce that Drive OSX Mail Studio has been updated with rich formatting, Drive integration, custom rules, and task/calendar workflows.\n\nPlease test out the features and let me know your thoughts!\n\nBest regards,\n${currentUser?.fullName || 'Vishal'}`));
      setIsAiDrafting(false);
    }, 600);
  };

  const handleAiTonePolish = (tone: 'formal' | 'short' | 'friendly') => {
    setIsAiDrafting(true);
    setTimeout(() => {
      const prev = composeBody;
      if (tone === 'formal') {
        setEditorContent(textToEditorHtml(`Dear Colleague,\n\nI am writing to communicate the updated operational specifications.\n\n${prev}\n\nSincerely,\n${currentUser?.fullName || 'Vishal Saini'}`));
      } else if (tone === 'short') {
        setEditorContent(textToEditorHtml(prev.split('\n').filter(Boolean).slice(0, 3).join('\n')));
      } else if (tone === 'friendly') {
        setEditorContent(textToEditorHtml(`Hope you're having an awesome week! 😊\n\n${prev}\n\nCheers!`));
      }
      setIsAiDrafting(false);
    }, 500);
  };

  // RENDER SIDEBAR CONTENT
  const renderSidebarContent = () => (
    <div className="flex flex-col p-3 sm:p-2.5 gap-3 h-full overflow-y-auto">
      {/* Top Header */}
      {isCompact ? (
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? '' : 'border-white/10'}`}>
          <div className="flex items-center gap-2">
            <Folder size={18} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
            <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Mailboxes</span>
          </div>
          <button
            onClick={() => setCompactView('list')}
            className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1 pt-0.5">
          <span className={`text-xs font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
            Navigation
          </span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`p-1 rounded-lg cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      )}

      {/* Profile Card & New Mail Button */}
      <div className="flex flex-col gap-2">
        <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${isLight ? 'bg-white border-slate-200' : 'bg-[#232227] border-white/10'}`}>
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
            {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'V'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold truncate leading-tight">
              {currentUser?.fullName || 'Vishal Saini'}
            </span>
            <span className={`text-[10px] truncate ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              {currentUser?.email || 'vishalsaini154@gmail.com'}
            </span>
          </div>
        </div>

        <button
          onClick={handleStartCompose}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-transform active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          <span>New Mail</span>
        </button>
      </div>

      {/* Main Mail Folders */}
      <div className="flex flex-col gap-0.5">
        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 mb-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
          Folders
        </span>

        {[
          { id: 'inbox', label: 'Inbox', icon: Inbox },
          { id: 'starred', label: 'Starred', icon: Star },
          { id: 'sent', label: 'Sent', icon: Send },
          { id: 'drafts', label: 'Drafts', icon: Save },
          { id: 'outbox', label: 'Outbox', icon: Clock3 },
          { id: 'archive', label: 'Archive', icon: Archive },
          { id: 'spam', label: 'Spam', icon: ShieldAlert },
          { id: 'trash', label: 'Trash', icon: Trash2 },
        ].map((f) => {
          const Icon = f.icon;
          const isSelected = activeFolder === f.id && !activeLabel;
          const count = unreadCounts[f.id];
          return (
            <button
              key={f.id}
              onClick={() => { setActiveFolder(f.id); setActiveLabel(null); if (isCompact) setCompactView('list'); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : isLight ? 'hover:bg-slate-200/60 text-slate-700' : 'hover:bg-white/10 text-white/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={15} />
                <span>{f.label}</span>
              </div>
              {count > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  isSelected ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Folders Section */}
      <div className="flex flex-col gap-0.5 mt-1">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
            Custom Folders
          </span>
          <button
            onClick={() => setIsCustomFolderModalOpen(true)}
            className="text-slate-400 hover:text-blue-500 cursor-pointer p-0.5"
            title="Create Custom Folder"
          >
            <FolderPlus size={13} />
          </button>
        </div>

        {customFolders.map((cf) => {
          const isSelected = activeFolder === cf.id && !activeLabel;
          return (
            <button
              key={cf.id}
              onClick={() => { setActiveFolder(cf.id); setActiveLabel(null); if (isCompact) setCompactView('list'); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold'
                  : isLight ? 'hover:bg-slate-200/60 text-slate-700' : 'hover:bg-white/10 text-white/80'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${cf.color || 'bg-blue-500'} shrink-0`} />
              <span className="truncate">{cf.name}</span>
            </button>
          );
        })}
      </div>

      {/* Categories / Labels */}
      <div className="flex flex-col gap-0.5 mt-1">
        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 mb-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
          Categories
        </span>

        {['Work', 'Important', 'Updates', 'Personal'].map((lbl) => {
          const isSelected = activeLabel === lbl;
          return (
            <button
              key={lbl}
              onClick={() => { setActiveLabel(isSelected ? null : lbl); if (isCompact) setCompactView('list'); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold'
                  : isLight ? 'hover:bg-slate-200/60 text-slate-700' : 'hover:bg-white/10 text-white/80'
              }`}
            >
              <Tag size={13} className={isSelected ? 'text-white' : 'text-blue-500'} />
              <span>{lbl}</span>
            </button>
          );
        })}
      </div>

      {/* Automation Rules Button */}
      <div className={`mt-auto pt-2 border-t ${isLight ? '' : 'border-white/10'}`}>
        <button
          onClick={() => setIsRulesModalOpen(true)}
          className={`w-full px-2.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            isLight ? 'text-purple-600' : 'text-purple-300'
          }`}
        >
          <Sliders size={15} />
          <span>Automation Rules</span>
        </button>
      </div>
    </div>
  );

  // RENDER EMAIL LIST CONTENT
  const renderEmailListContent = () => (
    <div className="flex-1 flex flex-col min-h-0 h-full relative">
      {/* Search Bar & Filters */}
      <div className={`p-2.5 border-b flex flex-col gap-2 ${isLight ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-[#212025]'}`}>
        
        {/* Top Search Line */}
        <div className="flex items-center justify-between gap-2">
          {isCompact ? (
            <button
              onClick={() => setCompactView('sidebar')}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                isLight ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800' : 'bg-[#18181b] border-white/10 text-white/70 hover:text-white'
              }`}
            >
              <Menu size={16} />
            </button>
          ) : (
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                isLight ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800' : 'bg-[#18181b] border-white/10 text-white/70 hover:text-white'
              }`}
            >
              {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
          )}

          <div className={`flex-1 flex items-center px-2.5 py-1.5 rounded-lg border text-xs ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#18181b] border-white/10 text-white'
          }`}>
            <Search size={14} className="text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search subject, sender, body, label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Quick Tabs */}
        <div className="flex items-center justify-between text-[11px] font-bold">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(['all', 'unread', 'starred', 'attachments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-2 py-0.5 rounded-md capitalize cursor-pointer transition-colors whitespace-nowrap ${
                  filterTab === tab
                    ? 'bg-blue-600 text-white font-bold'
                    : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-white/60 hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-1">
            {filteredEmails.length}
          </span>
        </div>
      </div>

      {/* Email Item List */}
      <div className={`flex-1 overflow-y-auto divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'} pb-16`}>
        {isLoadingEmails ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading emails...</span>
          </div>
        ) : emailsLoadError ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 gap-3">
            <AlertCircle size={32} strokeWidth={1.5} className="opacity-40 text-rose-400" />
            <span className="text-xs font-semibold text-rose-300">{emailsLoadError}</span>
            <button
              onClick={loadEmails}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 gap-2">
            <Mail size={32} strokeWidth={1.5} className="opacity-40" />
            <span className="text-xs font-semibold">No emails yet.</span>
            <span className="text-[10px] text-slate-500">Sent mail will appear here, or compose a new message.</span>
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isSelected = selectedEmailId === email.id;
            return (
              <div
                key={email.id}
                onClick={() => handleSelectEmail(email.id)}
                className={`p-3 flex flex-col gap-1 transition-colors cursor-pointer relative group ${
                  isSelected
                    ? isLight ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'bg-blue-500/15 border-l-4 border-l-blue-500'
                    : email.isUnread
                    ? isLight ? 'bg-slate-50/90 font-semibold' : 'bg-white/5'
                    : isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'
                }`}
              >
                {/* Header Row: Sender + Pin + Date */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {email.isUnread && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                    {email.isPinned && (
                      <Pin size={12} className="text-blue-500 fill-blue-500 shrink-0" />
                    )}
                    <span className={`text-xs truncate ${email.isUnread ? 'font-bold' : 'font-semibold'} ${
                      email.isUnread ? (isLight ? 'text-slate-900' : 'text-white') : (isLight ? 'text-slate-700' : 'text-white/80')
                    }`}>
                      {email.senderName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {email.timestamp}
                  </span>
                </div>

                {/* Subject Row */}
                <div className={`text-xs truncate ${email.isUnread ? 'font-bold' : ''} ${
                  email.isUnread ? (isLight ? 'text-slate-800' : 'text-white') : (isLight ? 'text-slate-600' : 'text-white/70')
                }`}>
                  {email.subject}
                </div>

                {/* Preview Snippet */}
                <div className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-white/40'} line-clamp-2 leading-relaxed`}>
                  {email.preview}
                </div>

                {/* Bottom Bar: Labels, Attachments, Actions */}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    {email.labels?.map((lbl) => (
                      <span
                        key={lbl}
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                          isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-white/80'
                        }`}
                      >
                        {lbl}
                      </span>
                    ))}
                    {email.attachments && email.attachments.length > 0 && (
                      <Paperclip size={11} className="text-blue-500" />
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={(e) => togglePin(email.id, e)}
                      className="text-slate-400 hover:text-blue-500 cursor-pointer p-0.5"
                      title={email.isPinned ? "Unpin email" : "Pin email to top"}
                    >
                      <Pin size={12} className={email.isPinned ? 'fill-blue-500 text-blue-500' : ''} />
                    </button>
                    <button
                      onClick={(e) => toggleStar(email.id, e)}
                      className="text-slate-400 hover:text-amber-500 cursor-pointer p-0.5"
                    >
                      <Star size={13} className={email.isStarred ? 'fill-amber-500 text-amber-500' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB Mobile Compose */}
      {isCompact && (
        <button
          onClick={handleStartCompose}
          className="absolute bottom-4 right-4 z-20 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs flex items-center gap-2 shadow-xl active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          <span>Compose</span>
        </button>
      )}
    </div>
  );

  // RENDER INLINE COMPOSE CONTENT
  const renderComposeContent = () => (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleDropFiles}
      className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden relative ${
        isDraggingFile ? 'ring-4 ring-blue-500/50 bg-blue-500/5' : ''
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
      />

      {/* Compose Header Bar */}
      <div className={`p-3 border-b flex items-center justify-between gap-2 shrink-0 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#212025] border-white/10'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => {
              setIsComposing(false);
              if (isCompact) setCompactView('list');
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#18181b] border-white/10 text-white'
            }`}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <span className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-white'} truncate`}>
            New Message
          </span>
          {autoSaveStatus && (
            <span className="text-[10px] text-emerald-600 font-semibold truncate hidden sm:inline">
              ✓ {autoSaveStatus}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleAiDraft}
            disabled={isAiDrafting}
            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>{isAiDrafting ? 'Drafting...' : 'AI Draft'}</span>
          </button>

          <button
            onClick={() => {
              setIsComposing(false);
              if (isCompact) setCompactView('list');
            }}
            className={`p-1.5 rounded-lg text-slate-400 ${isLight ? 'hover:text-slate-700' : 'hover:text-white'} cursor-pointer`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Compose Form Area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col gap-2.5 overflow-y-auto min-h-0">
        
        {/* Recipient To */}
        <div className={`flex items-center border-b ${isLight ? '' : 'border-white/10'} pb-1.5 gap-2`}>
          <span className="w-12 text-xs font-bold text-slate-400 shrink-0">To:</span>
          <input
            type="email"
            placeholder="recipient@domain.com"
            value={composeTo}
            onChange={(e) => setComposeTo(e.target.value)}
            className={`w-full bg-transparent text-xs focus:outline-none font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}
            autoFocus
          />
          <button
            onClick={() => { setContactTargetField('to'); setIsContactsModalOpen(true); }}
            className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer"
            title="Pick contact from address book"
          >
            <User size={15} />
          </button>
          <button
            onClick={() => setShowCcBcc(!showCcBcc)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isLight ? 'text-slate-500' : 'text-white/60'} ${isLight ? 'border-slate-200' : 'border-white/10'} cursor-pointer`}
          >
            Cc/Bcc
          </button>
        </div>

        {/* Cc / Bcc Expandable */}
        {showCcBcc && (
          <div className={`flex flex-col gap-2 p-2 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-white/5'} border ${isLight ? '' : 'border-white/10'} animate-in fade-in duration-150`}>
            <div className={`flex items-center border-b ${isLight ? '' : 'border-white/10'} pb-1 gap-2`}>
              <span className="w-12 text-[11px] font-bold text-slate-400 shrink-0">Cc:</span>
              <input
                type="text"
                placeholder="Cc recipients..."
                value={composeCc}
                onChange={(e) => setComposeCc(e.target.value)}
                className={`w-full bg-transparent text-xs focus:outline-none ${isLight ? 'text-slate-800' : 'text-white'}`}
              />
              <button
                onClick={() => { setContactTargetField('cc'); setIsContactsModalOpen(true); }}
                className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer"
              >
                <User size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-[11px] font-bold text-slate-400 shrink-0">Bcc:</span>
              <input
                type="text"
                placeholder="Bcc recipients..."
                value={composeBcc}
                onChange={(e) => setComposeBcc(e.target.value)}
                className={`w-full bg-transparent text-xs focus:outline-none ${isLight ? 'text-slate-800' : 'text-white'}`}
              />
              <button
                onClick={() => { setContactTargetField('bcc'); setIsContactsModalOpen(true); }}
                className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer"
              >
                <User size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Subject */}
        <div className={`flex items-center border-b ${isLight ? '' : 'border-white/10'} pb-1.5 gap-2`}>
          <span className="w-12 text-xs font-bold text-slate-400 shrink-0">Subject:</span>
          <input
            type="text"
            placeholder="Email subject..."
            value={composeSubject}
            onChange={(e) => setComposeSubject(e.target.value)}
            className={`w-full bg-transparent text-xs focus:outline-none font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}
          />
        </div>

        {/* Rich Text Toolbar */}
        <div className={`p-1.5 rounded-xl border flex items-center justify-between gap-1 flex-wrap ${
          isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <div className="flex items-center gap-1 flex-wrap">
            {/* Font Family Selector */}
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className={`p-1 text-[11px] rounded bg-transparent font-bold ${isLight ? 'text-slate-700' : 'text-white'} focus:outline-none cursor-pointer`}
            >
              <option value="sans-serif">Sans-Serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              <option value="cursive">Cursive</option>
            </select>

            <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-white/20'} mx-0.5`} />

            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1 rounded cursor-pointer ${editor?.isActive('bold') ? 'bg-blue-600 text-white' : isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'}`}
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1 rounded cursor-pointer ${editor?.isActive('italic') ? 'bg-blue-600 text-white' : isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'}`}
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`p-1 rounded cursor-pointer ${editor?.isActive('underline') ? 'bg-blue-600 text-white' : isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'}`}
              title="Underline"
            >
              <Underline size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`p-1 rounded cursor-pointer ${editor?.isActive('strike') ? 'bg-blue-600 text-white' : isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'}`}
              title="Strikethrough"
            >
              <Strikethrough size={14} />
            </button>

            <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-white/20'} mx-0.5`} />

            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1 rounded cursor-pointer ${editor?.isActive('bulletList') ? 'bg-blue-600 text-white' : isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'}`}
              title="Bulleted List"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1 rounded cursor-pointer ${editor?.isActive('orderedList') ? 'bg-blue-600 text-white' : isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'}`}
              title="Numbered List"
            >
              <ListOrdered size={14} />
            </button>
            <button onClick={handleInsertTable} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'} cursor-pointer`} title="Insert Table">
              <TableIcon size={14} />
            </button>
            <button onClick={handleInsertHyperlink} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'} cursor-pointer`} title="Insert Link">
              <Link2 size={14} />
            </button>
            <button onClick={handleInsertImage} className={`p-1 rounded ${isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'} cursor-pointer`} title="Insert Image">
              <ImageIcon size={14} />
            </button>

            <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-white/20'} mx-0.5`} />

            {/* Attach from Device & Attach from Drive */}
            <button onClick={() => fileInputRef.current?.click()} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded cursor-pointer flex items-center gap-1 text-[11px] font-bold" title="Upload Attachment">
              <FileUp size={14} />
              <span className="hidden sm:inline">Upload</span>
            </button>
            <button onClick={() => setIsDrivePickerOpen(true)} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded cursor-pointer flex items-center gap-1 text-[11px] font-bold" title="Attach from DriveOSX">
              <HardDrive size={14} />
              <span className="hidden sm:inline">DriveOSX</span>
            </button>
          </div>

          {/* AI Tone Options */}
          <div className="flex items-center gap-1 text-[10px]">
            <button onClick={() => handleAiTonePolish('formal')} className={`px-1.5 py-0.5 bg-purple-500/10 ${isLight ? 'text-purple-600' : 'text-purple-300'} font-bold rounded cursor-pointer`}>Formal</button>
            <button onClick={() => handleAiTonePolish('short')} className={`px-1.5 py-0.5 bg-emerald-500/10 ${isLight ? 'text-emerald-600' : 'text-emerald-300'} font-bold rounded cursor-pointer`}>Short</button>
            <button onClick={() => handleAiTonePolish('friendly')} className={`px-1.5 py-0.5 bg-amber-500/10 ${isLight ? 'text-amber-600' : 'text-amber-300'} font-bold rounded cursor-pointer`}>Friendly</button>
          </div>
        </div>

        {/* Attachments Chips */}
        {attachments.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 p-2 rounded-xl ${isLight ? 'bg-slate-100' : 'bg-white/5'} border ${isLight ? '' : 'border-white/10'}`}>
            <span className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-white/60'} w-full flex items-center gap-1`}>
              <Paperclip size={13} />
              <span>Attachments ({attachments.length}):</span>
            </span>
            {attachments.map((att) => (
              <div key={att.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#18181b] border-white/10 text-white'
              }`}>
                <FileText size={13} className="text-blue-500" />
                <span className="truncate max-w-[120px] text-[11px] font-semibold">{att.name}</span>
                <button onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))} className="text-slate-400 hover:text-red-500 cursor-pointer">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Rich Text Editor Body */}
        <div
          className={`relative flex-1 min-h-[180px] w-full rounded-xl border text-xs leading-relaxed focus-within:ring-2 focus-within:ring-blue-500 overflow-y-auto ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#18181b] border-white/10 text-white'
          }`}
          style={{ fontFamily }}
          onClick={() => editor?.chain().focus().run()}
        >
          {editor?.isEmpty && (
            <span className={`absolute top-3 left-3 pointer-events-none select-none ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
              Write email message here... (or drag & drop files)
            </span>
          )}
          <EditorContent
            editor={editor}
            className="h-full p-3 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_a]:text-blue-500 [&_.ProseMirror_a]:underline [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-current/20 [&_.ProseMirror_td]:p-1 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-current/20 [&_.ProseMirror_th]:p-1 [&_.ProseMirror_img]:max-w-full"
          />
        </div>

        {includeSignature && (
          <div className={`px-3 py-1.5 rounded-lg ${isLight ? 'bg-slate-100/60' : 'bg-white/5'} border border-dashed text-[10px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            <span className="font-bold text-blue-500 block">Auto Signature:</span>
            --{'\n'}Best regards, {currentUser?.fullName || 'Vishal Saini'} | Drive OSX Mail Studio
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={`p-3 border-t flex items-center justify-between gap-2 shrink-0 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#212025] border-white/10'
      }`}>
        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'} cursor-pointer flex items-center gap-1`}>
            <Save size={15} />
            <span className="hidden sm:inline">Save Draft</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { setIsComposing(false); resetComposeForm(); if (isCompact) setCompactView('list'); }} className={`px-3 py-1.5 border text-xs font-semibold rounded-lg ${isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'} cursor-pointer`}>
            Discard
          </button>
          <button onClick={handleSendNewCompose} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <Send size={14} />
            <span>Send Email</span>
          </button>
        </div>
      </div>
    </div>
  );

  // RENDER EMAIL READER CONTENT
  const renderEmailReaderContent = () => (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {selectedEmail ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-5 gap-4">
          
          {/* Reader Top Bar */}
          <div className={`flex items-center justify-between gap-2 pb-3 border-b ${isLight ? '' : 'border-white/10'}`}>
            <button
              onClick={handleCloseEmail}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#232227] border-white/10 text-white'
              }`}
            >
              <ArrowLeft size={16} />
              <span className="capitalize">{activeLabel ? activeLabel : activeFolder}</span>
            </button>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={() => handleReply(selectedEmail)} className={`p-1.5 rounded-lg border ${isLight ? 'text-slate-600' : 'text-white/80'} ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'} cursor-pointer`} title="Reply">
                <Reply size={15} />
              </button>
              <button onClick={() => handleReply(selectedEmail, true)} className={`p-1.5 rounded-lg border ${isLight ? 'text-slate-600' : 'text-white/80'} ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'} cursor-pointer`} title="Reply All">
                <ReplyAll size={15} />
              </button>
              <button onClick={() => handleForward(selectedEmail)} className={`p-1.5 rounded-lg border ${isLight ? 'text-slate-600' : 'text-white/80'} ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'} cursor-pointer`} title="Forward">
                <Forward size={15} />
              </button>
              <button onClick={() => handleForwardAsAttachment(selectedEmail)} className={`p-1.5 rounded-lg border ${isLight ? 'text-slate-600' : 'text-white/80'} ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'} cursor-pointer`} title="Forward as Attachment">
                <FileCode size={15} />
              </button>

              <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-white/10'} mx-0.5`} />

              <button onClick={() => setIsCalendarModalOpen(true)} className={`p-1.5 rounded-lg border text-blue-600 ${isLight ? 'hover:bg-blue-50' : 'hover:bg-blue-500/10'} cursor-pointer`} title="Convert to Calendar Event">
                <Calendar size={15} />
              </button>
              <button onClick={() => setIsTaskModalOpen(true)} className={`p-1.5 rounded-lg border text-emerald-600 ${isLight ? 'hover:bg-emerald-50' : 'hover:bg-emerald-500/10'} cursor-pointer`} title="Convert to Task">
                <CheckSquare size={15} />
              </button>
              <button onClick={() => handleShareEmail(selectedEmail)} className={`p-1.5 rounded-lg border ${isLight ? 'text-slate-600' : 'text-white/80'} ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'} cursor-pointer`} title="Share Email Summary">
                <Share2 size={15} />
              </button>

              <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-white/10'} mx-0.5`} />

              <button onClick={() => handleMoveFolder(selectedEmail.id, 'spam')} className={`p-1.5 rounded-lg border text-amber-500 ${isLight ? 'hover:bg-amber-50' : 'hover:bg-amber-500/10'} cursor-pointer`} title="Mark as Spam">
                <ShieldAlert size={15} />
              </button>
              <button onClick={() => handleBlockSender(selectedEmail.senderEmail)} className={`p-1.5 rounded-lg border text-rose-500 ${isLight ? 'hover:bg-rose-50' : 'hover:bg-rose-500/10'} cursor-pointer`} title="Block Sender">
                <Ban size={15} />
              </button>
              <button onClick={() => handleMoveFolder(selectedEmail.id, 'trash')} className={`p-1.5 rounded-lg border text-rose-500 ${isLight ? 'hover:bg-rose-50' : 'hover:bg-rose-500/10'} cursor-pointer`} title="Move to Trash">
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Email Subject */}
          <div className={`flex flex-col gap-1 border-b ${isLight ? '' : 'border-white/10'} pb-2`}>
            <h1 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'} break-words`}>
              {selectedEmail.subject}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedEmail.labels?.map((lbl) => (
                <span key={lbl} className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isLight ? 'bg-blue-100' : 'bg-blue-500/20'} ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                  {lbl}
                </span>
              ))}
              <span className="text-xs text-slate-400">
                {new Date(selectedEmail.dateISO).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Sender Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full font-bold text-white flex items-center justify-center text-xs shadow-xs shrink-0 ${
                selectedEmail.avatarBg || 'bg-blue-600'
              }`}>
                {selectedEmail.senderName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'} truncate`}>
                    {selectedEmail.senderName}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    &lt;{selectedEmail.senderEmail}&gt;
                  </span>
                </div>
                <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-white/60'} truncate`}>
                  To: {selectedEmail.recipientEmail}
                </span>
              </div>
            </div>
          </div>

          {/* Email Body — rich HTML when the sender composed one, sanitized right
              here since this is the point it actually enters the DOM (never trust
              stored email HTML, CLAUDE.md §28). Falls back to the plain-text body
              for messages that never had one (plain compose, inbound SMTP mail). */}
          {selectedEmail.bodyHtml ? (
            <div
              className={`prose ${isLight ? '' : 'prose-invert'} max-w-none text-xs leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'} border-b ${isLight ? '' : 'border-white/10'} pb-4 break-words font-sans [&_a]:text-blue-500 [&_a]:underline [&_table]:border-collapse [&_td]:border [&_td]:border-current/20 [&_td]:p-1 [&_th]:border [&_th]:border-current/20 [&_th]:p-1 [&_img]:max-w-full`}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.bodyHtml) }}
            />
          ) : (
            <div className={`prose ${isLight ? '' : 'prose-invert'} max-w-none text-xs leading-relaxed whitespace-pre-wrap ${isLight ? 'text-slate-800' : 'text-slate-200'} border-b ${isLight ? '' : 'border-white/10'} pb-4 break-words font-sans`}>
              {selectedEmail.body}
            </div>
          )}

          {/* Attachments list with preview modal launcher */}
          {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
            <div className={`flex flex-col gap-2 border-b ${isLight ? '' : 'border-white/10'} pb-4`}>
              <span className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-white/60'} flex items-center gap-1.5`}>
                <Paperclip size={14} />
                <span>Attachments ({selectedEmail.attachments.length})</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedEmail.attachments.map((att) => (
                  <div
                    key={att.id}
                    onClick={() => setPreviewAttachment(att)}
                    className={`p-2 rounded-xl border flex items-center gap-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                      isLight ? 'bg-slate-50 hover:bg-blue-50 border-slate-200' : 'bg-[#232227] hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <FileText size={18} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-bold text-[11px] max-w-[140px]">{att.name}</span>
                      <span className="text-[9px] text-slate-400">{att.size} • Click to preview</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Reply Box */}
          <div className={`p-3 rounded-2xl border flex flex-col gap-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#212025] border-white/10'
          }`}>
            <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-white/80'} flex items-center gap-1.5`}>
              <CornerUpLeft size={14} />
              <span>Quick Reply to {selectedEmail.senderName}</span>
            </span>
            <textarea
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              placeholder="Write quick reply..."
              rows={2}
              className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#18181b] border-white/15 text-white'
              }`}
            />
            <button
              onClick={handleSendQuickReply}
              className="self-end px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Send size={13} />
              <span>Send Reply</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-8">
          <Mail size={48} strokeWidth={1.2} className="opacity-30" />
          <span className="text-sm font-semibold">Select an email to view details</span>
        </div>
      )}
    </div>
  );

  return (
    <AppShell
      ref={containerRef}
      className={`${isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#18181b] text-white/90'}`}
    >
      {/* System Toast Notification */}
      {toastMessage && (
        <div className="absolute top-3 right-3 z-50 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================== TOP APPLICATION TOOLBAR ==================== */}
      <div
        className={`h-11 px-3 border-b shrink-0 flex items-center justify-between gap-2 z-20 select-none ${
          isLight ? 'bg-[#ebebee] border-slate-300/80 text-slate-700' : 'bg-[#26252a] border-white/10 text-white/90'
        }`}
      >
        {/* Left: Sidebar toggle, New Mail button, Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isSidebarOpen
                ? isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/20 text-white'
                : isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/70'
            }`}
            title="Toggle Sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          
          <button
            onClick={handleStartCompose}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>New Mail</span>
          </button>

          <button
            onClick={loadEmails}
            disabled={isLoadingEmails}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/70'
            }`}
            title="Refresh Inbox"
          >
            <RefreshCw size={14} className={isLoadingEmails ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Center: Search & Filter Pills */}
        <div className="flex-1 max-w-md mx-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" size={13} />
            <input
              type="text"
              placeholder="Search mails, senders, subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-7 py-1 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-blue-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-black/30 border-white/15 text-white'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div
            className={`hidden sm:flex items-center p-0.5 rounded-lg border ${
              isLight ? 'bg-slate-200/70 border-slate-300/60' : 'bg-black/30 border-white/10'
            }`}
          >
            {(['all', 'unread', 'starred', 'attachments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                  filterTab === tab
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'bg-white/20 text-white'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Modals / Management Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsContactsModalOpen(true)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 px-2 text-xs font-medium ${
              isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-white/80'
            }`}
            title="Contacts"
          >
            <User size={14} />
            <span className="hidden md:inline">Contacts</span>
          </button>

          <button
            onClick={() => setIsRulesModalOpen(true)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 px-2 text-xs font-medium ${
              isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-white/80'
            }`}
            title="Email Rules & Filters"
          >
            <Filter size={14} />
            <span className="hidden md:inline">Rules</span>
          </button>

          <button
            onClick={() => setIsCustomFolderModalOpen(true)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 px-2 text-xs font-medium ${
              isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-white/80'
            }`}
            title="New Folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className={`flex-1 flex min-h-0 divide-x ${isLight ? 'divide-slate-200/80' : 'divide-white/10'} overflow-hidden relative`}>
        
        {/* COMPACT MODE */}
        {isCompact ? (
          <div className="flex-1 flex flex-col min-h-0 w-full">
            {compactView === 'sidebar' && (
              <div className={`w-full h-full ${isLight ? 'bg-slate-50' : 'bg-[#1a191e]'}`}>
                {renderSidebarContent()}
              </div>
            )}
            {compactView === 'list' && !isComposing && (
              <div className={`w-full h-full ${isLight ? 'bg-white' : 'bg-[#1c1c20]'}`}>
                {renderEmailListContent()}
              </div>
            )}
            {(compactView === 'reader' || isComposing) && compactView !== 'sidebar' && (
              <div className={`w-full h-full ${isLight ? 'bg-white' : 'bg-[#18181b]'}`}>
                {isComposing ? renderComposeContent() : renderEmailReaderContent()}
              </div>
            )}
          </div>
        ) : (
          /* DESKTOP / MEDIUM MODE */
          <>
            {isSidebarOpen && (
              <div className={`w-52 sm:w-56 shrink-0 flex flex-col overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-[#1a191e]'}`}>
                {renderSidebarContent()}
              </div>
            )}

            {containerWidth < 800 ? (
              isComposing ? (
                <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${isLight ? 'bg-white' : 'bg-[#18181b]'}`}>
                  {renderComposeContent()}
                </div>
              ) : selectedEmailId ? (
                <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${isLight ? 'bg-white' : 'bg-[#18181b]'}`}>
                  {renderEmailReaderContent()}
                </div>
              ) : (
                <div className={`flex-1 flex flex-col min-h-0 ${isLight ? 'bg-white' : 'bg-[#1c1c20]'}`}>
                  {renderEmailListContent()}
                </div>
              )
            ) : (
              <>
                <div className={`w-60 md:w-72 lg:w-80 shrink-0 flex flex-col min-h-0 ${isLight ? 'bg-white' : 'bg-[#1c1c20]'}`}>
                  {renderEmailListContent()}
                </div>

                <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${isLight ? 'bg-white' : 'bg-[#18181b]'}`}>
                  {isComposing ? renderComposeContent() : renderEmailReaderContent()}
                </div>
              </>
            )}
          </>
        )}

      </div>

      {/* Integrated Modals */}
      <DrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onSelectFile={(attachment) => {
          setAttachments((prev) => [...prev, attachment]);
          showToast(`Attached ${attachment.name} from DriveOSX`);
        }}
        isLight={isLight}
      />

      <PreviewAttachmentModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        isLight={isLight}
      />

      <CalendarEventModal
        email={selectedEmail}
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        isLight={isLight}
      />

      <TaskModal
        email={selectedEmail}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        isLight={isLight}
      />

      <RulesModal
        rules={rules}
        onUpdateRules={setRules}
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        isLight={isLight}
      />

      <ContactsModal
        contacts={contacts}
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        onSelectContact={(c) => {
          if (contactTargetField === 'to') setComposeTo(c.email);
          else if (contactTargetField === 'cc') setComposeCc((prev) => prev ? `${prev}, ${c.email}` : c.email);
          else if (contactTargetField === 'bcc') setComposeBcc((prev) => prev ? `${prev}, ${c.email}` : c.email);
          showToast(`Added contact ${c.name}`);
        }}
        isLight={isLight}
      />

      <CustomFolderModal
        isOpen={isCustomFolderModalOpen}
        onClose={() => setIsCustomFolderModalOpen(false)}
        onCreateFolder={(newFolder) => {
          setCustomFolders((prev) => [...prev, newFolder]);
          showToast(`Created folder "${newFolder.name}"`);
        }}
        isLight={isLight}
      />

    </AppShell>
  );
}

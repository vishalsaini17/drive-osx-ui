import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Plus,
  Trash2,
  FolderPlus,
  Search,
  Grid,
  List,
  Copy,
  Scissors,
  Clipboard,
  Edit3,
  Info,
  ChevronRight,
  HardDrive,
  RefreshCw,
  X,
  Image,
  FileText,
  FileCode,
  Check,
  Upload,
  FileUp
} from 'lucide-react';
import { FileItem } from '../../types';
import { useSystemStore } from '../../systemStore';

export default function FileManager() {
  // Central store integration
  const files = useSystemStore((state) => state.files);
  const setFiles = useSystemStore((state) => state.setFiles);
  const openTextFileInEditor = useSystemStore((state) => state.openTextFileInEditor);
  const handleDeleteFile = useSystemStore((state) => state.handleDeleteFile);
  const toggleWindow = useSystemStore((state) => state.toggleWindow);
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);

  const activeTheme = settings.theme || 'classic-light';

  // State Management
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showDetailsPane, setShowDetailsPane] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Custom navigation history (back/forward list)
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Sorting
  const [sortField, setSortField] = useState<'name' | 'type' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Address Bar path editing
  const [isPathEditing, setIsPathEditing] = useState<boolean>(false);
  const [pathInputText, setPathInputText] = useState<string>('');

  // Clipboard operations (Cut / Copy / Paste)
  const [clipboard, setClipboard] = useState<{ id: string; action: 'copy' | 'cut' } | null>(null);

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState<string>('');

  // Right-click Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    targetItem: FileItem | null; // null represents empty space click
  }>({ x: 0, y: 0, visible: false, targetItem: null });

  // Refs
  const renameInputRef = useRef<HTMLInputElement>(null);
  const pathInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const explorerAreaRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [explorerWidth, setExplorerWidth] = useState<number>(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!explorerAreaRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setExplorerWidth(entry.contentRect.width);
      }
    });
    observer.observe(explorerAreaRef.current);
    return () => observer.disconnect();
  }, []);

  const isCompactSidebar = containerWidth < 480;
  const isCompactRibbon = containerWidth < 640;

  useEffect(() => {
    if (containerWidth < 600) {
      setShowDetailsPane(false);
    }
  }, [containerWidth]);

  const getGridCols = () => {
    if (explorerWidth < 160) return 1;
    if (explorerWidth < 260) return 2;
    if (explorerWidth < 380) return 3;
    if (explorerWidth < 500) return 4;
    if (explorerWidth < 650) return 5;
    if (explorerWidth < 800) return 6;
    return 7;
  };

  // Selected item entity
  const selectedItem = files.find((f) => f.id === selectedFileId) || null;

  // Auto-focus renaming input when triggered
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Navigate to folder and record history
  const navigateToFolder = (folderId: string | null) => {
    // Truncate forward history if we are in the middle of history stack
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, folderId]);
    setHistoryIndex(newHistory.length);
    setCurrentFolderId(folderId);
    setSelectedFileId(null);
    setIsPathEditing(false);
  };

  // Back history navigation
  const handleGoBack = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setCurrentFolderId(history[nextIndex]);
      setSelectedFileId(null);
      setIsPathEditing(false);
    }
  };

  // Forward history navigation
  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentFolderId(history[nextIndex]);
      setSelectedFileId(null);
      setIsPathEditing(false);
    }
  };

  // Go to parent directory
  const handleGoUp = () => {
    if (currentFolderId === null) return;
    const currentFolder = files.find((f) => f.id === currentFolderId);
    if (currentFolder) {
      navigateToFolder(currentFolder.parentId);
    } else {
      navigateToFolder(null);
    }
  };

  // Address Bar path manual input execution
  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPathEditing(false);

    const cleanInput = pathInputText.trim().toLowerCase();
    if (!cleanInput || cleanInput === 'this pc' || cleanInput === '/' || cleanInput === 'my drive' || cleanInput === 'drive') {
      navigateToFolder(null);
      return;
    }

    const pathPart = cleanInput.startsWith('/') ? cleanInput.substring(1) : cleanInput;
    const parts = pathPart.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];

    if (!lastPart) {
      navigateToFolder(null);
      return;
    }

    // Match typed folder name
    const matchedFolder = files.find(
      (f) => f.type === 'folder' && f.name.toLowerCase() === lastPart
    );
    if (matchedFolder) {
      navigateToFolder(matchedFolder.id);
    } else {
      alert(`Could not find path: "${pathInputText}"`);
    }
  };

  // Trigger manual edit address bar
  const startPathEditing = () => {
    setIsPathEditing(true);
    setPathInputText(getCurrentFolderPathString());
    setTimeout(() => {
      pathInputRef.current?.focus();
      pathInputRef.current?.select();
    }, 50);
  };

  // Helper: Get human-readable path string
  const getCurrentFolderPathString = () => {
    if (!currentFolderId) return '/';
    const pathSegments: string[] = [];
    let current = files.find((f) => f.id === currentFolderId);
    while (current) {
      pathSegments.unshift(current.name);
      current = files.find((f) => f.id === current.parentId);
    }
    return `/${pathSegments.join('/')}`;
  };

  // Helper: Get Breadcrumb Array
  const getBreadcrumbs = () => {
    const breadcrumbs: { name: string; id: string | null }[] = [{ name: '/', id: null }];
    if (!currentFolderId) return breadcrumbs;

    const segments: { name: string; id: string }[] = [];
    let current = files.find((f) => f.id === currentFolderId);
    while (current) {
      segments.unshift({ name: current.name, id: current.id });
      current = files.find((f) => f.id === current.parentId);
    }
    return [...breadcrumbs, ...segments];
  };

  // Helper: Render Windows 11 style Vector Icon
  const renderFileIcon = (item: FileItem, size: 'large' | 'small' | 'xl' = 'large') => {
    const isImage = item.name.endsWith('.png') || item.name.endsWith('.jpg') || item.name.endsWith('.jpeg');
    const isLog = item.name.endsWith('.log');
    
    const dim = size === 'xl' ? 'w-20 h-20' : size === 'large' ? 'w-12 h-12' : 'w-5 h-5';
    const rounded = size === 'xl' ? 'rounded-xl' : size === 'large' ? 'rounded-lg' : 'rounded';

    // For images, if they have content, we can show a nice mini-thumbnail preview
    if (isImage && item.content && (item.content.startsWith('data:image/') || item.content.startsWith('http'))) {
      return (
        <img
          src={item.content}
          alt={item.name}
          className={`${dim} ${rounded} object-cover border border-black/10 shadow-sm`}
          referrerPolicy="no-referrer"
        />
      );
    }

    if (item.type === 'folder') {
      return (
        <svg viewBox="0 0 48 48" className={dim} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 10C4 7.79 5.79 6 8 6H18.59C19.65 6 20.66 6.42 21.41 7.17L24.83 10.59C25.58 11.34 26.6 11.76 27.66 11.76H40C42.21 11.76 44 13.57 44 15.76V38C44 40.21 42.21 42 40 42H8C5.79 42 4 40.21 4 38V10Z" fill="url(#folder_back_grad_grid)" />
          <rect x="10" y="12" width="28" height="18" rx="2" fill="white" opacity="0.85" />
          <rect x="14" y="16" width="20" height="2" rx="1" fill="#0078d4" opacity="0.4" />
          <rect x="14" y="21" width="14" height="2" rx="1" fill="#0078d4" opacity="0.4" />
          <path d="M4 16C4 13.79 5.79 12 8 12H19.5C20.25 12 21 12.4 21.5 13L24.5 16.5C25 17.1 25.75 17.5 26.5 17.5H40C42.21 17.5 44 19.31 44 21.5V38C44 40.21 42.21 42 40 42H8C5.79 42 4 40.21 4 38V16Z" fill="url(#folder_front_grad_grid)" />
          <path d="M8 13H19.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
          <defs>
            <linearGradient id="folder_back_grad_grid" x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="100%" stopColor="#FFA000" />
            </linearGradient>
            <linearGradient id="folder_front_grad_grid" x1="4" y1="12" x2="44" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFCA28" />
              <stop offset="100%" stopColor="#FF8F00" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    if (isImage) {
      return (
        <svg viewBox="0 0 48 48" className={dim} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="32" height="36" rx="4" fill="url(#image_bg_grad_grid)" />
          <path d="M8 32L18 22L28 32" fill="#E0F2FE" opacity="0.4" />
          <path d="M22 30L30 22L40 32" fill="#E0F2FE" opacity="0.5" />
          <circle cx="18" cy="16" r="3.5" fill="#FFF" opacity="0.95" />
          <path d="M8 6H30L40 16V42H8V6Z" fill="url(#image_front_grad_grid)" />
          <defs>
            <linearGradient id="image_bg_grad_grid" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="image_front_grad_grid" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0369A1" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    if (isLog) {
      return (
        <svg viewBox="0 0 48 48" className={dim} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="32" height="36" rx="4" fill="url(#sys_bg_grad_grid)" />
          <path d="M24 16C22.34 16 21 17.34 21 19C21 19.34 21.06 19.67 21.17 19.97L19.43 20.97C19.14 20.66 18.72 20.47 18.25 20.47C17.28 20.47 16.5 21.25 16.5 22.22C16.5 22.62 16.64 22.98 16.87 23.27L15.13 24.27C14.83 23.96 14.41 23.77 13.94 23.77C12.97 23.77 12.19 24.55 12.19 25.52C12.19 26.49 12.97 27.27 13.94 27.27C14.41 27.27 14.83 27.08 15.13 26.77L16.87 27.77C16.64 28.06 16.5 28.42 16.5 28.82C16.5 29.79 17.28 30.57 18.25 30.57C18.72 30.57 19.14 30.38 19.43 30.07L21.17 31.07C21.06 31.37 21 31.7 21 32.04C21 33.7 22.34 35.04 24 35.04C25.66 35.04 27 33.7 27 32.04C27 31.7 26.94 31.37 26.83 31.07L28.57 30.07C28.86 30.38 29.28 30.57 29.75 30.57C30.72 30.57 31.5 29.79 31.5 28.82C31.5 28.42 31.36 28.06 31.13 27.77L32.87 26.77C33.17 27.08 33.59 27.27 34.06 27.27C35.03 27.27 35.81 26.49 35.81 25.52C35.81 24.55 35.03 23.77 34.06 23.77C33.59 23.77 33.17 23.96 32.87 24.27L31.13 23.27C31.36 22.98 31.5 22.62 31.5 22.22C31.5 21.25 30.72 20.47 29.75 20.47C29.28 20.47 28.86 20.66 28.57 20.97L26.83 19.97C26.94 19.67 27 19.34 27 19C27 17.34 25.66 16 24 16ZM24 22C25.66 22 27 23.34 27 25C27 26.66 25.66 28 24 28C22.34 28 21 26.66 21 25C21 23.34 22.34 22 24 22Z" fill="white" opacity="0.95" />
          <defs>
            <linearGradient id="sys_bg_grad_grid" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4B5563" />
              <stop offset="100%" stopColor="#1F2937" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    // Default Notepad File
    return (
      <svg viewBox="0 0 48 48" className={dim} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="6" width="32" height="36" rx="4" fill="url(#text_bg_grad_grid)" />
        <rect x="14" y="14" width="20" height="2" rx="1" fill="white" opacity="0.9" />
        <rect x="14" y="20" width="20" height="2" rx="1" fill="white" opacity="0.9" />
        <rect x="14" y="26" width="14" height="2" rx="1" fill="white" opacity="0.6" />
        <defs>
          <linearGradient id="text_bg_grad_grid" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  // Real Local File Upload Trigger
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Real Local File Upload Execution
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesSelected = e.target.files;
    if (!filesSelected || filesSelected.length === 0) return;

    let updatedFilesList = [...files];

    Array.from(filesSelected).forEach((f: any) => {
      const reader = new FileReader();
      const isImage = f.type.startsWith('image/');

      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';

        // Prevent duplicate names in same folder
        let fileName = f.name;
        let count = 1;
        while (updatedFilesList.some((item) => item.parentId === currentFolderId && item.name === fileName)) {
          const dotIndex = f.name.lastIndexOf('.');
          if (dotIndex !== -1) {
            const base = f.name.substring(0, dotIndex);
            const ext = f.name.substring(dotIndex);
            fileName = `${base} (${count++})${ext}`;
          } else {
            fileName = `${f.name} (${count++})`;
          }
        }

        const uploadedFile: FileItem = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: fileName,
          type: 'file',
          content: content,
          parentId: currentFolderId,
          createdAt: new Date().toLocaleDateString(),
        };

        updatedFilesList = [...updatedFilesList, uploadedFile];
        setFiles(updatedFilesList);
      };

      if (isImage) {
        reader.readAsDataURL(f);
      } else {
        reader.readAsText(f);
      }
    });

    e.target.value = ''; // Reset input selection
  };

  // Helper: Get file size
  const getItemSizeString = (item: FileItem): string => {
    if (item.type === 'folder') {
      const childrenCount = files.filter((f) => f.parentId === item.id).length;
      return `${childrenCount} item${childrenCount === 1 ? '' : 's'}`;
    }
    if (item.content) {
      const bytes = item.content.length;
      if (bytes < 1024) return `${bytes} B`;
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return '0 B';
  };

  // Helper: Get file extension/type string
  const getItemTypeString = (item: FileItem): string => {
    if (item.type === 'folder') return 'File Folder';
    if (item.name.endsWith('.txt')) return 'Text Document';
    if (item.name.endsWith('.png') || item.name.endsWith('.jpg') || item.name.endsWith('.jpeg')) {
      return 'JPEG Image';
    }
    if (item.name.endsWith('.log')) return 'Log File';
    return 'System File';
  };

  // Create new folder
  const handleCreateFolder = () => {
    const name = prompt('Enter name of new folder:', 'New Folder');
    if (!name) return;

    // Prevent duplicate naming in same folder
    let folderName = name;
    let count = 1;
    while (files.some((f) => f.parentId === currentFolderId && f.name === folderName)) {
      folderName = `${name} (${count++})`;
    }

    const newFolder: FileItem = {
      id: `folder-${Date.now()}`,
      name: folderName,
      type: 'folder',
      parentId: currentFolderId,
      createdAt: new Date().toLocaleDateString(),
    };

    setFiles((prev) => [...prev, newFolder]);
  };

  // Create new text file
  const handleCreateFile = () => {
    const name = prompt('Enter name of new text file:', 'notes.txt');
    if (!name) return;

    const cleanName = name.endsWith('.txt') ? name : `${name}.txt`;
    let fileName = cleanName;
    let count = 1;
    while (files.some((f) => f.parentId === currentFolderId && f.name === fileName)) {
      const base = cleanName.substring(0, cleanName.lastIndexOf('.'));
      fileName = `${base} (${count++}).txt`;
    }

    const newFile: FileItem = {
      id: `file-${Date.now()}`,
      name: fileName,
      type: 'file',
      content: 'This is a newly created text document.',
      parentId: currentFolderId,
      createdAt: new Date().toLocaleDateString(),
    };

    setFiles((prev) => [...prev, newFile]);
  };

  // Clipboard commands
  const handleCopy = (item: FileItem) => {
    setClipboard({ id: item.id, action: 'copy' });
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleCut = (item: FileItem) => {
    setClipboard({ id: item.id, action: 'cut' });
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Paste Logic
  const handlePaste = () => {
    if (!clipboard) return;
    const sourceItem = files.find((f) => f.id === clipboard.id);
    if (!sourceItem) {
      setClipboard(null);
      return;
    }

    if (clipboard.action === 'cut') {
      // Prevent nesting a folder inside itself
      if (sourceItem.type === 'folder' && currentFolderId !== null) {
        let parent = files.find((f) => f.id === currentFolderId);
        let isInvalid = false;
        while (parent) {
          if (parent.id === sourceItem.id) {
            isInvalid = true;
            break;
          }
          parent = files.find((f) => f.id === parent?.parentId);
        }
        if (isInvalid || currentFolderId === sourceItem.id) {
          alert('Cannot paste a folder inside itself or its child folders.');
          return;
        }
      }

      // Move file/folder parentId
      const updatedFiles = files.map((f) =>
        f.id === sourceItem.id ? { ...f, parentId: currentFolderId } : f
      );
      setFiles(updatedFiles);
      setClipboard(null); // Clear cut from clipboard
    } else {
      // COPY: Duplicate items
      if (sourceItem.type === 'file') {
        const baseName = sourceItem.name.substring(0, sourceItem.name.lastIndexOf('.'));
        const ext = sourceItem.name.substring(sourceItem.name.lastIndexOf('.'));
        let newName = `${baseName} - Copy${ext}`;
        let count = 1;
        while (files.some((f) => f.parentId === currentFolderId && f.name === newName)) {
          newName = `${baseName} - Copy (${count++})${ext}`;
        }

        const newFile: FileItem = {
          ...sourceItem,
          id: `file-${Date.now()}`,
          name: newName,
          parentId: currentFolderId,
          createdAt: new Date().toLocaleDateString(),
        };
        setFiles((prev) => [...prev, newFile]);
      } else {
        // Folder duplication with children recursively!
        const itemsToInsert = duplicateFolderRecursive(sourceItem, currentFolderId);
        setFiles((prev) => [...prev, ...itemsToInsert]);
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Helper: Recursive folder duplication
  const duplicateFolderRecursive = (folderToCopy: FileItem, targetParentId: string | null): FileItem[] => {
    let baseName = `${folderToCopy.name} - Copy`;
    let count = 1;
    while (files.some((f) => f.parentId === targetParentId && f.name === baseName)) {
      baseName = `${folderToCopy.name} - Copy (${count++})`;
    }

    const newFolderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newFolder: FileItem = {
      ...folderToCopy,
      id: newFolderId,
      name: baseName,
      parentId: targetParentId,
      createdAt: new Date().toLocaleDateString(),
    };

    const accumulated: FileItem[] = [newFolder];

    const copyChildrenOf = (oldParentId: string, newParentId: string) => {
      const children = files.filter((f) => f.parentId === oldParentId);
      children.forEach((child) => {
        const newChildId = `${child.type}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const newChild: FileItem = {
          ...child,
          id: newChildId,
          parentId: newParentId,
          createdAt: new Date().toLocaleDateString(),
        };
        accumulated.push(newChild);
        if (child.type === 'folder') {
          copyChildrenOf(child.id, newChildId);
        }
      });
    };

    copyChildrenOf(folderToCopy.id, newFolderId);
    return accumulated;
  };

  // Trigger inline Rename
  const handleStartRename = (item: FileItem) => {
    setRenamingId(item.id);
    setRenameText(item.name);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Save rename operation
  const handleSaveRename = () => {
    if (!renamingId) return;
    const cleanName = renameText.trim();
    if (!cleanName) {
      setRenamingId(null);
      return;
    }

    // Check duplicate names in same folder
    const hasDuplicate = files.some(
      (f) => f.parentId === currentFolderId && f.name === cleanName && f.id !== renamingId
    );
    if (hasDuplicate) {
      alert(`A file or folder with the name "${cleanName}" already exists in this folder.`);
      return;
    }

    const updatedFiles = files.map((f) =>
      f.id === renamingId ? { ...f, name: cleanName } : f
    );
    setFiles(updatedFiles);
    setRenamingId(null);
  };

  // Delete file/folder
  const handleDeleteItem = (item: FileItem) => {
    if (!confirm(`Are you sure you want to move "${item.name}" to the Recycle Bin?`)) return;
    handleDeleteFile(item);
    if (selectedFileId === item.id) {
      setSelectedFileId(null);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Left Sidebar Locations Trigger
  const handleSidebarClick = (locId: string | null) => {
    if (locId === 'trash') {
      toggleWindow('trash');
    } else {
      navigateToFolder(locId);
    }
  };

  // Double Click execution
  const handleItemDoubleClick = (item: FileItem) => {
    if (item.type === 'folder') {
      navigateToFolder(item.id);
    } else {
      if (item.name.endsWith('.txt')) {
        openTextFileInEditor(item.id, item.name, item.content || '');
      } else if (
        item.name.endsWith('.png') ||
        item.name.endsWith('.jpg') ||
        item.name.endsWith('.jpeg')
      ) {
        // Image Viewer
        if (item.id === 'file-wallpaper') {
          setPreviewImage(
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=85'
          );
        } else {
          setPreviewImage(item.content || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&auto=format&fit=crop&q=85');
        }
      }
    }
  };

  // Apply Image as Desktop Wallpaper action
  const handleApplyWallpaper = (item: FileItem) => {
    const wallUrl =
      item.id === 'file-wallpaper'
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600'
        : item.content || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600';

    setSettings((prev) => ({
      ...prev,
      wallpaper: 'custom',
      customWallpaperUrl: wallUrl,
    }));
    alert('🎨 Desktop Wallpaper successfully updated!');
  };

  // Context Menu Show
  const handleContextMenu = (e: React.MouseEvent, item: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();

    // Select this item automatically
    if (item) {
      setSelectedFileId(item.id);
    } else {
      setSelectedFileId(null);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setContextMenu({
      x,
      y,
      visible: true,
      targetItem: item,
    });
  };

  // Click-away to close Context Menu
  useEffect(() => {
    const closeMenu = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [contextMenu.visible]);

  // Read Current directory items and apply search query + sort
  const currentItems = files.filter((f) => f.parentId === currentFolderId);
  const filteredItems = currentItems.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting calculation
  const sortedItems = [...filteredItems].sort((a, b) => {
    // Folders always sorted to the top like Windows Explorer!
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    let valA: any = a.name.toLowerCase();
    let valB: any = b.name.toLowerCase();

    if (sortField === 'type') {
      valA = getItemTypeString(a);
      valB = getItemTypeString(b);
    } else if (sortField === 'date') {
      valA = a.createdAt;
      valB = b.createdAt;
    } else if (sortField === 'size') {
      if (a.type === 'folder') {
        const countA = files.filter((f) => f.parentId === a.id).length;
        const countB = files.filter((f) => f.parentId === b.id).length;
        valA = countA;
        valB = countB;
      } else {
        valA = a.content ? a.content.length : 0;
        valB = b.content ? b.content.length : 0;
      }
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Theme styles styling mappings
  const themeStyles = {
    'classic-light': {
      container: 'text-[#211625] bg-[#FAF8FC]',
      sidebar: 'bg-[#F2EDF7] border-r border-[#E2D9EB]',
      sidebarHeader: 'text-[10px] uppercase font-bold text-[#6D5D73] px-3 py-1 mb-2',
      sidebarBtn: 'text-[#4D3F53] hover:bg-[#EAE1F3]/80 hover:text-black',
      sidebarBtnActive: 'bg-[#E5D7F2] text-[#6324A3] font-semibold',
      toolbar: 'bg-[#FAF8FC] border-b border-[#E2D9EB] select-none shrink-0',
      ribbonBtn: 'text-xs text-[#4D3F53] hover:bg-[#FAF8FC] hover:text-black border-r border-[#E2D9EB]/50 disabled:opacity-35',
      addressBar: 'bg-white border border-[#DDD3E8] rounded-md text-xs text-[#211625] shadow-inner',
      gridCard: 'bg-white border-[#E5DBEE] hover:bg-[#FDFBFE] hover:shadow-sm text-[#211625]',
      gridCardSelected: 'bg-[#F1E8F9] border-[#C2A3DF] text-[#6324A3] shadow-inner',
      listHeader: 'bg-[#FAF8FC] border-b border-[#E2D9EB] text-[#55475A] font-bold text-xs',
      listRow: 'border-b border-[#EDE8F3] hover:bg-[#F3EEF8]',
      listRowSelected: 'bg-[#FAF8FC] hover:bg-[#FAF8FC] border-l-4 border-l-purple-500',
      rightPane: 'bg-[#F4EDFA] border-l border-[#E2D9EB] text-[#211625]',
      rightPaneHeader: 'border-b border-[#E2D9EB] bg-[#FAF8FC]',
      statusBar: 'bg-[#FAF8FC] border-t border-[#E2D9EB] text-[#6D5D73]',
    },
    'modern-dark': {
      container: 'text-white bg-zinc-950/90',
      sidebar: 'bg-zinc-900/50 border-r border-white/5',
      sidebarHeader: 'text-[10px] uppercase font-bold text-white/30 px-3 py-1 mb-2',
      sidebarBtn: 'text-white/70 hover:bg-white/5 hover:text-white',
      sidebarBtnActive: 'bg-white/10 text-[#EC4899] font-semibold border-l-2 border-l-[#EC4899]',
      toolbar: 'bg-zinc-900/60 border-b border-white/5 select-none shrink-0',
      ribbonBtn: 'text-xs text-white/70 hover:bg-white/5 hover:text-white border-r border-white/5 disabled:opacity-35',
      addressBar: 'bg-zinc-950 border border-white/10 rounded-md text-xs text-white shadow-inner',
      gridCard: 'bg-white/5 border-white/5 hover:bg-white/10 hover:shadow-lg text-white',
      gridCardSelected: 'bg-[#EC4899]/10 border-[#EC4899]/40 text-[#EC4899] shadow-inner',
      listHeader: 'bg-zinc-900 border-b border-white/10 text-white/60 font-bold text-xs',
      listRow: 'border-b border-white/5 hover:bg-white/5',
      listRowSelected: 'bg-zinc-900 hover:bg-zinc-900 border-l-4 border-l-[#EC4899]',
      rightPane: 'bg-zinc-900/70 border-l border-white/5 text-white',
      rightPaneHeader: 'border-b border-white/5 bg-zinc-950',
      statusBar: 'bg-zinc-950 border-t border-white/5 text-white/40',
    },
    'retro-terminal': {
      container: 'text-[#22c55e] bg-black font-mono',
      sidebar: 'bg-black border-r border-[#22c55e]/20',
      sidebarHeader: 'text-[10px] uppercase font-bold text-[#22c55e]/50 px-3 py-1 mb-2',
      sidebarBtn: 'text-[#22c55e]/80 hover:bg-[#22c55e]/10 hover:text-white',
      sidebarBtnActive: 'bg-[#22c55e]/20 text-[#22c55e] font-semibold border-l-2 border-l-[#22c55e]',
      toolbar: 'bg-black border-b border-[#22c55e]/20 select-none shrink-0',
      ribbonBtn: 'text-xs text-[#22c55e]/80 hover:bg-[#22c55e]/10 border-r border-[#22c55e]/10 disabled:opacity-35',
      addressBar: 'bg-black border border-[#22c55e]/40 rounded-md text-xs text-[#22c55e] shadow-inner',
      gridCard: 'bg-black border-[#22c55e]/20 hover:bg-[#22c55e]/5 text-[#22c55e]',
      gridCardSelected: 'bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-inner',
      listHeader: 'bg-black border-b border-[#22c55e]/40 text-[#22c55e]/70 font-bold text-xs',
      listRow: 'border-b border-[#22c55e]/10 hover:bg-[#22c55e]/5',
      listRowSelected: 'bg-[#22c55e]/10 hover:bg-[#22c55e]/15 border-l-4 border-l-[#22c55e]',
      rightPane: 'bg-black border-l border-[#22c55e]/20 text-[#22c55e]',
      rightPaneHeader: 'border-b border-[#22c55e]/20 bg-black',
      statusBar: 'bg-black border-t border-[#22c55e]/20 text-[#22c55e]/60',
    },
  };

  const ts = themeStyles[activeTheme] || themeStyles['classic-light'];

  // Total word/character/line count helper
  const getTextStats = (text: string) => {
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lines = text.split('\n').length;
    return { chars, words, lines };
  };

  return (
    <div ref={containerRef} className={`h-full flex flex-col text-sm select-none ${ts.container}`}>
      {/* ==================== 1. TOP NAV & TOOLBAR RIBBON ==================== */}
      <div className={`${ts.toolbar} flex flex-col shrink-0`}>
        {/* Navigation Row: Back, Forward, Up, Refresh, Editable Address Bar, Search Bar */}
        <div className="flex items-center gap-1.5 p-2 px-3">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleGoBack}
              disabled={historyIndex === 0}
              className="p-1.5 rounded-md hover:bg-black/5 disabled:opacity-35 cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={historyIndex === history.length - 1}
              className="p-1.5 rounded-md hover:bg-black/5 disabled:opacity-35 cursor-pointer"
              title="Go Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoUp}
              disabled={currentFolderId === null}
              className="p-1.5 rounded-md hover:bg-black/5 disabled:opacity-35 cursor-pointer"
              title="Go Up"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                // Flash Refresh feedback
                setSearchQuery('');
                setSelectedFileId(null);
              }}
              className="p-1.5 rounded-md hover:bg-black/5 cursor-pointer"
              title="Refresh Folder"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Address Bar / Path bar */}
          <div className="flex-1 min-w-[120px] relative">
            {isPathEditing ? (
              <form onSubmit={handlePathSubmit} className="w-full h-8">
                <input
                  ref={pathInputRef}
                  type="text"
                  value={pathInputText}
                  onChange={(e) => setPathInputText(e.target.value)}
                  onBlur={() => setTimeout(() => setIsPathEditing(false), 200)}
                  className={`w-full h-full px-3 outline-none focus:ring-1 focus:ring-purple-500/50 ${ts.addressBar}`}
                />
              </form>
            ) : (
              <div
                onClick={startPathEditing}
                className={`w-full h-8 flex items-center px-2 cursor-text overflow-hidden ${ts.addressBar}`}
              >
                <div className="flex items-center gap-1 text-[11px] font-medium truncate">
                  {getBreadcrumbs().map((bc, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToFolder(bc.id);
                        }}
                        className="hover:underline hover:text-purple-600 cursor-pointer px-1 shrink-0"
                      >
                        {bc.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className={`${containerWidth < 500 ? 'w-28' : 'w-48'} relative transition-all shrink-0`}>
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50 text-gray-500" />
            <input
              type="text"
              placeholder={containerWidth < 500 ? "Search..." : "Search current folder..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 outline-none text-xs rounded-md bg-black/5 hover:bg-black/10 focus:bg-white focus:ring-1 focus:ring-purple-500/50 border border-transparent focus:border-purple-300 placeholder:opacity-60 text-current"
            />
          </div>
        </div>

        {/* Windows-style Menu Ribbon Line: New, Cut, Copy, Paste, Rename, Delete, View Toggle, Upload */}
        <div className="flex items-center justify-between border-t border-black/5 bg-black/5 py-1 px-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* New creation split buttons */}
            <button
              onClick={handleCreateFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded hover:bg-white/35 active:scale-95 transition-all cursor-pointer"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {!isCompactRibbon && <span>New Folder</span>}
            </button>
            <button
              onClick={handleCreateFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded hover:bg-white/35 active:scale-95 transition-all cursor-pointer"
              title="New Text File"
            >
              <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              {!isCompactRibbon && <span>New Text</span>}
            </button>

            <span className="h-4 w-[1px] bg-black/10 mx-1" />

            {/* UPLOAD FILE */}
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded hover:bg-white/35 text-emerald-600 hover:text-emerald-700 active:scale-95 transition-all cursor-pointer"
              title="Upload files from your computer"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              {!isCompactRibbon && <span>Upload File</span>}
            </button>

            <span className="h-4 w-[1px] bg-black/10 mx-1" />

            {/* CUT */}
            <button
              onClick={() => selectedItem && handleCut(selectedItem)}
              disabled={!selectedItem}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Cut selection"
            >
              <Scissors className="w-3.5 h-3.5 shrink-0" />
              {!isCompactRibbon && <span>Cut</span>}
            </button>

            {/* COPY */}
            <button
              onClick={() => selectedItem && handleCopy(selectedItem)}
              disabled={!selectedItem}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Copy selection"
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              {!isCompactRibbon && <span>Copy</span>}
            </button>

            {/* PASTE */}
            <button
              onClick={handlePaste}
              disabled={!clipboard}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Paste clipboard content"
            >
              <Clipboard className="w-3.5 h-3.5 shrink-0" />
              {!isCompactRibbon && <span>Paste</span>}
              {clipboard && (
                <span className="text-[9px] bg-purple-500 text-white rounded-full px-1 py-0.2 select-none font-bold">
                  {clipboard.action === 'copy' ? 'C' : 'X'}
                </span>
              )}
            </button>

            <span className="h-4 w-[1px] bg-black/10 mx-1" />

            {/* RENAME */}
            <button
              onClick={() => selectedItem && handleStartRename(selectedItem)}
              disabled={!selectedItem}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded hover:bg-white/35 disabled:opacity-35 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Rename selected"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              {!isCompactRibbon && <span>Rename</span>}
            </button>

            {/* DELETE */}
            <button
              onClick={() => selectedItem && handleDeleteItem(selectedItem)}
              disabled={!selectedItem}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded hover:bg-white/35 text-rose-500 hover:text-rose-600 disabled:opacity-35 disabled:hover:bg-transparent disabled:text-inherit transition-all cursor-pointer"
              title="Move to Recycle Bin"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              {!isCompactRibbon && <span>Delete</span>}
            </button>
          </div>

          {/* VIEW PREFERENCE TABS */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white/60 shadow-xs' : 'hover:bg-white/35'
              }`}
              title="Grid View (Icons)"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white/60 shadow-xs' : 'hover:bg-white/35'
              }`}
              title="Details View (List)"
            >
              <List className="w-4 h-4" />
            </button>
            <span className="h-4 w-[1px] bg-black/10 mx-0.5" />
            <button
              onClick={() => setShowDetailsPane(!showDetailsPane)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                showDetailsPane ? 'bg-white/60 text-purple-600' : 'hover:bg-white/35'
              }`}
              title="Toggle Details Pane"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 2. MAIN LAYOUT: SIDEBAR, STAGE, DETAILS ==================== */}
      <div className="flex-1 flex overflow-hidden relative" onContextMenu={(e) => handleContextMenu(e, null)}>
        {/* LEFT NAVIGATION TREE SIDEBAR */}
        <div className={`transition-all duration-150 ${isCompactSidebar ? 'w-12 p-1' : 'w-48 p-3'} flex flex-col gap-1 shrink-0 overflow-y-auto select-none ${ts.sidebar}`}>
          <button
            onClick={() => handleSidebarClick(null)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
              currentFolderId === null ? ts.sidebarBtnActive : ts.sidebarBtn
            } ${isCompactSidebar ? 'justify-center px-0 py-2.5' : ''}`}
            title={isCompactSidebar ? "Drive" : undefined}
          >
            <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
            {!isCompactSidebar && <span>Drive</span>}
          </button>

          {!isCompactSidebar && <span className={ts.sidebarHeader + ' mt-3'}>Quick Access</span>}
          <button
            onClick={() => handleSidebarClick('folder-documents')}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
              currentFolderId === 'folder-documents' ? ts.sidebarBtnActive : ts.sidebarBtn
            } ${isCompactSidebar ? 'justify-center px-0 py-2.5' : ''}`}
            title={isCompactSidebar ? "Documents" : undefined}
          >
            <span className="shrink-0 text-base">📝</span>
            {!isCompactSidebar && <span>Documents</span>}
          </button>
          <button
            onClick={() => handleSidebarClick('folder-pictures')}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
              currentFolderId === 'folder-pictures' ? ts.sidebarBtnActive : ts.sidebarBtn
            } ${isCompactSidebar ? 'justify-center px-0 py-2.5' : ''}`}
            title={isCompactSidebar ? "Pictures" : undefined}
          >
            <span className="shrink-0 text-base">🖼️</span>
            {!isCompactSidebar && <span>Pictures</span>}
          </button>
          <button
            onClick={() => handleSidebarClick('folder-system')}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
              currentFolderId === 'folder-system' ? ts.sidebarBtnActive : ts.sidebarBtn
            } ${isCompactSidebar ? 'justify-center px-0 py-2.5' : ''}`}
            title={isCompactSidebar ? "System Core" : undefined}
          >
            <span className="shrink-0 text-base">⚙️</span>
            {!isCompactSidebar && <span>System Core</span>}
          </button>

          {/* Virtual Trash Bin Connection */}
          <div className="mt-auto pt-3 border-t border-black/5">
            <button
              onClick={() => handleSidebarClick('trash')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-black/5 flex items-center gap-2.5 cursor-pointer opacity-75 hover:opacity-100 transition-opacity ${isCompactSidebar ? 'justify-center px-0 py-2.5' : ''}`}
              title={isCompactSidebar ? "Recycle Bin" : undefined}
            >
              <span className="shrink-0 text-base">🗑️</span>
              {!isCompactSidebar && <span>Recycle Bin</span>}
            </button>
          </div>
        </div>

        {/* MIDDLE FILE SYSTEM EXPLORER VIEW AREA */}
        <div ref={explorerAreaRef} className="flex-1 flex flex-col overflow-hidden">
          {sortedItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-xs select-none">
              <Folder className="w-12 h-12 stroke-[1.2] mb-3 text-current" />
              <span>This folder is empty.</span>
              {searchQuery && <span className="mt-1">Try clearing your search query.</span>}
            </div>
          ) : viewMode === 'grid' ? (
            // GRID VIEW: Windows Explorer Large Icons style
            <div
              className="flex-1 p-4 overflow-y-auto custom-scrollbar select-none grid gap-3.5 content-start"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 120px))'
              }}
            >
              {sortedItems.map((item) => {
                const isSelected = selectedFileId === item.id;
                const isBeingRenamed = renamingId === item.id;
                const isClipboardCut = clipboard?.id === item.id && clipboard.action === 'cut';

                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFileId(item.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleItemDoubleClick(item);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer group transition-all relative ${
                      isSelected ? ts.gridCardSelected : ts.gridCard
                    } ${isClipboardCut ? 'opacity-40 border-dashed border-purple-500/50' : ''}`}
                  >
                    {/* Visual Large Icon representation */}
                    <div className="mb-2.5 group-hover:scale-105 transition-transform select-none">
                      {renderFileIcon(item, 'large')}
                    </div>

                    {isBeingRenamed ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={handleSaveRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full text-center text-xs p-0.5 rounded bg-white text-black font-semibold border border-purple-500 focus:outline-none"
                      />
                    ) : (
                      <div className="text-xs font-semibold w-full truncate px-1" title={item.name}>
                        {item.name}
                      </div>
                    )}

                    <div className="text-[9px] opacity-60 mt-1 uppercase font-medium select-none">
                      {item.type === 'folder' ? 'Folder' : getItemSizeString(item)}
                    </div>


                  </div>
                );
              })}
            </div>
          ) : (
            // DETAILS VIEW: Windows Explorer sortable detailed table!
            <div className="flex-1 flex flex-col overflow-y-auto select-none custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${ts.listHeader} sticky top-0 z-10`}>
                    <th
                      className="p-3 pl-4 cursor-pointer hover:bg-black/5"
                      onClick={() => {
                        setSortOrder(sortField === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                        setSortField('name');
                      }}
                    >
                      <span className="flex items-center gap-1">
                        Name {sortField === 'name' && (sortOrder === 'asc' ? '▴' : '▾')}
                      </span>
                    </th>
                    {containerWidth >= 380 && (
                      <th
                        className="p-3 cursor-pointer hover:bg-black/5"
                        onClick={() => {
                          setSortOrder(sortField === 'type' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setSortField('type');
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Type {sortField === 'type' && (sortOrder === 'asc' ? '▴' : '▾')}
                        </span>
                      </th>
                    )}
                    {containerWidth >= 500 && (
                      <th
                        className="p-3 cursor-pointer hover:bg-black/5"
                        onClick={() => {
                          setSortOrder(sortField === 'date' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setSortField('date');
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Date Created {sortField === 'date' && (sortOrder === 'asc' ? '▴' : '▾')}
                        </span>
                      </th>
                    )}
                    {containerWidth >= 500 && (
                      <th
                        className="p-3 cursor-pointer hover:bg-black/5"
                        onClick={() => {
                          setSortOrder(sortField === 'size' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setSortField('size');
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Size {sortField === 'size' && (sortOrder === 'asc' ? '▴' : '▾')}
                        </span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const isSelected = selectedFileId === item.id;
                    const isBeingRenamed = renamingId === item.id;
                    const isClipboardCut = clipboard?.id === item.id && clipboard.action === 'cut';

                    return (
                      <tr
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFileId(item.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleItemDoubleClick(item);
                        }}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        className={`text-xs ${ts.listRow} ${
                          isSelected ? ts.listRowSelected + ' ' + ts.gridCardSelected : ''
                        } ${isClipboardCut ? 'opacity-40 bg-purple-500/5' : ''}`}
                      >
                        <td className="p-2.5 pl-4 flex items-center gap-2 font-medium">
                          <span className="shrink-0">
                            {renderFileIcon(item, 'small')}
                          </span>
                          {isBeingRenamed ? (
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onBlur={handleSaveRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename();
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="text-xs px-1 rounded bg-white text-black border border-purple-500 focus:outline-none font-semibold w-full max-w-[150px]"
                            />
                          ) : (
                            <span className="truncate w-full block max-w-[200px]" title={item.name}>
                              {item.name}
                            </span>
                          )}
                        </td>
                        {containerWidth >= 380 && <td className="p-2.5">{getItemTypeString(item)}</td>}
                        {containerWidth >= 500 && <td className="p-2.5">{item.createdAt}</td>}
                        {containerWidth >= 500 && <td className="p-2.5">{item.type === 'folder' ? '--' : getItemSizeString(item)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT SIDE DETAILS PROPERTIES PANEL */}
        {showDetailsPane && (
          <div className={`w-64 flex flex-col shrink-0 overflow-y-auto select-none ${ts.rightPane}`}>
            <div className={`p-4 ${ts.rightPaneHeader} flex items-center justify-between`}>
              <span className="text-xs font-extrabold uppercase tracking-wider text-current/60 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-purple-500" />
                Properties Pane
              </span>
              <button
                onClick={() => setShowDetailsPane(false)}
                className="p-1 hover:bg-black/5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedItem ? (
              <div className="p-4 flex flex-col items-center text-center gap-4">
                {/* Visual Icon */}
                <div className="filter drop-shadow-md py-4 select-none flex items-center justify-center">
                  {renderFileIcon(selectedItem, 'xl')}
                </div>

                <div className="w-full">
                  <h4 className="font-bold text-sm truncate px-2 text-current w-full" title={selectedItem.name}>
                    {selectedItem.name}
                  </h4>
                  <p className="text-[10px] uppercase font-bold text-purple-600 mt-1 select-none">
                    {getItemTypeString(selectedItem)}
                  </p>
                </div>

                <div className="w-full border-t border-black/5 pt-3.5 text-xs text-left flex flex-col gap-2 bg-black/5 p-3 rounded-xl">
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase tracking-wide">Path:</span>
                    <span className="font-medium break-all text-[11px]">{getCurrentFolderPathString()}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase tracking-wide">Size on disk:</span>
                    <span className="font-semibold text-xs text-current">
                      {getItemSizeString(selectedItem)}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase tracking-wide">Created At:</span>
                    <span className="font-medium">{selectedItem.createdAt}</span>
                  </div>

                  {/* Text statistics for text documents */}
                  {selectedItem.type === 'file' && selectedItem.name.endsWith('.txt') && selectedItem.content && (
                    <div className="mt-1.5 pt-1.5 border-t border-black/5 text-[11px] grid grid-cols-3 gap-1 bg-white/20 p-1.5 rounded text-center">
                      <div>
                        <span className="opacity-60 block text-[9px]">WORDS</span>
                        <span className="font-bold">{getTextStats(selectedItem.content).words}</span>
                      </div>
                      <div>
                        <span className="opacity-60 block text-[9px]">CHARS</span>
                        <span className="font-bold">{getTextStats(selectedItem.content).chars}</span>
                      </div>
                      <div>
                        <span className="opacity-60 block text-[9px]">LINES</span>
                        <span className="font-bold">{getTextStats(selectedItem.content).lines}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Substantive Action Buttons based on type */}
                <div className="w-full flex flex-col gap-2 mt-2">
                  {selectedItem.type === 'file' && selectedItem.name.endsWith('.txt') && (
                    <button
                      onClick={() =>
                        openTextFileInEditor(
                          selectedItem.id,
                          selectedItem.name,
                          selectedItem.content || ''
                        )
                      }
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Open in Text Editor
                    </button>
                  )}

                  {selectedItem.type === 'file' &&
                    (selectedItem.name.endsWith('.png') ||
                      selectedItem.name.endsWith('.jpg') ||
                      selectedItem.name.endsWith('.jpeg')) && (
                      <>
                        <button
                          onClick={() => handleItemDoubleClick(selectedItem)}
                          className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Image className="w-3.5 h-3.5" />
                          Open Image Preview
                        </button>
                        <button
                          onClick={() => handleApplyWallpaper(selectedItem)}
                          className="w-full py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                          🎨 Set as Desktop Wallpaper
                        </button>
                      </>
                    )}

                  {selectedItem.type === 'folder' && (
                    <button
                      onClick={() => navigateToFolder(selectedItem.id)}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      Explore Folder
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteItem(selectedItem)}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Move to Recycle Bin
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-40 text-xs">
                <Info className="w-7 h-7 mb-2 stroke-[1.2]" />
                Select a file or folder to view its properties and actions.
              </div>
            )}
          </div>
        )}

        {/* CUSTOM ROW CONTEXT MENU POPUP (Right click) */}
        {contextMenu.visible && (
          <div
            id="filemanager-context-menu"
            className="absolute bg-white text-zinc-900 border border-zinc-200 rounded-lg p-1.5 w-44 shadow-2xl z-[10000] text-xs font-medium flex flex-col gap-0.5"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.targetItem ? (
              <>
                <button
                  onClick={() => contextMenu.targetItem && handleItemDoubleClick(contextMenu.targetItem)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-purple-100 rounded flex items-center gap-2 cursor-pointer font-semibold text-purple-800"
                >
                  <span>📂</span>
                  <span>Open</span>
                </button>
                <button
                  onClick={() => contextMenu.targetItem && handleCut(contextMenu.targetItem)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 rounded flex items-center gap-2 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Cut</span>
                </button>
                <button
                  onClick={() => contextMenu.targetItem && handleCopy(contextMenu.targetItem)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 rounded flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => contextMenu.targetItem && handleStartRename(contextMenu.targetItem)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 rounded flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Rename</span>
                </button>
                <button
                  onClick={() => contextMenu.targetItem && handleDeleteItem(contextMenu.targetItem)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 text-rose-600 rounded flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <span className="h-[1px] bg-zinc-200 my-0.5" />
                <button
                  onClick={() => setShowDetailsPane(true)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 rounded flex items-center gap-2 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Properties</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCreateFolder}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 rounded flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>New Folder</span>
                </button>
                <button
                  onClick={handleCreateFile}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 rounded flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>New Text File</span>
                </button>
                <button
                  onClick={handleUploadClick}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 text-emerald-600 font-medium rounded flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Upload File</span>
                </button>
                <span className="h-[1px] bg-zinc-200 my-0.5" />
                <button
                  onClick={handlePaste}
                  disabled={!clipboard}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 disabled:opacity-35 disabled:hover:bg-transparent rounded flex items-center gap-2 cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Paste Here</span>
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFileId(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-black/5 rounded flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Refresh</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ==================== 3. STATUS BAR ==================== */}
      <div className={`h-7 px-4 flex items-center justify-between text-[11px] font-semibold border-t select-none shrink-0 ${ts.statusBar}`}>
        <div className="flex items-center gap-1.5">
          <span>{currentItems.length} item{currentItems.length === 1 ? '' : 's'}</span>
          {searchQuery && (
            <span className="opacity-60 bg-black/5 px-1.5 py-0.5 rounded text-[10px]">
              Filtered: {sortedItems.length}
            </span>
          )}
        </div>
        <div>
          {selectedItem ? (
            <span className="text-purple-600 font-bold">
              1 item selected | {getItemSizeString(selectedItem)}
            </span>
          ) : (
            <span className="opacity-50">Select an item to view properties</span>
          )}
        </div>
      </div>

      {/* ==================== 4. IMAGE VIEWER OVERLAY PREVIEW ==================== */}
      {previewImage && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="relative max-w-2xl w-full bg-[#16121e] border border-white/10 p-5 rounded-2xl flex flex-col gap-4 shadow-2xl text-white">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4.5 right-4.5 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/85 text-white/80 hover:text-white rounded-full transition-colors cursor-pointer text-sm font-bold border border-white/5"
            >
              ✕
            </button>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-pink-500 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" />
              Windows Media Preview
            </h3>
            <div className="w-full max-h-[60vh] overflow-hidden flex items-center justify-center rounded-lg bg-zinc-950 border border-white/5 relative">
              <img
                src={previewImage}
                alt="System Preview"
                referrerPolicy="no-referrer"
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>
            {selectedItem && (
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="font-bold opacity-85">{selectedItem.name}</span>
                <button
                  onClick={() => {
                    handleApplyWallpaper(selectedItem);
                    setPreviewImage(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  Apply as Desktop Wallpaper
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />
    </div>
  );
}

import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { CustomFolder } from '../types';

interface CustomFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folder: CustomFolder) => void;
  isLight: boolean;
}

export const CustomFolderModal: React.FC<CustomFolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  isLight,
}) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-blue-500');

  const COLORS = [
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Green', value: 'bg-emerald-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Amber', value: 'bg-amber-500' },
    { name: 'Rose', value: 'bg-rose-500' },
  ];

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!folderName.trim()) {
      alert('Please enter a folder name.');
      return;
    }

    const newFolder: CustomFolder = {
      id: `cf-${Date.now()}`,
      name: folderName.trim(),
      color: selectedColor,
    };

    onCreateFolder(newFolder);
    setFolderName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e1d22] border-white/10 text-white'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <FolderPlus size={18} className="text-blue-500" />
            <span>Create Custom Mailbox Folder</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 dark:text-white/60">Folder Name</label>
            <input
              type="text"
              placeholder="e.g. Invoices, Projects, Personal"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className={`p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181b] border-white/10 text-white'
              }`}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-white/60">Color Tag</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedColor(c.value)}
                  className={`w-7 h-7 rounded-full ${c.value} transition-transform cursor-pointer ${
                    selectedColor === c.value ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={`p-3 border-t flex items-center justify-end gap-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
          >
            Create Folder
          </button>
        </div>
      </div>
    </div>
  );
};

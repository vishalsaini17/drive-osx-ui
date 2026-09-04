import React from 'react';
import { Save, FileText } from 'lucide-react';
import AppToolbar from '../../../design-system/components/AppToolbar';

interface ToolbarStubProps {
  docTitle: string;
  isDirty: boolean;
  pageCount: number;
  onSave: () => void;
}

/** Window-level title bar: document name, page count, save. Formatting lives in the ribbon below it. */
export default function ToolbarStub({ docTitle, isDirty, pageCount, onSave }: ToolbarStubProps) {
  return (
    <AppToolbar
      icon={<FileText className="w-4 h-4" />}
      title={`${docTitle}${isDirty ? ' •' : ''}`}
      rightActions={
        <>
          <span className="text-[10px] text-current/60 tabular-nums px-1">
            {pageCount} page{pageCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            title="Save (Ctrl+S)"
            onClick={onSave}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-current hover:bg-white/10"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        </>
      }
    />
  );
}

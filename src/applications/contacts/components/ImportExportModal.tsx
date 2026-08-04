import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  FileCode,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users
} from 'lucide-react';
import { Contact } from '../../../types';
import { exportContactsToCSV, parseCSVString, downloadCSVFile } from '../utils/csv';
import { exportContactsToVCard, parseVCardString, downloadVCardFile } from '../utils/vcard';

interface ImportExportModalProps {
  contacts: Contact[];
  onImport: (newContacts: Partial<Contact>[]) => void;
  onClose: () => void;
  isLight: boolean;
}

export default function ImportExportModal({
  contacts,
  onImport,
  onClose,
  isLight,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importPreview, setImportPreview] = useState<Partial<Contact>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importFileType, setImportFileType] = useState<'csv' | 'vcf' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export handlers
  const handleExportCSV = () => {
    const csvData = exportContactsToCSV(contacts);
    downloadCSVFile(`contacts_export_${Date.now()}`, csvData);
    setSuccessMsg(`Exported ${contacts.length} contacts to CSV.`);
  };

  const handleExportVCard = () => {
    const vcardData = exportContactsToVCard(contacts);
    downloadVCardFile(`contacts_export_${Date.now()}`, vcardData);
    setSuccessMsg(`Exported ${contacts.length} contacts to vCard (.vcf).`);
  };

  // File Upload Reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setErrorMsg('Uploaded file is empty.');
        return;
      }

      if (ext === 'csv') {
        setImportFileType('csv');
        const parsed = parseCSVString(text);
        if (parsed.length === 0) {
          setErrorMsg('Could not parse any contacts from CSV. Please check column headers.');
        } else {
          setImportPreview(parsed);
        }
      } else if (ext === 'vcf' || ext === 'vcard') {
        setImportFileType('vcf');
        const parsed = parseVCardString(text);
        if (parsed.length === 0) {
          setErrorMsg('Could not parse any contacts from vCard file.');
        } else {
          setImportPreview(parsed);
        }
      } else {
        setErrorMsg('Unsupported file type. Please upload a .csv or .vcf file.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (importPreview && importPreview.length > 0) {
      onImport(importPreview);
      setSuccessMsg(`Successfully imported ${importPreview.length} contacts!`);
      setImportPreview(null);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-3xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-700/80 text-white'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'border-slate-100' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-lg tracking-tight">Import / Export Contacts</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight
                ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                : 'hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b text-xs font-bold ${isLight ? 'border-slate-100 bg-slate-50' : 'border-zinc-800 bg-zinc-950/40'}`}>
          <button
            onClick={() => { setActiveTab('export'); setImportPreview(null); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-500 text-indigo-500 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Export Contacts
          </button>
          <button
            onClick={() => { setActiveTab('import'); setImportPreview(null); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-indigo-500 text-indigo-500 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Import Contacts
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Export your <span className="font-semibold text-indigo-400">{contacts.length} contacts</span> in standard industry formats for backup or transferring to other address books.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleExportCSV}
                  className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all cursor-pointer group ${
                    isLight
                      ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-slate-800'
                      : 'bg-zinc-800/80 hover:bg-emerald-950/40 border-zinc-700/80 hover:border-emerald-500/40 text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="font-bold text-xs block">Export CSV</span>
                    <span className="text-[10px] text-zinc-400">Spreadsheets & Google</span>
                  </div>
                </button>

                <button
                  onClick={handleExportVCard}
                  className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all cursor-pointer group ${
                    isLight
                      ? 'bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-800'
                      : 'bg-zinc-800/80 hover:bg-indigo-950/40 border-zinc-700/80 hover:border-indigo-500/40 text-white'
                  }`}
                >
                  <FileCode className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="font-bold text-xs block">Export vCard (.vcf)</span>
                    <span className="text-[10px] text-zinc-400">Apple & Outlook</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Upload a <span className="font-semibold text-indigo-400">.CSV</span> or <span className="font-semibold text-indigo-400">.VCF vCard</span> file to import contacts into DriveOSX Contacts.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.vcf,.vcard"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!importPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center text-center cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 hover:bg-indigo-50/50 hover:border-indigo-400'
                      : 'bg-zinc-800/50 border-zinc-700 hover:bg-indigo-950/20 hover:border-indigo-500/50'
                  }`}
                >
                  <Upload className="w-10 h-10 text-indigo-500 mb-2 animate-bounce" />
                  <span className="font-bold text-xs text-indigo-400">Click to Select CSV or vCard File</span>
                  <span className="text-[10px] text-zinc-400 mt-1">Supports .csv and .vcf formats</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800 border-zinc-700'}`}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <div>
                        <span className="text-xs font-bold block">{importFileName}</span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          Found {importPreview.length} contacts ready to import
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setImportPreview(null)}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Preview Items */}
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {importPreview.slice(0, 10).map((c, idx) => (
                      <div key={idx} className={`p-2 rounded-lg text-xs flex justify-between ${isLight ? 'bg-slate-100' : 'bg-zinc-800/60'}`}>
                        <span className="font-semibold">{c.firstName} {c.lastName}</span>
                        <span className="text-zinc-400">{c.email || c.phone || c.company || 'Contact'}</span>
                      </div>
                    ))}
                    {importPreview.length > 10 && (
                      <p className="text-[10px] text-zinc-400 text-center italic">
                        ...and {importPreview.length - 10} more contacts.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Import {importPreview.length} Contacts Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

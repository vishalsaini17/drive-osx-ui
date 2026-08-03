import React from 'react';
import { X, User, Plus, Check } from 'lucide-react';
import { Contact } from '../types';

interface ContactsModalProps {
  contacts: Contact[];
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
  isLight: boolean;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  contacts,
  isOpen,
  onClose,
  onSelectContact,
  isLight,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden max-h-[80vh] ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e1d22] border-white/10 text-white'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <User size={18} className="text-blue-500" />
            <span>Select Contact / Address Book</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 min-h-[220px]">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => {
                onSelectContact(contact);
                onClose();
              }}
              className={`p-3 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                isLight ? 'hover:bg-blue-50/80' : 'hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full ${contact.avatarBg} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                  {contact.name.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{contact.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">{contact.email}</span>
                </div>
              </div>
              <button className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 cursor-pointer shrink-0">
                Add
              </button>
            </div>
          ))}
        </div>

        <div className={`p-3 border-t flex justify-end ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

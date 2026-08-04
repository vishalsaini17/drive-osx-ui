import React, { useState } from 'react';
import {
  X,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Globe,
  MapPin,
  Calendar,
  Share2,
  QrCode,
  Copy,
  Check,
  Video,
  MessageSquare,
  Sparkles,
  Award
} from 'lucide-react';
import { Contact } from '../../../types';
import QRCodeModal from './QRCodeModal';

interface BusinessCardModalProps {
  contact: Contact;
  onClose: () => void;
  isLight: boolean;
  onOpenApp: (appId: string, payload?: any) => void;
  onCopySuccess: () => void;
}

export default function BusinessCardModal({
  contact,
  onClose,
  isLight,
  onOpenApp,
  onCopySuccess,
}: BusinessCardModalProps) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase();
  const bgGradient = contact.avatarBg || 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600';

  const handleCopyCardInfo = () => {
    const info = `📇 ${contact.firstName} ${contact.lastName}
${contact.jobTitle ? `${contact.jobTitle} at ${contact.company || 'DriveOSX'}` : ''}
📧 Email: ${contact.email || 'N/A'}
📞 Phone: ${contact.phone || 'N/A'}
🌐 Website: ${contact.website || 'N/A'}
📍 Address: ${contact.address || 'N/A'}`;

    navigator.clipboard.writeText(info);
    setCopied(true);
    onCopySuccess();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fadeIn">
        <div
          className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border relative flex flex-col transition-all ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-700/80 text-white'
          }`}
        >
          {/* Header Cover Bar */}
          <div className={`h-28 w-full ${bgGradient} relative p-4 flex items-start justify-between`}>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full text-white/90 text-[11px] font-semibold tracking-wide">
              <Award size={13} className="text-amber-300" />
              <span>Digital Business Card</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Avatar Overlay & Contact Info */}
          <div className="px-6 pb-6 pt-0 relative flex flex-col items-center text-center -mt-12">
            <div className="relative mb-3">
              {contact.photo ? (
                <img
                  src={contact.photo}
                  alt={contact.firstName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-zinc-900 shadow-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-full ${bgGradient} border-4 border-white dark:border-zinc-900 shadow-xl flex items-center justify-center font-bold text-3xl text-white`}
                >
                  {initials}
                </div>
              )}
              {contact.isFavorite && (
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center text-zinc-900 shadow-md font-bold text-xs">
                  ★
                </div>
              )}
            </div>

            <h2 className="text-2xl font-black tracking-tight mb-1">
              {contact.firstName} {contact.lastName}
            </h2>
            {contact.jobTitle && (
              <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 mb-0.5">
                {contact.jobTitle}
              </p>
            )}
            {contact.company && (
              <p className={`text-xs font-medium mb-4 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {contact.company} {contact.department ? `• ${contact.department}` : ''}
              </p>
            )}

            {/* Labels Badges */}
            {contact.labels && contact.labels.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-5">
                {contact.labels.map((lbl) => (
                  <span
                    key={lbl}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/20"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            )}

            {/* Quick Action Dock inside Business Card */}
            <div className="grid grid-cols-4 gap-2 w-full mb-6">
              <button
                onClick={() => onOpenApp('mail', { to: contact.email })}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer group ${
                  isLight
                    ? 'bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600'
                    : 'bg-zinc-800/80 hover:bg-indigo-950/40 border-zinc-700/80 hover:border-indigo-500/40 text-zinc-300 hover:text-indigo-300'
                }`}
              >
                <Mail size={18} className="mb-1 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold">Email</span>
              </button>

              <button
                onClick={() => onOpenApp('messenger', { contact: `${contact.firstName} ${contact.lastName}`, email: contact.email })}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer group ${
                  isLight
                    ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-600'
                    : 'bg-zinc-800/80 hover:bg-emerald-950/40 border-zinc-700/80 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-300'
                }`}
              >
                <MessageSquare size={18} className="mb-1 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold">Message</span>
              </button>

              <button
                onClick={() => onOpenApp('meeting', { invitee: `${contact.firstName} ${contact.lastName}` })}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer group ${
                  isLight
                    ? 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600'
                    : 'bg-zinc-800/80 hover:bg-blue-950/40 border-zinc-700/80 hover:border-blue-500/40 text-zinc-300 hover:text-blue-300'
                }`}
              >
                <Video size={18} className="mb-1 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold">Meet</span>
              </button>

              <button
                onClick={() => onOpenApp('calendar', { attendee: contact.email })}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer group ${
                  isLight
                    ? 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-600'
                    : 'bg-zinc-800/80 hover:bg-amber-950/40 border-zinc-700/80 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300'
                }`}
              >
                <Calendar size={18} className="mb-1 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold">Calendar</span>
              </button>
            </div>

            {/* Field Details */}
            <div className="w-full text-left space-y-2.5 mb-6 text-xs">
              {contact.email && (
                <div className={`p-2.5 rounded-xl flex items-center gap-3 ${isLight ? 'bg-slate-50' : 'bg-zinc-800/50'}`}>
                  <Mail size={15} className="text-slate-400 shrink-0" />
                  <span className="font-mono font-medium truncate">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className={`p-2.5 rounded-xl flex items-center gap-3 ${isLight ? 'bg-slate-50' : 'bg-zinc-800/50'}`}>
                  <Phone size={15} className="text-slate-400 shrink-0" />
                  <span className="font-mono font-medium">{contact.phone}</span>
                </div>
              )}
              {contact.website && (
                <div className={`p-2.5 rounded-xl flex items-center gap-3 ${isLight ? 'bg-slate-50' : 'bg-zinc-800/50'}`}>
                  <Globe size={15} className="text-slate-400 shrink-0" />
                  <a href={contact.website} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate">
                    {contact.website}
                  </a>
                </div>
              )}
              {contact.address && (
                <div className={`p-2.5 rounded-xl flex items-center gap-3 ${isLight ? 'bg-slate-50' : 'bg-zinc-800/50'}`}>
                  <MapPin size={15} className="text-slate-400 shrink-0" />
                  <span className="truncate">{contact.address}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 w-full">
              <button
                onClick={handleCopyCardInfo}
                className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Card Info Copied!' : 'Copy Info'}
              </button>
              <button
                onClick={() => setShowQR(true)}
                className={`py-2.5 px-4 font-semibold text-xs rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
              >
                <QrCode size={15} />
                QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQR && (
        <QRCodeModal
          contact={contact}
          onClose={() => setShowQR(false)}
          isLight={isLight}
          onCopySuccess={onCopySuccess}
        />
      )}
    </>
  );
}

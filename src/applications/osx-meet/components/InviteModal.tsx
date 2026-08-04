import React, { useState } from 'react';
import { X, Copy, Check, Mail, UserPlus, Link, Shield } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingTitle: string;
  passcode?: string;
  isLight?: boolean;
}

export default function InviteModal({
  isOpen,
  onClose,
  meetingId,
  meetingTitle,
  passcode,
  isLight,
}: InviteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInviteText, setCopiedInviteText] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const meetingUrl = `https://meet.driveosx.app/${meetingId}`;

  const fullInviteText = `Join my OSX Meet Video Call: "${meetingTitle}"\n\nMeeting Link: ${meetingUrl}\nMeeting Code: ${meetingId}${
    passcode ? `\nPasscode: ${passcode}` : ''
  }\n\nPowered by DriveOSX Meet HD`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyFullText = () => {
    navigator.clipboard.writeText(fullInviteText);
    setCopiedInviteText(true);
    setTimeout(() => setCopiedInviteText(false), 2000);
  };

  const handleSendEmailInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setInviteEmail('');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#232228] border-white/15 text-white'
        }`}
      >
        {/* Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <UserPlus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Invite Participants</h2>
              <p className="text-[11px] text-zinc-400">Share link or send email invitations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Direct Link Section */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-zinc-300">Meeting Link</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-300 flex items-center gap-2 min-w-0">
                <Link size={13} className="text-blue-400 shrink-0" />
                <span className="truncate">{meetingUrl}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Meeting Info Card */}
          <div className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex flex-col gap-1 text-xs text-zinc-300">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Meeting Code:</span>
              <span className="font-mono font-bold text-white">{meetingId}</span>
            </div>
            {passcode && (
              <div className="flex items-center justify-between pt-1 border-t border-zinc-700/40">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Shield size={12} className="text-emerald-400" /> Passcode:
                </span>
                <span className="font-mono font-bold text-emerald-400">{passcode}</span>
              </div>
            )}
          </div>

          {/* Email Invitation Form */}
          <form onSubmit={handleSendEmailInvite} className="flex flex-col gap-1.5 pt-1">
            <span className="text-xs font-bold text-zinc-300">Send Email Invitation</span>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!inviteEmail.trim()}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <Mail size={13} />
                <span>{sentSuccess ? 'Sent!' : 'Send Email'}</span>
              </button>
            </div>
          </form>

          {/* Full Invitation Copy Button */}
          <button
            onClick={handleCopyFullText}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors border border-zinc-700/80"
          >
            {copiedInviteText ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedInviteText ? 'Full Invite Copied to Clipboard!' : 'Copy Full Invitation Details'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

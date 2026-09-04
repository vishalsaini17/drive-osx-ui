import React from 'react';
import { X, Lock, ShieldCheck, UserCheck, MessageSquare, Monitor, Mic, Disc } from 'lucide-react';
import { MeetingSecuritySettings } from '../types';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MeetingSecuritySettings;
  onUpdateSettings: (updated: Partial<MeetingSecuritySettings>) => void;
  isLight?: boolean;
}

/** A switch, not a checkbox — these all read as feature toggles ("Lock
 *  Meeting", "Allow Participants To: ...") rather than form fields, so the
 *  control should look like the setting it flips. */
function ToggleSwitch({
  checked,
  onChange,
  isLight,
  accent = 'bg-blue-500',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  isLight?: boolean;
  accent?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full shrink-0 cursor-pointer transition-colors duration-200 ${
        checked ? accent : isLight ? 'bg-slate-300' : 'bg-zinc-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SecurityModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isLight,
}: SecurityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#232228] border-white/15 text-white'
        }`}
      >
        {/* Header */}
        <div className={`h-14 px-5 flex items-center justify-between border-b shrink-0 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Security & Host Controls</h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Manage permissions & waiting room protection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-900' : 'text-zinc-400 hover:text-white'}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Main Security Toggles */}
          <div className="flex flex-col gap-2.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Access Protection</span>

            {/* Lock Meeting */}
            <div className={`flex items-center justify-between p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/60 border-zinc-700/60'}`}>
              <div className="flex items-center gap-2.5">
                <Lock size={15} className={settings.isLocked ? 'text-amber-500' : isLight ? 'text-slate-400' : 'text-zinc-400'} />
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Lock Meeting</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Prevent any new participants from joining</span>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.isLocked}
                onChange={(checked) => onUpdateSettings({ isLocked: checked })}
                isLight={isLight}
                accent="bg-amber-500"
              />
            </div>

            {/* Enable Waiting Room */}
            <div className={`flex items-center justify-between p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/60 border-zinc-700/60'}`}>
              <div className="flex items-center gap-2.5">
                <UserCheck size={15} className={settings.waitingRoomEnabled ? 'text-emerald-500' : isLight ? 'text-slate-400' : 'text-zinc-400'} />
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Enable Waiting Room</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Host must manually approve participants</span>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.waitingRoomEnabled}
                onChange={(checked) => onUpdateSettings({ waitingRoomEnabled: checked })}
                isLight={isLight}
                accent="bg-emerald-500"
              />
            </div>

            {/* Passcode Protection */}
            <div className={`flex flex-col gap-1.5 p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/60 border-zinc-700/60'}`}>
              <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Meeting Password Protection</span>
              <input
                type="text"
                placeholder="Set passcode (e.g. 123456) or leave blank"
                value={settings.passcode}
                onChange={(e) => onUpdateSettings({ passcode: e.target.value })}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 border-zinc-700 text-white'
                }`}
              />
            </div>
          </div>

          {/* Participant Permissions */}
          <div className="flex flex-col gap-2.5 pt-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Allow Participants To:</span>

            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => onUpdateSettings({ allowScreenShare: !settings.allowScreenShare })}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Monitor size={13} className="text-blue-500" />
                  <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Share Screen</span>
                </div>
                <ToggleSwitch
                  checked={settings.allowScreenShare}
                  onChange={(checked) => onUpdateSettings({ allowScreenShare: checked })}
                  isLight={isLight}
                  accent="bg-blue-500"
                />
              </div>

              <div
                onClick={() => onUpdateSettings({ allowChat: !settings.allowChat })}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={13} className="text-purple-500" />
                  <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Send Chat</span>
                </div>
                <ToggleSwitch
                  checked={settings.allowChat}
                  onChange={(checked) => onUpdateSettings({ allowChat: checked })}
                  isLight={isLight}
                  accent="bg-purple-500"
                />
              </div>

              <div
                onClick={() => onUpdateSettings({ allowUnmute: !settings.allowUnmute })}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic size={13} className="text-emerald-500" />
                  <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Unmute Self</span>
                </div>
                <ToggleSwitch
                  checked={settings.allowUnmute}
                  onChange={(checked) => onUpdateSettings({ allowUnmute: checked })}
                  isLight={isLight}
                  accent="bg-emerald-500"
                />
              </div>

              <div
                onClick={() => onUpdateSettings({ allowRecording: !settings.allowRecording })}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Disc size={13} className="text-red-500" />
                  <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Record Call</span>
                </div>
                <ToggleSwitch
                  checked={settings.allowRecording}
                  onChange={(checked) => onUpdateSettings({ allowRecording: checked })}
                  isLight={isLight}
                  accent="bg-red-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

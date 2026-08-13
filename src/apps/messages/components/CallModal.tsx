import React, { useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, ExternalLink, RefreshCw } from 'lucide-react';
import { CallState } from '../types';
import { useSystemStore } from '../../../shell/state/systemStore';

interface CallModalProps {
  callState: CallState;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  callState,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
}) => {
  const openAppWindow = useSystemStore((state) => state.openAppWindow);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTransferToOSXMeet = () => {
    onEndCall();
    openAppWindow('osxMeet');
  };

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0f172a] border border-slate-700/80 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Screen Share or Avatar View */}
        {callState.isScreenSharing ? (
          <div className="w-full h-52 mb-4 bg-slate-900 border border-slate-700 rounded-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 flex flex-col justify-between border border-blue-500/30">
              <div className="flex items-center justify-between text-xs text-blue-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 animate-pulse" /> Live Screen Sharing
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 rounded text-[10px] uppercase">Desktop 1</span>
              </div>
              <div className="text-center font-mono text-xs text-slate-300 bg-black/40 p-2 rounded-lg border border-white/5">
                Sharing DriveOSX Workspace Display with {callState.contactName}
              </div>
              <div className="text-[10px] text-slate-400 text-right">1080p @ 60fps</div>
            </div>
          </div>
        ) : callState.isVideoOff ? (
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-blue-500/30 animate-pulse shadow-xl">
              {callState.contactName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="w-full h-52 mb-4 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            <div className="w-full h-full bg-gradient-to-tr from-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4">
              <span className="text-4xl mb-2">📹</span>
              <span className="text-xs font-bold text-slate-300">{callState.contactName} Video Feed</span>
            </div>
            <div className="absolute bottom-3 left-3 z-20 text-xs font-bold text-white bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-xs">
              {callState.contactName}
            </div>
          </div>
        )}

        <h3 className="text-lg font-extrabold text-white mb-0.5">
          {callState.contactName}
        </h3>
        <p className="text-xs font-semibold text-emerald-400 mb-5 flex items-center gap-1.5 justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Connected • {formatTime(callState.duration)}
        </p>

        {/* Transfer to OSX Meet Banner */}
        <div className="w-full p-2.5 mb-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-2 text-left">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Transfer call to OSX Meet</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">Move this session into full OSX Meet conference studio</p>
          </div>
          <button
            onClick={handleTransferToOSXMeet}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-md"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Meet</span>
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all ${
              callState.isMuted
                ? 'bg-rose-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={callState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={onToggleVideo}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all ${
              callState.isVideoOff
                ? 'bg-rose-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={callState.isVideoOff ? 'Start Camera' : 'Stop Camera'}
          >
            {callState.isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={onToggleScreenShare}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all ${
              callState.isScreenSharing
                ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={callState.isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            onClick={onEndCall}
            className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-xl cursor-pointer transition-transform hover:scale-105 active:scale-95 ml-2"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

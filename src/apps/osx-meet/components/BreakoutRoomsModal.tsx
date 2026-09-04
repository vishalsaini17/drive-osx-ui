import React, { useState } from 'react';
import { X, Users, Split, MessageSquare, ArrowRight, Play, StopCircle, RefreshCw } from 'lucide-react';
import { Participant, BreakoutRoom } from '../types';

interface BreakoutRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  isLight?: boolean;
}

/** Mirrors the fallback in `index.tsx`'s `AvatarBadge` — a participant with
 *  no avatar image gets their initials instead of a broken `<img>`. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function RoomMemberAvatar({ participant }: { participant: Participant }) {
  if (participant.avatar) {
    return <img src={participant.avatar} alt={participant.name} className="w-5 h-5 rounded-full object-cover shrink-0" />;
  }
  return (
    <div
      className={`w-5 h-5 rounded-full bg-gradient-to-tr ${participant.bgGradient} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}
    >
      {initials(participant.name)}
    </div>
  );
}

export default function BreakoutRoomsModal({
  isOpen,
  onClose,
  participants,
  isLight,
}: BreakoutRoomsModalProps) {
  const [numRooms, setNumRooms] = useState(2);
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  if (!isOpen) return null;

  const handleCreateRooms = () => {
    const newRooms: BreakoutRoom[] = Array.from({ length: numRooms }, (_, i) => ({
      id: `room-${i + 1}`,
      name: `Room ${i + 1}`,
      participantIds: [],
    }));

    // Auto-distribute participants evenly
    participants.forEach((p, idx) => {
      const roomIdx = idx % numRooms;
      newRooms[roomIdx].participantIds.push(p.id);
    });

    setRooms(newRooms);
  };

  const handleStartSession = () => {
    if (rooms.length === 0) handleCreateRooms();
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    setRooms([]);
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    alert(`📢 Broadcast message sent to all Breakout Rooms:\n"${broadcastMsg.trim()}"`);
    setBroadcastMsg('');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#232228] border-white/15 text-white'
        }`}
      >
        {/* Header */}
        <div className={`h-14 px-5 flex items-center justify-between border-b shrink-0 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <Split size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Breakout Rooms</h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Divide participants into smaller discussion groups</p>
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
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {!isSessionActive ? (
            <div className="flex flex-col gap-4">
              <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/40 border-zinc-700/50'}`}>
                <div className="flex-1 flex flex-col gap-1">
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Number of Breakout Rooms</span>
                  <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Automatically split {participants.length} participants into rooms.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumRooms(n)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        numRooms === n
                          ? 'bg-purple-600 text-white shadow-md'
                          : isLight
                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {n} Rooms
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleCreateRooms}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-purple-600' : 'bg-zinc-800 hover:bg-zinc-700 text-purple-300'
                  }`}
                >
                  <RefreshCw size={13} />
                  <span>Auto-Assign Participants</span>
                </button>

                <button
                  onClick={handleStartSession}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 transition-all"
                >
                  <Play size={14} />
                  <span>Open Breakout Rooms</span>
                </button>
              </div>

              {/* Rooms Preview Grid */}
              {rooms.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/80 border-zinc-700/70'}`}
                    >
                      <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-zinc-700/60'}`}>
                        <span className={`text-xs font-bold ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>{room.name}</span>
                        <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{room.participantIds.length} members</span>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-1">
                        {room.participantIds.map((pid) => {
                          const p = participants.find((item) => item.id === pid);
                          if (!p) return null;
                          return (
                            <div key={p.id} className={`flex items-center gap-2 text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                              <RoomMemberAvatar participant={p} />
                              <span className="truncate">{p.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className={`p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold">Breakout Session is Active</span>
                </div>
                <button
                  onClick={handleEndSession}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <StopCircle size={14} />
                  <span>Close All Rooms</span>
                </button>
              </div>

              {/* Broadcast to all rooms */}
              <div className={`flex items-center gap-2 p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/80 border-zinc-700/60'}`}>
                <MessageSquare size={16} className="text-purple-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Broadcast message to all rooms..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                  className={`flex-1 text-xs bg-transparent focus:outline-none ${
                    isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-zinc-500'
                  }`}
                />
                <button
                  onClick={handleBroadcast}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                >
                  Send
                </button>
              </div>

              {/* Active Rooms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/90 border-zinc-700'}`}
                  >
                    <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-zinc-700'}`}>
                      <span className={`text-xs font-bold ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>{room.name}</span>
                      <button
                        onClick={() => alert(`Joined ${room.name}`)}
                        className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                          isLight ? 'text-purple-600 hover:text-purple-700' : 'text-purple-400 hover:text-purple-300'
                        }`}
                      >
                        <span>Join Room</span>
                        <ArrowRight size={11} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1">
                      {room.participantIds.map((pid) => {
                        const p = participants.find((item) => item.id === pid);
                        if (!p) return null;
                        return (
                          <div key={p.id} className={`flex items-center gap-2 text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                            <RoomMemberAvatar participant={p} />
                            <span className="truncate">{p.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

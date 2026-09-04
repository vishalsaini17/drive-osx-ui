import React, { useState } from 'react';
import { X, Plus, BarChart2, CheckCircle2, Trash2 } from 'lucide-react';
import { Poll } from '../types';

interface PollsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  polls: Poll[];
  onCreatePoll: (question: string, options: string[]) => void;
  onVotePoll: (pollId: string, optionId: string) => void;
  onDeletePoll: (pollId: string) => void;
  /** Only the host may delete a poll — the button itself is hidden for
   *  everyone else (the realtime handler in `index.tsx` also verifies the
   *  sender server-side, so this is a UX convenience, not the only gate). */
  isHost?: boolean;
  isLight?: boolean;
}

export default function PollsDrawer({
  isOpen,
  onClose,
  polls,
  onCreatePoll,
  onVotePoll,
  onDeletePoll,
  isHost,
  isLight,
}: PollsDrawerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2']);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 5) return;
    setOptions((prev) => [...prev, `Option ${prev.length + 1}`]);
  };

  const handleOptionChange = (index: number, val: string) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSubmitPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOpts.length < 2) return;
    onCreatePoll(question.trim(), validOpts);
    setQuestion('');
    setOptions(['Option 1', 'Option 2']);
    setIsCreating(false);
  };

  return (
    <div
      className={`w-72 sm:w-80 h-full border-l flex flex-col shrink-0 relative z-20 overflow-hidden ${
        isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-zinc-900 text-white border-zinc-800'
      }`}
    >
      {/* Header */}
      <div className={`h-14 px-4 flex items-center justify-between border-b shrink-0 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-amber-500" />
          <span className="font-bold text-sm">Meeting Polls</span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <X size={15} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {!isCreating ? (
          <>
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <Plus size={15} />
              <span>Create Live Poll</span>
            </button>

            {polls.length === 0 ? (
              <div
                className={`flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 my-auto ${
                  isLight ? 'text-slate-500' : 'text-zinc-400'
                }`}
              >
                <BarChart2 size={32} className="opacity-30" />
                <p className="text-xs font-medium">No active polls in this meeting yet.</p>
                <p className="text-[11px] opacity-60">Click above to launch a quick poll for participants.</p>
              </div>
            ) : (
              polls.map((poll) => {
                const total = poll.totalVotes || 0;
                return (
                  <div
                    key={poll.id}
                    className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/80 border-zinc-700/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs font-bold leading-snug ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                        {poll.question}
                      </span>
                      {isHost && (
                        <button
                          onClick={() => onDeletePoll(poll.id)}
                          className={`p-1 cursor-pointer shrink-0 ${
                            isLight ? 'text-slate-400 hover:text-red-500' : 'text-zinc-400 hover:text-red-400'
                          }`}
                          title="Delete Poll"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Options list */}
                    <div className="flex flex-col gap-2 pt-1">
                      {poll.options.map((opt) => {
                        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                        const isVoted = poll.userVotedOptionId === opt.id;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => onVotePoll(poll.id, opt.id)}
                            className={`p-2.5 rounded-xl border relative overflow-hidden cursor-pointer transition-all ${
                              isVoted
                                ? 'border-amber-500 bg-amber-500/10'
                                : isLight
                                  ? 'border-slate-200 hover:border-slate-400 bg-white'
                                  : 'border-zinc-700/60 hover:border-zinc-500 bg-zinc-900/60'
                            }`}
                          >
                            {/* Vote percentage bar background */}
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-amber-500/20 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />

                            <div className="relative z-10 flex items-center justify-between text-xs">
                              <div
                                className={`flex items-center gap-1.5 font-medium min-w-0 pr-2 ${
                                  isLight ? 'text-slate-800' : 'text-zinc-100'
                                }`}
                              >
                                {isVoted && <CheckCircle2 size={13} className="text-amber-500 shrink-0" />}
                                <span className="truncate">{opt.text}</span>
                              </div>
                              <span
                                className={`font-bold text-[11px] shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}
                              >
                                {pct}% ({opt.votes})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className={`flex items-center justify-between text-[10px] pt-1 ${
                        isLight ? 'text-slate-500' : 'text-zinc-400'
                      }`}
                    >
                      <span>Total Votes: {total}</span>
                      <span>By {poll.creator}</span>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <form onSubmit={handleSubmitPoll} className="flex flex-col gap-3">
            <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>New Poll Question</span>

            <input
              type="text"
              placeholder="e.g. Should we adopt the new redesign?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
              autoFocus
            />

            <span className={`text-xs font-bold pt-1 ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>Options</span>
            {options.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-800 border-zinc-700 text-white'
                }`}
              />
            ))}

            {options.length < 5 && (
              <button
                type="button"
                onClick={handleAddOption}
                className={`text-xs font-semibold text-left cursor-pointer ${
                  isLight ? 'text-amber-600 hover:text-amber-700' : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                + Add another option
              </button>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!question.trim()}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white cursor-pointer"
              >
                Launch Poll
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

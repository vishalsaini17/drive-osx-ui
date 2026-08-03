import React, { useState } from 'react';
import { X, CheckSquare, CheckCircle2 } from 'lucide-react';
import { Email } from '../types';

interface TaskModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  email,
  isOpen,
  onClose,
  isLight,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [created, setCreated] = useState(false);

  React.useEffect(() => {
    if (email) {
      setTaskTitle(`Follow up: ${email.subject}`);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 3);
      setTaskDueDate(nextWeek.toISOString().split('T')[0]);
    }
  }, [email]);

  if (!isOpen || !email) return null;

  const handleCreateTask = () => {
    setCreated(true);
    setTimeout(() => {
      setCreated(false);
      onClose();
      alert(`Task "${taskTitle}" successfully created!`);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e1d22] border-white/10 text-white'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckSquare size={18} className="text-emerald-500" />
            <span>Convert Email to Task</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 dark:text-white/60">Task Title</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className={`p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181b] border-white/10 text-white'
              }`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 dark:text-white/60">Due Date</label>
            <input
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className={`p-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181b] border-white/10 text-white'
              }`}
            />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border dark:border-white/10 text-xs text-slate-500 dark:text-white/50 line-clamp-3">
            <span className="font-bold block text-slate-700 dark:text-white/80 mb-0.5">Original Email Snippet:</span>
            {email.preview}
          </div>
        </div>

        <div className={`p-3 border-t flex items-center justify-end gap-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleCreateTask}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {created ? <CheckCircle2 size={14} /> : <CheckSquare size={14} />}
            <span>{created ? 'Task Created!' : 'Save Task'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

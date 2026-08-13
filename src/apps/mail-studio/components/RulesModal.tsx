import React, { useState } from 'react';
import { X, ShieldAlert, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { EmailRule } from '../types';

interface RulesModalProps {
  rules: EmailRule[];
  onUpdateRules: (rules: EmailRule[]) => void;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  rules,
  onUpdateRules,
  isOpen,
  onClose,
  isLight,
}) => {
  const [ruleName, setRuleName] = useState('');
  const [conditionField, setConditionField] = useState<'subject' | 'sender' | 'body'>('subject');
  const [conditionValue, setConditionValue] = useState('');
  const [action, setAction] = useState<'addLabel' | 'moveToFolder' | 'markImportant' | 'markSpam'>('addLabel');
  const [actionValue, setActionValue] = useState('Work');

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (!ruleName.trim() || !conditionValue.trim()) {
      alert('Please enter a rule name and condition value.');
      return;
    }

    const newRule: EmailRule = {
      id: `rule-${Date.now()}`,
      name: ruleName,
      conditionField,
      conditionValue,
      action,
      actionValue,
      enabled: true,
    };

    onUpdateRules([...rules, newRule]);
    setRuleName('');
    setConditionValue('');
  };

  const handleToggleRule = (id: string) => {
    onUpdateRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleDeleteRule = (id: string) => {
    onUpdateRules(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl border flex flex-col overflow-hidden max-h-[85vh] ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e1d22] border-white/10 text-white'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <ShieldAlert size={18} className="text-purple-500" />
            <span>Email Automation Rules & Filters</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-4 min-h-0">
          {/* Add New Rule Form */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border dark:border-white/10 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <Plus size={14} />
              <span>Create New Rule</span>
            </span>

            <input
              type="text"
              placeholder="Rule Name (e.g., Auto-label Receipts)"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className={`p-2 rounded-lg border text-xs font-semibold focus:outline-none ${
                isLight ? 'bg-white border-slate-300' : 'bg-[#18181b] border-white/15 text-white'
              }`}
            />

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400">When Field:</label>
                <select
                  value={conditionField}
                  onChange={(e) => setConditionField(e.target.value as any)}
                  className={`p-2 rounded-lg border focus:outline-none font-semibold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-[#18181b] border-white/15 text-white'
                  }`}
                >
                  <option value="subject">Subject</option>
                  <option value="sender">Sender Email</option>
                  <option value="body">Email Body</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400">Contains:</label>
                <input
                  type="text"
                  placeholder="e.g. Invoice, Paypal"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className={`p-2 rounded-lg border focus:outline-none font-semibold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-[#18181b] border-white/15 text-white'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400">Then Action:</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className={`p-2 rounded-lg border focus:outline-none font-semibold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-[#18181b] border-white/15 text-white'
                  }`}
                >
                  <option value="addLabel">Add Label</option>
                  <option value="moveToFolder">Move to Folder</option>
                  <option value="markImportant">Mark as Important</option>
                  <option value="markSpam">Move to Spam</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400">Value:</label>
                <input
                  type="text"
                  placeholder="e.g. Work, archive, spam"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className={`p-2 rounded-lg border focus:outline-none font-semibold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-[#18181b] border-white/15 text-white'
                  }`}
                />
              </div>
            </div>

            <button
              onClick={handleAddRule}
              className="mt-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold self-end cursor-pointer"
            >
              Add Rule
            </button>
          </div>

          {/* Existing Rules List */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-white/60">Active Rules ({rules.length}):</span>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#232227] border-white/10'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-bold truncate">{rule.name}</span>
                  <span className="text-[11px] text-slate-400">
                    If <span className="font-semibold">{rule.conditionField}</span> contains "{rule.conditionValue}" &rarr; {rule.action} ({rule.actionValue})
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer ${
                      rule.enabled ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-3 border-t flex items-center justify-end ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232227] border-white/10'
        }`}>
          <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

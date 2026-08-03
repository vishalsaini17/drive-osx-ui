import React, { useState } from 'react';
import { ConditionalRule } from '../types';
import { X, Plus, Trash2, Check, Sparkles } from 'lucide-react';

interface ConditionalFormatModalProps {
  rules: ConditionalRule[];
  selectedRange: string; // e.g. "B4:E8"
  onSaveRules: (rules: ConditionalRule[]) => void;
  onClose: () => void;
}

export const ConditionalFormatModal: React.FC<ConditionalFormatModalProps> = ({
  rules,
  selectedRange,
  onSaveRules,
  onClose,
}) => {
  const [activeRules, setActiveRules] = useState<ConditionalRule[]>(rules);

  const [ruleType, setRuleType] = useState<'greaterThan' | 'lessThan' | 'equals' | 'contains'>('greaterThan');
  const [inputValue, setInputValue] = useState('10000');
  const [fillColor, setFillColor] = useState('#dcfce7'); // Light green
  const [textColor, setTextColor] = useState('#15803d'); // Dark green

  const handleAddRule = () => {
    const newRule: ConditionalRule = {
      id: 'rule_' + Date.now(),
      type: ruleType,
      value: inputValue,
      range: selectedRange,
      style: {
        bgColor: fillColor,
        color: textColor,
        bold: true,
      },
    };
    setActiveRules((prev) => [...prev, newRule]);
  };

  const handleDeleteRule = (id: string) => {
    setActiveRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Conditional Formatting Rules</h3>
            <span className="text-xs text-slate-500 font-mono bg-slate-200/70 px-2 py-0.5 rounded">Range: {selectedRange}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Add New Rule Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Add Formatting Rule</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Condition Type</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="greaterThan">Cell Value Greater Than (&gt;)</option>
                  <option value="lessThan">Cell Value Less Than (&lt;)</option>
                  <option value="equals">Cell Value Equal To (=)</option>
                  <option value="contains">Text Contains</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Target Value</label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 10000 or High"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Fill:</label>
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Text:</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                  />
                </div>
                {/* Preview Box */}
                <div
                  className="px-3 py-1 rounded text-xs font-bold border border-slate-300 shadow-2xs"
                  style={{ backgroundColor: fillColor, color: textColor }}
                >
                  Preview Text
                </div>
              </div>

              <button
                onClick={handleAddRule}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Add Rule
              </button>
            </div>
          </div>

          {/* Active Rules List */}
          <div>
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
              Active Sheet Rules ({activeRules.length})
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeRules.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No conditional formatting rules created yet.
                </div>
              ) : (
                activeRules.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="px-2.5 py-1 rounded text-xs font-extrabold border"
                        style={{ backgroundColor: r.style?.bgColor, color: r.style?.color }}
                      >
                        Sample
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        <span className="capitalize">{r.type}</span>: <span className="text-indigo-600 font-mono">{r.value}</span>
                        <span className="text-[10px] text-slate-400 font-normal ml-2">({r.range})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(r.id)}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSaveRules(activeRules);
              onClose();
            }}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Check size={14} /> Apply Rules
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}) => {
  return (
    <label className={`flex items-start justify-between gap-4 cursor-pointer select-none ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <div className="text-xs font-medium text-current">{label}</div>}
          {description && <div className="text-[11px] text-slate-400 mt-0.5">{description}</div>}
        </div>
      )}
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
          checked ? 'bg-purple-600' : 'bg-white/20'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  );
};

export default ToggleSwitch;

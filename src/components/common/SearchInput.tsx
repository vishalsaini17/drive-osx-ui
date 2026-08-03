import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  size = 'md',
  autoFocus = false,
}) => {
  const sizeClasses = {
    sm: 'py-1 pl-7 pr-7 text-xs',
    md: 'py-1.5 pl-8 pr-8 text-xs',
    lg: 'py-2 pl-9 pr-9 text-sm',
  };

  const iconSizes = {
    sm: 13,
    md: 14,
    lg: 16,
  };

  const iconOffsets = {
    sm: 'left-2',
    md: 'left-2.5',
    lg: 'left-3',
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={iconSizes[size]}
        className={`absolute ${iconOffsets[size]} text-slate-400 pointer-events-none`}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full bg-black/10 dark:bg-white/10 border border-white/10 rounded-lg text-current placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${sizeClasses[size]}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded-full hover:bg-white/10 cursor-pointer"
        >
          <X size={iconSizes[size] - 1} />
        </button>
      )}
    </div>
  );
};

export default SearchInput;

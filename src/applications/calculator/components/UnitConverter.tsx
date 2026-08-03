import React, { useState, useMemo } from 'react';
import { ArrowRightLeft, Sparkles, Scale, Info, RefreshCw } from 'lucide-react';
import { ConverterCategory, UnitDefinition } from '../types';

const LENGTH_UNITS: UnitDefinition[] = [
  { id: 'm', name: 'Meters', symbol: 'm', ratioToBase: 1 },
  { id: 'km', name: 'Kilometers', symbol: 'km', ratioToBase: 1000 },
  { id: 'cm', name: 'Centimeters', symbol: 'cm', ratioToBase: 0.01 },
  { id: 'mm', name: 'Millimeters', symbol: 'mm', ratioToBase: 0.001 },
  { id: 'mi', name: 'Miles', symbol: 'mi', ratioToBase: 1609.344 },
  { id: 'yd', name: 'Yards', symbol: 'yd', ratioToBase: 0.9144 },
  { id: 'ft', name: 'Feet', symbol: 'ft', ratioToBase: 0.3048 },
  { id: 'in', name: 'Inches', symbol: 'in', ratioToBase: 0.0254 },
  { id: 'nmi', name: 'Nautical Miles', symbol: 'nmi', ratioToBase: 1852 },
];

const WEIGHT_UNITS: UnitDefinition[] = [
  { id: 'kg', name: 'Kilograms', symbol: 'kg', ratioToBase: 1 },
  { id: 'g', name: 'Grams', symbol: 'g', ratioToBase: 0.001 },
  { id: 'mg', name: 'Milligrams', symbol: 'mg', ratioToBase: 0.000001 },
  { id: 'lb', name: 'Pounds', symbol: 'lb', ratioToBase: 0.45359237 },
  { id: 'oz', name: 'Ounces', symbol: 'oz', ratioToBase: 0.028349523125 },
  { id: 't', name: 'Metric Tons', symbol: 't', ratioToBase: 1000 },
  { id: 'st', name: 'Stones', symbol: 'st', ratioToBase: 6.35029 },
];

const STORAGE_UNITS: UnitDefinition[] = [
  { id: 'b', name: 'Bits', symbol: 'b', ratioToBase: 0.125 },
  { id: 'B', name: 'Bytes', symbol: 'B', ratioToBase: 1 },
  { id: 'KB', name: 'Kilobytes', symbol: 'KB', ratioToBase: 1024 },
  { id: 'MB', name: 'Megabytes', symbol: 'MB', ratioToBase: 1024 * 1024 },
  { id: 'GB', name: 'Gigabytes', symbol: 'GB', ratioToBase: 1024 * 1024 * 1024 },
  { id: 'TB', name: 'Terabytes', symbol: 'TB', ratioToBase: 1024 * 1024 * 1024 * 1024 },
  { id: 'PB', name: 'Petabytes', symbol: 'PB', ratioToBase: 1024 * 1024 * 1024 * 1024 * 1024 },
];

const CURRENCY_UNITS: UnitDefinition[] = [
  { id: 'USD', name: 'US Dollar', symbol: '$', ratioToBase: 1 },
  { id: 'EUR', name: 'Euro', symbol: '€', ratioToBase: 1.09 },
  { id: 'GBP', name: 'British Pound', symbol: '£', ratioToBase: 1.27 },
  { id: 'JPY', name: 'Japanese Yen', symbol: '¥', ratioToBase: 0.0065 },
  { id: 'CAD', name: 'Canadian Dollar', symbol: 'C$', ratioToBase: 0.74 },
  { id: 'AUD', name: 'Australian Dollar', symbol: 'A$', ratioToBase: 0.65 },
  { id: 'INR', name: 'Indian Rupee', symbol: '₹', ratioToBase: 0.012 },
  { id: 'CNY', name: 'Chinese Yuan', symbol: '¥', ratioToBase: 0.14 },
  { id: 'CHF', name: 'Swiss Franc', symbol: 'Fr', ratioToBase: 1.13 },
  { id: 'BTC', name: 'Bitcoin (Crypto)', symbol: '₿', ratioToBase: 65000 },
];

export default function UnitConverter() {
  const [category, setCategory] = useState<ConverterCategory>('length');
  const [inputValue, setInputValue] = useState<string>('1');
  const [fromUnitId, setFromUnitId] = useState<string>('m');
  const [toUnitId, setToUnitId] = useState<string>('ft');

  // Handle category switch defaults
  const handleCategoryChange = (cat: ConverterCategory) => {
    setCategory(cat);
    if (cat === 'length') {
      setFromUnitId('m');
      setToUnitId('ft');
    } else if (cat === 'weight') {
      setFromUnitId('kg');
      setToUnitId('lb');
    } else if (cat === 'temperature') {
      setFromUnitId('C');
      setToUnitId('F');
    } else if (cat === 'currency') {
      setFromUnitId('USD');
      setToUnitId('EUR');
    } else if (cat === 'storage') {
      setFromUnitId('GB');
      setToUnitId('MB');
    }
  };

  // Get active units list
  const activeUnitsList = useMemo(() => {
    switch (category) {
      case 'length': return LENGTH_UNITS;
      case 'weight': return WEIGHT_UNITS;
      case 'currency': return CURRENCY_UNITS;
      case 'storage': return STORAGE_UNITS;
      default: return [];
    }
  }, [category]);

  // Conversion logic
  const convertedResult = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) return '0';

    if (category === 'temperature') {
      if (fromUnitId === toUnitId) return num.toString();
      let celsius = num;
      if (fromUnitId === 'F') celsius = (num - 32) * (5 / 9);
      if (fromUnitId === 'K') celsius = num - 273.15;

      if (toUnitId === 'C') return celsius.toFixed(4);
      if (toUnitId === 'F') return (celsius * (9 / 5) + 32).toFixed(4);
      if (toUnitId === 'K') return (celsius + 273.15).toFixed(4);
      return '0';
    }

    const fromUnit = activeUnitsList.find((u) => u.id === fromUnitId);
    const toUnit = activeUnitsList.find((u) => u.id === toUnitId);

    if (!fromUnit || !toUnit) return '0';

    const baseValue = num * fromUnit.ratioToBase;
    const result = baseValue / toUnit.ratioToBase;
    
    // Format elegantly
    if (Math.abs(result) < 0.00001 && result !== 0) {
      return result.toExponential(6);
    }
    return parseFloat(result.toFixed(6)).toString();
  }, [inputValue, category, fromUnitId, toUnitId, activeUnitsList]);

  const handleSwap = () => {
    const temp = fromUnitId;
    setFromUnitId(toUnitId);
    setToUnitId(temp);
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 max-w-2xl mx-auto w-full select-none overflow-y-auto">
      {/* Categories Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs">
        {(
          [
            { id: 'length', name: 'Length' },
            { id: 'weight', name: 'Weight' },
            { id: 'temperature', name: 'Temp' },
            { id: 'currency', name: 'Currency' },
            { id: 'storage', name: 'Storage' },
          ] as { id: ConverterCategory; name: string }[]
        ).map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`py-2 px-3 rounded-xl font-bold cursor-pointer transition-all text-center ${
              category === cat.id
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Converter Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <Scale className="w-4 h-4" /> Unit Converter
          </span>
          {category === 'currency' && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Exchange Simulation
            </span>
          )}
        </div>

        {/* Input & Output Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative">
          {/* FROM field */}
          <div className="flex flex-col gap-1.5 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
            <span className="text-[11px] font-bold text-zinc-400 uppercase">From</span>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full font-mono text-2xl font-bold bg-transparent outline-none text-zinc-900 dark:text-zinc-100"
              placeholder="Enter value"
            />
            {category === 'temperature' ? (
              <select
                value={fromUnitId}
                onChange={(e) => setFromUnitId(e.target.value)}
                className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                <option value="C">Celsius (°C)</option>
                <option value="F">Fahrenheit (°F)</option>
                <option value="K">Kelvin (K)</option>
              </select>
            ) : (
              <select
                value={fromUnitId}
                onChange={(e) => setFromUnitId(e.target.value)}
                className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                {activeUnitsList.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Swap Button Floating */}
          <div className="flex justify-center md:absolute md:left-1/2 md:-translate-x-1/2 z-10">
            <button
              onClick={handleSwap}
              className="p-3 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-md transition-transform hover:scale-110 cursor-pointer"
              title="Swap From and To units"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* TO field */}
          <div className="flex flex-col gap-1.5 p-3.5 bg-purple-500/5 dark:bg-purple-950/20 rounded-xl border border-purple-500/30">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">To (Result)</span>
            <div className="w-full font-mono text-2xl font-bold text-purple-600 dark:text-purple-300 truncate">
              {convertedResult}
            </div>
            {category === 'temperature' ? (
              <select
                value={toUnitId}
                onChange={(e) => setToUnitId(e.target.value)}
                className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-purple-500/30 text-xs font-semibold cursor-pointer"
              >
                <option value="C">Celsius (°C)</option>
                <option value="F">Fahrenheit (°F)</option>
                <option value="K">Kelvin (K)</option>
              </select>
            ) : (
              <select
                value={toUnitId}
                onChange={(e) => setToUnitId(e.target.value)}
                className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-purple-500/30 text-xs font-semibold cursor-pointer"
              >
                {activeUnitsList.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Formula breakdown footer */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Info className="w-4 h-4 shrink-0 text-purple-500" />
          <span>
            Formula: 1 {fromUnitId} = {convertedResult} {toUnitId}
          </span>
        </div>
      </div>
    </div>
  );
}

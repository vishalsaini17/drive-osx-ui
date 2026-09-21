import React, { useState, useEffect, useRef } from 'react';
import { Calculator as CalcIcon, Clock, Binary, Scale, FlaskConical, Landmark } from 'lucide-react';
import { CalculatorMode, HistoryItem, AngleUnit, ProgrammerBase, WordSize } from './types';
import BasicCalculator from './components/BasicCalculator';
import ScientificCalculator from './components/ScientificCalculator';
import ProgrammerCalculator from './components/ProgrammerCalculator';
import UnitConverter from './components/UnitConverter';
import FinancialCalculator from './components/FinancialCalculator';
import HistoryPanel from './components/HistoryPanel';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';

const MODE_TABS: { id: CalculatorMode; label: string; icon: typeof CalcIcon }[] = [
  { id: 'basic', label: 'Basic', icon: CalcIcon },
  { id: 'scientific', label: 'Scientific', icon: FlaskConical },
  { id: 'programmer', label: 'Programmer', icon: Binary },
  { id: 'financial', label: 'Financial', icon: Landmark },
  { id: 'converter', label: 'Converter', icon: Scale },
];

export default function CalculatorApp({ windowId = 'calculator' }: { windowId?: string }) {
  // Tracks this window's own rendered width — the mode switcher (5 tabs,
  // each with an icon and a full label) previously had no compact
  // treatment and relied on `flex-wrap` to avoid overflowing, which kept it
  // on-screen but wrapped it into a second, unevenly-spaced row on a phone
  // window. Below `isCompactHeader` it drops to icon-only tabs instead, the
  // same treatment the Clock app's tab switcher uses for the same problem.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(680);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const isCompactHeader = containerWidth < 480;

  const [mode, setMode] = useState<CalculatorMode>('basic');
  const [display, setDisplay] = useState<string>('0');
  const [expression, setExpression] = useState<string>('');
  const [memory, setMemory] = useState<number | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('calculator_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Scientific state
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('deg');

  // Programmer state
  const [programmerValue, setProgrammerValue] = useState<number>(0);
  const [programmerBase, setProgrammerBase] = useState<ProgrammerBase>('DEC');
  const [wordSize, setWordSize] = useState<WordSize>('32bit');

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('calculator_history', JSON.stringify(history));
    } catch {}
  }, [history]);

  // Helper to add history
  const addHistoryItem = (expr: string, res: string) => {
    if (!expr || !res || res === 'Error') return;
    const newItem: HistoryItem = {
      id: `calc-${Date.now()}-${Math.random()}`,
      expression: expr,
      result: res,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    };
    setHistory((prev) => [newItem, ...prev].slice(0, 50));
  };

  // Safe Math Expression Evaluator
  const evaluateExpression = (expr: string): string => {
    try {
      // Replace display symbols with JS math equivalents
      let sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E')
        .replace(/\^/g, '**');

      // Factorial helper
      sanitized = sanitized.replace(/(\d+)!/g, (_, num) => {
        let n = parseInt(num, 10);
        if (n < 0 || n > 170) return 'NaN';
        let fact = 1;
        for (let i = 2; i <= n; i++) fact *= i;
        return fact.toString();
      });

      // Trig handlers according to angleUnit (deg vs rad)
      if (angleUnit === 'deg') {
        sanitized = sanitized
          .replace(/sin\(([^)]+)\)/g, (_, val) => `Math.sin((${val}) * Math.PI / 180)`)
          .replace(/cos\(([^)]+)\)/g, (_, val) => `Math.cos((${val}) * Math.PI / 180)`)
          .replace(/tan\(([^)]+)\)/g, (_, val) => `Math.tan((${val}) * Math.PI / 180)`)
          .replace(/asin\(([^)]+)\)/g, (_, val) => `(Math.asin(${val}) * 180 / Math.PI)`)
          .replace(/acos\(([^)]+)\)/g, (_, val) => `(Math.acos(${val}) * 180 / Math.PI)`)
          .replace(/atan\(([^)]+)\)/g, (_, val) => `(Math.atan(${val}) * 180 / Math.PI)`);
      } else {
        sanitized = sanitized
          .replace(/sin/g, 'Math.sin')
          .replace(/cos/g, 'Math.cos')
          .replace(/tan/g, 'Math.tan')
          .replace(/asin/g, 'Math.asin')
          .replace(/acos/g, 'Math.acos')
          .replace(/atan/g, 'Math.atan');
      }

      sanitized = sanitized
        .replace(/sinh/g, 'Math.sinh')
        .replace(/cosh/g, 'Math.cosh')
        .replace(/tanh/g, 'Math.tanh')
        .replace(/ln/g, 'Math.log')
        .replace(/log10/g, 'Math.log10')
        .replace(/log2/g, 'Math.log2')
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/cbrt/g, 'Math.cbrt')
        .replace(/abs/g, 'Math.abs');

      // Evaluate safely
      const result = new Function(`return (${sanitized})`)();
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return 'Error';
      }

      // Format result nicely
      if (Math.abs(result) < 0.0000001 && result !== 0) {
        return result.toExponential(6);
      }
      return parseFloat(result.toFixed(10)).toString();
    } catch {
      return 'Error';
    }
  };

  // Button Action Handlers
  const handleDigit = (digit: string) => {
    if (mode === 'programmer') {
      if (display === '0') setDisplay(digit);
      else setDisplay(display + digit);
      
      const newNum = parseInt(display + digit, programmerBase === 'HEX' ? 16 : programmerBase === 'OCT' ? 8 : programmerBase === 'BIN' ? 2 : 10);
      if (!isNaN(newNum)) setProgrammerValue(newNum);
      return;
    }

    if (display === '0' || display === 'Error') {
      setDisplay(digit);
    } else {
      setDisplay(display + digit);
    }
  };

  const handleOperator = (op: string) => {
    setExpression(`${display} ${op} `);
    setDisplay('0');
  };

  const handleEquals = () => {
    if (mode === 'programmer') {
      addHistoryItem(`Programmer (${programmerBase})`, display);
      return;
    }

    const fullExpr = expression ? `${expression}${display}` : display;
    const res = evaluateExpression(fullExpr);
    setDisplay(res);
    setExpression('');
    addHistoryItem(fullExpr, res);
  };

  const handleClear = () => {
    setDisplay('0');
  };

  const handleAllClear = () => {
    setDisplay('0');
    setExpression('');
    setProgrammerValue(0);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handlePercentage = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      const res = (val / 100).toString();
      setDisplay(res);
      addHistoryItem(`${val}%`, res);
    }
  };

  const handleToggleSign = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay((val * -1).toString());
    }
  };

  // Memory operations
  const handleMemoryClear = () => setMemory(null);
  const handleMemoryRead = () => {
    if (memory !== null) setDisplay(memory.toString());
  };
  const handleMemoryAdd = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) setMemory((prev) => (prev ?? 0) + val);
  };
  const handleMemorySub = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) setMemory((prev) => (prev ?? 0) - val);
  };
  const handleMemorySave = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) setMemory(val);
  };

  // Scientific functions
  const handleScientificFunc = (funcName: string) => {
    const val = parseFloat(display);
    let res = '0';
    let exprLabel = '';

    switch (funcName) {
      case 'sin':
      case 'cos':
      case 'tan':
      case 'asin':
      case 'acos':
      case 'atan':
      case 'sinh':
      case 'cosh':
      case 'tanh':
      case 'ln':
      case 'log10':
      case 'log2':
      case 'sqrt':
      case 'cbrt':
      case 'abs':
        exprLabel = `${funcName}(${display})`;
        res = evaluateExpression(exprLabel);
        break;
      case 'square':
        exprLabel = `(${display})²`;
        res = (val * val).toString();
        break;
      case 'cube':
        exprLabel = `(${display})³`;
        res = (val * val * val).toString();
        break;
      case 'exp':
        exprLabel = `e^(${display})`;
        res = Math.exp(val).toString();
        break;
      case 'pow10':
        exprLabel = `10^(${display})`;
        res = Math.pow(10, val).toString();
        break;
      case 'fact':
        exprLabel = `${display}!`;
        res = evaluateExpression(exprLabel);
        break;
      case 'pi':
        res = Math.PI.toString();
        exprLabel = 'π';
        break;
      case 'e':
        res = Math.E.toString();
        exprLabel = 'e';
        break;
      case 'reciprocal':
        exprLabel = `1/(${display})`;
        res = (1 / val).toString();
        break;
      case 'percentage':
        exprLabel = `${display}%`;
        res = (val / 100).toString();
        break;
      default:
        break;
    }

    setDisplay(res);
    addHistoryItem(exprLabel, res);
  };

  // Programmer Bitwise Ops
  const handleBitwiseOp = (op: string) => {
    if (op === 'NOT') {
      const res = ~programmerValue;
      setProgrammerValue(res);
      setDisplay(res.toString());
      addHistoryItem(`~${programmerValue}`, res.toString());
      return;
    }
    // Set expression for binary operation
    setExpression(`${programmerValue} ${op} `);
    setDisplay('0');
  };


  useAppMenu(windowId, [
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'copy', label: 'Copy Result', shortcut: 'Ctrl+C', onSelect: () => navigator.clipboard?.writeText(display) },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', onSelect: async () => {
            try {
              const text = await navigator.clipboard.readText();
              const value = Number(text.trim());
              if (!Number.isNaN(value)) setDisplay(String(value));
            } catch { /* clipboard denied */ }
          } },
        separator(),
        { id: 'clear-history', label: 'Clear History', disabled: history.length === 0, onSelect: () => setHistory([]) },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'mode-basic', label: 'Basic', selected: mode === 'basic', onSelect: () => setMode('basic') },
        { id: 'mode-scientific', label: 'Scientific', selected: mode === 'scientific', onSelect: () => setMode('scientific') },
        { id: 'mode-programmer', label: 'Programmer', selected: mode === 'programmer', onSelect: () => setMode('programmer') },
        { id: 'mode-financial', label: 'Financial', selected: mode === 'financial', onSelect: () => setMode('financial') },
        { id: 'mode-converter', label: 'Unit Converter', selected: mode === 'converter', onSelect: () => setMode('converter') },
        separator(),
        { id: 'history', label: 'History Panel', checked: isHistoryOpen, onSelect: () => setIsHistoryOpen((prev) => !prev) },
      ],
    },
    {
      id: 'options',
      label: 'Options',
      items: [
        { id: 'deg', label: 'Degrees', selected: angleUnit === 'deg', onSelect: () => setAngleUnit('deg') },
        { id: 'rad', label: 'Radians', selected: angleUnit === 'rad', onSelect: () => setAngleUnit('rad') },
        separator(),
        {
          kind: 'submenu', id: 'base', label: 'Number Base',
          items: (['DEC', 'HEX', 'OCT', 'BIN'] as const).map((base) => ({
            id: `base-${base}`, label: base, selected: programmerBase === base,
            onSelect: () => setProgrammerBase(base),
          })),
        },
      ],
    },
  ]);
  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* App Header & Navigation Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 shadow-2xs">
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md shrink-0">
              <CalcIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm tracking-tight truncate">Calculator</h1>
              <p className="text-[10px] text-zinc-400 font-medium truncate">Drive OSX Suite</p>
            </div>
          </div>

          {/* History Toggle Button */}
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold shrink-0 ${
              isHistoryOpen
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Toggle History Sidebar"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
            {history.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className={`mx-3 mb-3 flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold ${isCompactHeader ? '' : 'flex-wrap'}`}>
          {MODE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              title={isCompactHeader ? tab.label : undefined}
              className={`flex-1 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isCompactHeader ? 'py-2' : 'min-w-[5.5rem] px-3 py-1.5'
              } ${
                mode === tab.id
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              {!isCompactHeader && tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area + History Drawer Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Main Display Area (Shown for Basic, Scientific, Programmer) */}
          {mode !== 'converter' && mode !== 'financial' && (
            <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex flex-col justify-end text-right min-h-[100px] shadow-inner select-all">
              <div className="text-xs font-mono text-zinc-400 min-h-[18px] tracking-wide truncate">
                {expression}
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-purple-600 dark:text-purple-400 truncate">
                {display}
              </div>
            </div>
          )}

          {/* Active Mode Screen Component */}
          {mode === 'basic' && (
            <BasicCalculator
              display={display}
              expression={expression}
              memory={memory}
              onDigit={handleDigit}
              onOperator={handleOperator}
              onEquals={handleEquals}
              onClear={handleClear}
              onAllClear={handleAllClear}
              onBackspace={handleBackspace}
              onPercentage={handlePercentage}
              onToggleSign={handleToggleSign}
              onMemoryClear={handleMemoryClear}
              onMemoryRead={handleMemoryRead}
              onMemoryAdd={handleMemoryAdd}
              onMemorySub={handleMemorySub}
              onMemorySave={handleMemorySave}
            />
          )}

          {mode === 'scientific' && (
            <ScientificCalculator
              display={display}
              expression={expression}
              angleUnit={angleUnit}
              setAngleUnit={setAngleUnit}
              onScientificFunc={handleScientificFunc}
              onDigit={handleDigit}
              onOperator={handleOperator}
              onEquals={handleEquals}
              onClear={handleClear}
              onAllClear={handleAllClear}
              onBackspace={handleBackspace}
            />
          )}

          {mode === 'programmer' && (
            <ProgrammerCalculator
              value={programmerValue}
              setValue={setProgrammerValue}
              base={programmerBase}
              setBase={setProgrammerBase}
              wordSize={wordSize}
              setWordSize={setWordSize}
              onBitwiseOp={handleBitwiseOp}
              onDigit={handleDigit}
              onEquals={handleEquals}
              onClear={handleAllClear}
            />
          )}

          {mode === 'financial' && <FinancialCalculator />}

          {mode === 'converter' && <UnitConverter />}
        </div>

        {/* Backdrop for the compact History drawer (HistoryPanel renders it
            `absolute`/slide-in below `isCompactHeader`) — tap outside to
            dismiss, same as the History panel's own close (X) button. */}
        {isCompactHeader && isHistoryOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/20"
            onClick={() => setIsHistoryOpen(false)}
          />
        )}

        {/* History Panel */}
        <HistoryPanel
          isOpen={isHistoryOpen}
          isCompact={isCompactHeader}
          onClose={() => setIsHistoryOpen(false)}
          history={history}
          onClearHistory={() => setHistory([])}
          onSelectHistoryItem={(item) => {
            setDisplay(item.result);
            setExpression(item.expression);
          }}
        />
      </div>
    </div>
  );
}

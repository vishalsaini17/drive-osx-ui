import React, { useMemo, useState } from 'react';
import { Landmark, PiggyBank, Percent, TrendingUp, Info } from 'lucide-react';

type FinancialTool = 'loan' | 'compound' | 'simple' | 'margin';

const COMPOUNDING_OPTIONS = [
  { id: 'annually', label: 'Annually', n: 1 },
  { id: 'semiannually', label: 'Semi-Annually', n: 2 },
  { id: 'quarterly', label: 'Quarterly', n: 4 },
  { id: 'monthly', label: 'Monthly', n: 12 },
  { id: 'daily', label: 'Daily', n: 365 },
] as const;

function formatCurrency(value: number): string {
  if (!isFinite(value)) return '0.00';
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
      <span className="text-[11px] font-bold text-zinc-400 uppercase">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full font-mono text-xl font-bold bg-transparent outline-none text-zinc-900 dark:text-zinc-100 min-w-0"
          placeholder="0"
        />
        {suffix && <span className="text-xs font-bold text-zinc-400 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultTile({ label, value, prefix, highlight }: { label: string; value: string; prefix?: string; highlight?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-1 p-3.5 rounded-xl border ${
        highlight
          ? 'bg-purple-500/5 dark:bg-purple-950/20 border-purple-500/30'
          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <span
        className={`text-[11px] font-bold uppercase ${
          highlight ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-lg font-bold truncate ${
          highlight ? 'text-purple-600 dark:text-purple-300' : 'text-zinc-900 dark:text-zinc-100'
        }`}
      >
        {prefix}
        {value}
      </span>
    </div>
  );
}

export default function FinancialCalculator() {
  const [tool, setTool] = useState<FinancialTool>('loan');

  // Loan / EMI state
  const [loanPrincipal, setLoanPrincipal] = useState('250000');
  const [loanRate, setLoanRate] = useState('7.5');
  const [loanYears, setLoanYears] = useState('20');

  // Compound interest state
  const [ciPrincipal, setCiPrincipal] = useState('10000');
  const [ciRate, setCiRate] = useState('6');
  const [ciYears, setCiYears] = useState('5');
  const [ciFrequency, setCiFrequency] = useState<(typeof COMPOUNDING_OPTIONS)[number]['id']>('monthly');

  // Simple interest state
  const [siPrincipal, setSiPrincipal] = useState('10000');
  const [siRate, setSiRate] = useState('6');
  const [siYears, setSiYears] = useState('5');

  // Profit margin state
  const [costPrice, setCostPrice] = useState('80');
  const [sellPrice, setSellPrice] = useState('100');

  const loanResult = useMemo(() => {
    const P = parseFloat(loanPrincipal);
    const annualRate = parseFloat(loanRate);
    const years = parseFloat(loanYears);
    if (isNaN(P) || isNaN(annualRate) || isNaN(years) || P <= 0 || years <= 0) {
      return { emi: 0, totalPayment: 0, totalInterest: 0 };
    }
    const months = years * 12;
    const monthlyRate = annualRate / 12 / 100;
    let emi: number;
    if (monthlyRate === 0) {
      emi = P / months;
    } else {
      const factor = Math.pow(1 + monthlyRate, months);
      emi = (P * monthlyRate * factor) / (factor - 1);
    }
    const totalPayment = emi * months;
    const totalInterest = totalPayment - P;
    return { emi, totalPayment, totalInterest };
  }, [loanPrincipal, loanRate, loanYears]);

  const compoundResult = useMemo(() => {
    const P = parseFloat(ciPrincipal);
    const annualRate = parseFloat(ciRate);
    const years = parseFloat(ciYears);
    const n = COMPOUNDING_OPTIONS.find((o) => o.id === ciFrequency)?.n ?? 1;
    if (isNaN(P) || isNaN(annualRate) || isNaN(years) || P < 0 || years < 0) {
      return { amount: 0, interest: 0 };
    }
    const amount = P * Math.pow(1 + annualRate / 100 / n, n * years);
    return { amount, interest: amount - P };
  }, [ciPrincipal, ciRate, ciYears, ciFrequency]);

  const simpleResult = useMemo(() => {
    const P = parseFloat(siPrincipal);
    const rate = parseFloat(siRate);
    const years = parseFloat(siYears);
    if (isNaN(P) || isNaN(rate) || isNaN(years)) return { interest: 0, total: 0 };
    const interest = (P * rate * years) / 100;
    return { interest, total: P + interest };
  }, [siPrincipal, siRate, siYears]);

  const marginResult = useMemo(() => {
    const cost = parseFloat(costPrice);
    const sell = parseFloat(sellPrice);
    if (isNaN(cost) || isNaN(sell) || sell <= 0) {
      return { profit: 0, marginPct: 0, markupPct: 0 };
    }
    const profit = sell - cost;
    const marginPct = (profit / sell) * 100;
    const markupPct = cost > 0 ? (profit / cost) * 100 : 0;
    return { profit, marginPct, markupPct };
  }, [costPrice, sellPrice]);

  const TOOLS: { id: FinancialTool; label: string; icon: typeof Landmark }[] = [
    { id: 'loan', label: 'Loan / EMI', icon: Landmark },
    { id: 'compound', label: 'Compound Interest', icon: TrendingUp },
    { id: 'simple', label: 'Simple Interest', icon: PiggyBank },
    { id: 'margin', label: 'Profit Margin', icon: Percent },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 max-w-2xl mx-auto w-full select-none overflow-y-auto">
      {/* Tool Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`py-2 px-2.5 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 text-center ${
              tool === t.id
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50'
            }`}
          >
            <t.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Loan / EMI Calculator */}
      {tool === 'loan' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md flex flex-col gap-4">
          <div className="text-xs font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <Landmark className="w-4 h-4" /> Loan &amp; EMI Calculator
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NumberField label="Loan Amount" value={loanPrincipal} onChange={setLoanPrincipal} suffix="$" />
            <NumberField label="Interest Rate (yr)" value={loanRate} onChange={setLoanRate} suffix="%" />
            <NumberField label="Tenure" value={loanYears} onChange={setLoanYears} suffix="yrs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ResultTile label="Monthly EMI" value={formatCurrency(loanResult.emi)} prefix="$" highlight />
            <ResultTile label="Total Interest" value={formatCurrency(loanResult.totalInterest)} prefix="$" />
            <ResultTile label="Total Payment" value={formatCurrency(loanResult.totalPayment)} prefix="$" />
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Info className="w-4 h-4 shrink-0 text-purple-500" />
            <span>EMI = P × r × (1+r)ⁿ / ((1+r)ⁿ − 1), where r is the monthly rate and n is the number of months.</span>
          </div>
        </div>
      )}

      {/* Compound Interest Calculator */}
      {tool === 'compound' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md flex flex-col gap-4">
          <div className="text-xs font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <TrendingUp className="w-4 h-4" /> Compound Interest Calculator
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NumberField label="Principal" value={ciPrincipal} onChange={setCiPrincipal} suffix="$" />
            <NumberField label="Interest Rate (yr)" value={ciRate} onChange={setCiRate} suffix="%" />
            <NumberField label="Time" value={ciYears} onChange={setCiYears} suffix="yrs" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase px-1">Compounding Frequency</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {COMPOUNDING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCiFrequency(opt.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    ciFrequency === opt.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultTile label="Future Value" value={formatCurrency(compoundResult.amount)} prefix="$" highlight />
            <ResultTile label="Interest Earned" value={formatCurrency(compoundResult.interest)} prefix="$" />
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Info className="w-4 h-4 shrink-0 text-purple-500" />
            <span>A = P × (1 + r/n)^(n×t) — compounded {COMPOUNDING_OPTIONS.find((o) => o.id === ciFrequency)?.label.toLowerCase()}.</span>
          </div>
        </div>
      )}

      {/* Simple Interest Calculator */}
      {tool === 'simple' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md flex flex-col gap-4">
          <div className="text-xs font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <PiggyBank className="w-4 h-4" /> Simple Interest Calculator
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NumberField label="Principal" value={siPrincipal} onChange={setSiPrincipal} suffix="$" />
            <NumberField label="Interest Rate (yr)" value={siRate} onChange={setSiRate} suffix="%" />
            <NumberField label="Time" value={siYears} onChange={setSiYears} suffix="yrs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultTile label="Interest" value={formatCurrency(simpleResult.interest)} prefix="$" highlight />
            <ResultTile label="Total Amount" value={formatCurrency(simpleResult.total)} prefix="$" />
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Info className="w-4 h-4 shrink-0 text-purple-500" />
            <span>Simple Interest = P × r × t / 100</span>
          </div>
        </div>
      )}

      {/* Profit Margin Calculator */}
      {tool === 'margin' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md flex flex-col gap-4">
          <div className="text-xs font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <Percent className="w-4 h-4" /> Profit Margin Calculator
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumberField label="Cost Price" value={costPrice} onChange={setCostPrice} suffix="$" />
            <NumberField label="Selling Price" value={sellPrice} onChange={setSellPrice} suffix="$" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ResultTile label="Profit" value={formatCurrency(marginResult.profit)} prefix="$" highlight />
            <ResultTile label="Margin" value={`${marginResult.marginPct.toFixed(2)}%`} />
            <ResultTile label="Markup" value={`${marginResult.markupPct.toFixed(2)}%`} />
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Info className="w-4 h-4 shrink-0 text-purple-500" />
            <span>Margin = Profit / Selling Price × 100. Markup = Profit / Cost Price × 100.</span>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Sheet, ChartConfig } from '../types';
import { getRangeCellKeys, evaluateFormula, formatCellValue } from '../utils/formula';
import { BarChart2, TrendingUp, PieChart as PieIcon, AreaChart as AreaIcon, X, Download, Plus } from 'lucide-react';

interface ChartStudioProps {
  sheet: Sheet;
  selectedRange: string; // e.g. "A3:E7"
  onClose: () => void;
  onInsertChartToSheet?: (chart: ChartConfig) => void;
}

export const ChartStudio: React.FC<ChartStudioProps> = ({
  sheet,
  selectedRange,
  onClose,
  onInsertChartToSheet,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');
  const [chartTitle, setChartTitle] = useState(`${sheet.name} - Analysis Chart`);

  // Parse range data
  const keys = getRangeCellKeys(selectedRange);
  
  // Extract rows & cols
  const rowsMap: Record<number, Record<number, string>> = {};
  let minCol = 999, maxCol = 0, minRow = 999, maxRow = 0;

  keys.forEach((key) => {
    const colMatch = key.match(/^[A-Z]+/);
    const rowMatch = key.match(/\d+/);
    if (colMatch && rowMatch) {
      const colLetter = colMatch[0];
      let colIdx = 0;
      for (let i = 0; i < colLetter.length; i++) {
        colIdx = colIdx * 26 + (colLetter.charCodeAt(i) - 64);
      }
      colIdx -= 1;
      const rowIdx = parseInt(rowMatch[0], 10) - 1;

      minCol = Math.min(minCol, colIdx);
      maxCol = Math.max(maxCol, colIdx);
      minRow = Math.min(minRow, rowIdx);
      maxRow = Math.max(maxRow, rowIdx);

      if (!rowsMap[rowIdx]) rowsMap[rowIdx] = {};

      const cell = sheet.data[key];
      let val = cell ? cell.value : '';
      if (val.startsWith('=')) {
        val = evaluateFormula(val, sheet.data);
      }
      rowsMap[rowIdx][colIdx] = val;
    }
  });

  // Check if row 0 of selection is headers
  const labels: string[] = [];
  const series: { name: string; values: number[] }[] = [];

  const rowIndices = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);
  const colIndices: number[] = [];
  for (let c = minCol; c <= maxCol; c++) colIndices.push(c);

  if (rowIndices.length > 0) {
    // If first row has text headers
    const firstRow = rowsMap[rowIndices[0]] || {};
    
    // Check if second row or first col has labels
    for (let r = 1; r < rowIndices.length; r++) {
      const rIdx = rowIndices[r];
      const rowData = rowsMap[rIdx] || {};
      const label = rowData[minCol] || `Row ${rIdx + 1}`;
      labels.push(label);
    }

    // Series for each remaining column
    for (let c = minCol + 1; c <= maxCol; c++) {
      const seriesName = firstRow[c] || `Series ${c - minCol}`;
      const vals: number[] = [];
      for (let r = 1; r < rowIndices.length; r++) {
        const rIdx = rowIndices[r];
        const valStr = rowsMap[rIdx]?.[c] || '0';
        const num = parseFloat(valStr.replace(/[\$,]/g, ''));
        vals.push(isNaN(num) ? 0 : num);
      }
      series.push({ name: seriesName, values: vals });
    }
  }

  // Fallback if range is small
  if (series.length === 0) {
    labels.push('A', 'B', 'C', 'D');
    series.push({ name: 'Sample Series', values: [45, 78, 92, 60] });
  }

  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

  // Calculate max value for SVG scaling
  const allVals = series.flatMap((s) => s.values);
  const maxVal = Math.max(...allVals, 10);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Spreadsheet Chart Studio</h3>
            <span className="text-xs text-slate-500 font-mono bg-slate-200/70 px-2 py-0.5 rounded">Range: {selectedRange}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Chart Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">Chart Title</label>
              <input
                type="text"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">Chart Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'bar', label: 'Bar', icon: BarChart2 },
                  { id: 'line', label: 'Line', icon: TrendingUp },
                  { id: 'pie', label: 'Pie', icon: PieIcon },
                  { id: 'area', label: 'Area', icon: AreaIcon },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setChartType(t.id as any)}
                      className={`p-2 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        chartType === t.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart Display */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-inner min-h-[280px] flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-extrabold text-base text-emerald-400 tracking-wide">{chartTitle}</h4>
              <div className="flex items-center gap-3">
                {series.map((s, idx) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[idx % colors.length] }} />
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BAR CHART */}
            {chartType === 'bar' && (
              <div className="h-48 flex items-end justify-between gap-4 pt-6 pb-2 border-b border-slate-700/60 relative">
                {labels.map((label, lIdx) => (
                  <div key={label} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {series.map((s, sIdx) => {
                        const val = s.values[lIdx] || 0;
                        const heightPct = Math.min(100, Math.max(10, (val / maxVal) * 100));
                        return (
                          <div
                            key={s.name}
                            className="flex-1 rounded-t-md transition-all duration-300 hover:brightness-125 relative group/bar"
                            style={{
                              height: `${heightPct}%`,
                              backgroundColor: colors[sIdx % colors.length],
                            }}
                          >
                            <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none">
                              ${val.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 mt-2 truncate max-w-[80px] text-center">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* LINE / AREA CHART */}
            {(chartType === 'line' || chartType === 'area') && (
              <div className="h-48 relative flex items-center justify-center pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {series.map((s, sIdx) => {
                    const color = colors[sIdx % colors.length];
                    const pts = s.values.map((v, i) => {
                      const x = (i / Math.max(1, labels.length - 1)) * 480 + 10;
                      const y = 140 - (v / maxVal) * 120;
                      return `${x},${y}`;
                    });
                    const pathD = `M ${pts.join(' L ')}`;
                    const areaD = `M 10,140 L ${pts.join(' L ')} L ${480},140 Z`;

                    return (
                      <g key={s.name}>
                        {chartType === 'area' && (
                          <path d={areaD} fill={color} fillOpacity={0.25} />
                        )}
                        <path d={pathD} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
                        {s.values.map((v, i) => {
                          const x = (i / Math.max(1, labels.length - 1)) * 480 + 10;
                          const y = 140 - (v / maxVal) * 120;
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r={4}
                              fill="#ffffff"
                              stroke={color}
                              strokeWidth={2.5}
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute bottom-0 w-full flex justify-between px-2 text-[10px] text-slate-400 font-semibold">
                  {labels.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* PIE CHART */}
            {chartType === 'pie' && (
              <div className="h-48 flex items-center justify-center gap-8">
                <div className="w-36 h-36 rounded-full relative overflow-hidden flex items-center justify-center shadow-2xl border-4 border-slate-800">
                  <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                    {(() => {
                      const vals = series[0]?.values || [30, 40, 30];
                      const total = vals.reduce((a, b) => a + b, 0) || 1;
                      let accumulated = 0;
                      return vals.map((v, i) => {
                        const pct = (v / total) * 100;
                        const dashArray = `${pct} ${100 - pct}`;
                        const dashOffset = 100 - accumulated;
                        accumulated += pct;
                        return (
                          <circle
                            key={i}
                            r={16}
                            cx={16}
                            cy={16}
                            fill="transparent"
                            stroke={colors[i % colors.length]}
                            strokeWidth={32}
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div className="flex flex-col gap-1.5 text-xs font-semibold">
                  {labels.map((l, i) => (
                    <div key={l} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-slate-200">{l}:</span>
                      <span className="text-emerald-400 font-bold">${(series[0]?.values[i] || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Ready to display in presentation or report</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (onInsertChartToSheet) {
                  onInsertChartToSheet({
                    id: 'chart_' + Date.now(),
                    title: chartTitle,
                    type: chartType,
                    range: selectedRange,
                    sheetId: sheet.id,
                  });
                }
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Embed Chart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

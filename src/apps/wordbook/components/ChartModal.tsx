import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import WordBookModal from './WordBookModal';

export type ChartType = 'bar' | 'column' | 'line' | 'pie';
export interface DataRow {
  label: string;
  value: string;
}
interface NumericRow {
  label: string;
  value: number;
}

const CHART_TYPES: ChartType[] = ['bar', 'column', 'line', 'pie'];
const CHART_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2', '#db2777', '#65a30d'];
const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 340;

function drawColumn(ctx: CanvasRenderingContext2D, data: NumericRow[]) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const paddingLeft = 36;
  const paddingBottom = 32;
  const paddingTop = 16;
  const paddingRight = 16;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, paddingTop + chartH);
  ctx.lineTo(paddingLeft + chartW, paddingTop + chartH);
  ctx.stroke();

  ctx.fillStyle = '#71717a';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';

  const slot = chartW / data.length;
  const barWidth = slot * 0.6;
  data.forEach((d, i) => {
    const barHeight = (d.value / maxVal) * chartH;
    const x = paddingLeft + i * slot + (slot - barWidth) / 2;
    const y = paddingTop + chartH - barHeight;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#71717a';
    ctx.fillText(d.label.slice(0, 10), x + barWidth / 2, paddingTop + chartH + 14);
  });
}

/** Google distinguishes "Bar" (horizontal) from "Column" (vertical) as separate chart types — this is the horizontal one, not just Column rotated in name only. */
function drawBar(ctx: CanvasRenderingContext2D, data: NumericRow[]) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const paddingLeft = 64;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 12;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, paddingTop + chartH);
  ctx.stroke();

  ctx.font = '10px sans-serif';
  const slot = chartH / data.length;
  const barHeight = slot * 0.6;
  data.forEach((d, i) => {
    const barWidth = (d.value / maxVal) * chartW;
    const y = paddingTop + i * slot + (slot - barHeight) / 2;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(paddingLeft, y, barWidth, barHeight);
    ctx.fillStyle = '#71717a';
    ctx.textAlign = 'right';
    ctx.fillText(d.label.slice(0, 12), paddingLeft - 6, y + barHeight / 2 + 3);
  });
}

function drawLine(ctx: CanvasRenderingContext2D, data: NumericRow[]) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const paddingLeft = 36;
  const paddingBottom = 32;
  const paddingTop = 16;
  const paddingRight = 16;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, paddingTop + chartH);
  ctx.lineTo(paddingLeft + chartW, paddingTop + chartH);
  ctx.stroke();

  ctx.fillStyle = '#71717a';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';

  const slot = chartW / Math.max(data.length - 1, 1);
  ctx.strokeStyle = CHART_COLORS[0];
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = paddingLeft + i * slot;
    const y = paddingTop + chartH - (d.value / maxVal) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  data.forEach((d, i) => {
    const x = paddingLeft + i * slot;
    const y = paddingTop + chartH - (d.value / maxVal) * chartH;
    ctx.fillStyle = CHART_COLORS[0];
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#71717a';
    ctx.fillText(d.label.slice(0, 10), x, paddingTop + chartH + 14);
  });
}

function drawPie(ctx: CanvasRenderingContext2D, data: NumericRow[]) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const cx = width * 0.32;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 16;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  data.forEach((d, i) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fill();
    angle += slice;
  });
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  data.forEach((d, i) => {
    const legendY = 26 + i * 18;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(width * 0.68, legendY - 9, 10, 10);
    ctx.fillStyle = '#3f3f46';
    ctx.fillText(`${d.label.slice(0, 14)} (${d.value})`, width * 0.68 + 14, legendY);
  });
}

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
  /** Preselects a chart type — set when opened from Insert > Chart > Bar/Column/Line/Pie instead of the plain "Chart…" entry. */
  initialType?: ChartType;
  /** Replaces the sample rows — set when opened via Insert > Chart > From Sheets with data read from a real spreadsheet file. */
  initialRows?: DataRow[];
}

const DEFAULT_ROWS: DataRow[] = [
  { label: 'Q1', value: '10' },
  { label: 'Q2', value: '18' },
  { label: 'Q3', value: '14' },
];

/** A real, working chart builder — hand-drawn on canvas (no charting library dependency needed for bar/column/line/pie), rasterized and inserted like any other image. */
export default function ChartModal({ isOpen, onClose, onInsert, initialType, initialRows }: ChartModalProps) {
  const [chartType, setChartType] = useState<ChartType>('column');
  const [rows, setRows] = useState<DataRow[]>(DEFAULT_ROWS);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Re-applied each time the modal opens (its own state otherwise persists
  // between opens, since only the *rendered output* unmounts when closed —
  // see WordBookModal) so a fresh "Bar" click or a new "From Sheets" pick
  // always starts from that intent rather than whatever was left over.
  useEffect(() => {
    if (!isOpen) return;
    if (initialType) setChartType(initialType);
    if (initialRows) setRows(initialRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const numericRows: NumericRow[] = rows
    .map((r) => ({ label: r.label, value: parseFloat(r.value) }))
    .filter((r) => Number.isFinite(r.value) && r.value >= 0);

  useEffect(() => {
    if (!isOpen) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (numericRows.length === 0) return;
    if (chartType === 'pie') drawPie(ctx, numericRows);
    else if (chartType === 'bar') drawBar(ctx, numericRows);
    else if (chartType === 'column') drawColumn(ctx, numericRows);
    else drawLine(ctx, numericRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chartType, JSON.stringify(rows)]);

  const updateRow = (i: number, field: keyof DataRow, v: string) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)));
  const addRow = () => setRows((prev) => [...prev, { label: `Item ${prev.length + 1}`, value: '0' }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onInsert(canvas.toDataURL('image/png'));
    onClose();
  };

  return (
    <WordBookModal
      isOpen={isOpen}
      onClose={onClose}
      title="Chart"
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={numericRows.length === 0}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Insert
          </button>
        </>
      }
    >
      <div className="flex gap-4 flex-wrap">
        <div className="w-52 shrink-0 space-y-2">
          <div className="flex gap-1">
            {CHART_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-2 py-1 text-xs rounded border capitalize cursor-pointer ${
                  chartType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-1 items-center">
                <input
                  value={r.label}
                  onChange={(e) => updateRow(i, 'label', e.target.value)}
                  placeholder="Label"
                  className="w-20 border border-zinc-300 rounded px-1.5 py-1 text-xs"
                />
                <input
                  value={r.value}
                  onChange={(e) => updateRow(i, 'value', e.target.value)}
                  placeholder="Value"
                  className="w-14 border border-zinc-300 rounded px-1.5 py-1 text-xs"
                />
                <button onClick={() => removeRow(i)} className="text-zinc-400 hover:text-red-600 cursor-pointer">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addRow} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
            <Plus size={12} /> Add row
          </button>
        </div>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border border-zinc-300 rounded flex-1 min-w-0" style={{ maxWidth: '100%' }} />
      </div>
    </WordBookModal>
  );
}

import React, { useState } from 'react';
import { SlideElement, ShapeType, ChartType } from '../types';
import {
  Type,
  Image as ImageIcon,
  Film,
  Table as TableIcon,
  BarChart2,
  Square,
  Circle,
  Star,
  Sparkles,
  X,
  Plus,
  TrendingUp,
  PieChart as PieIcon,
  Shield,
  Layers,
} from 'lucide-react';

interface InsertElementModalProps {
  onInsert: (element: Partial<SlideElement>) => void;
  onClose: () => void;
}

export const InsertElementModal: React.FC<InsertElementModalProps> = ({
  onInsert,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'shape' | 'chart' | 'table' | 'image' | 'video'>('shape');

  // Image URL state
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80'
  );
  const [imageCaption, setImageCaption] = useState('Quarterly Analytics Dashboard');

  // Chart config state
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [chartTitle, setChartTitle] = useState('Market Share %');

  // Table rows/cols state
  const [rowsCount, setRowsCount] = useState(4);
  const [colsCount, setColsCount] = useState(3);

  const handleInsertChart = () => {
    onInsert({
      type: 'chart',
      x: 20,
      y: 20,
      width: 60,
      height: 50,
      chartType,
      chartTitle,
      chartData: [
        { label: 'Americas', value: 45, color: '#3b82f6' },
        { label: 'EMEA', value: 30, color: '#10b981' },
        { label: 'APAC', value: 25, color: '#8b5cf6' },
      ],
    });
    onClose();
  };

  const handleInsertTable = () => {
    const tableData: string[][] = [];
    for (let r = 0; r < rowsCount; r++) {
      const row: string[] = [];
      for (let c = 0; c < colsCount; c++) {
        row.push(r === 0 ? `Header ${c + 1}` : `Data ${r}.${c + 1}`);
      }
      tableData.push(row);
    }
    onInsert({
      type: 'table',
      x: 20,
      y: 20,
      width: 60,
      height: 45,
      tableData,
    });
    onClose();
  };

  const handleInsertImage = () => {
    onInsert({
      type: 'image',
      x: 20,
      y: 20,
      width: 50,
      height: 50,
      url: imageUrl,
      caption: imageCaption,
    });
    onClose();
  };

  const handleInsertShape = (shapeType: ShapeType, color: string) => {
    onInsert({
      type: 'shape',
      shapeType,
      x: 35,
      y: 30,
      width: 30,
      height: 30,
      fillColor: color,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Insert Slide Element</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-5 bg-slate-100 p-1 border-b border-slate-200 text-xs font-extrabold">
          {[
            { id: 'shape', label: 'Shapes', icon: Square },
            { id: 'chart', label: 'Charts', icon: BarChart2 },
            { id: 'table', label: 'Tables', icon: TableIcon },
            { id: 'image', label: 'Images', icon: ImageIcon },
            { id: 'video', label: 'Media', icon: Film },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeTab === t.id ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* SHAPES TAB */}
          {activeTab === 'shape' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'rectangle', name: 'Rounded Card', color: '#3b82f6', icon: Square },
                { id: 'circle', name: 'Circle Badge', color: '#10b981', icon: Circle },
                { id: 'badge', name: 'Pill Label', color: '#8b5cf6', icon: Shield },
                { id: 'star', name: 'Highlight Star', color: '#f59e0b', icon: Star },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleInsertShape(s.id as ShapeType, s.color)}
                    className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <div
                      className="p-2.5 rounded-xl text-white shadow-md group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: s.color }}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="text-left">
                      <span className="font-extrabold text-xs text-slate-800 block">{s.name}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Click to place</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* CHARTS TAB */}
          {activeTab === 'chart' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1">Chart Title</label>
                <input
                  type="text"
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bar', label: 'Bar', icon: BarChart2 },
                    { id: 'line', label: 'Line', icon: TrendingUp },
                    { id: 'pie', label: 'Pie', icon: PieIcon },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setChartType(t.id as ChartType)}
                      className={`p-2.5 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        chartType === t.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <t.icon size={16} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleInsertChart}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Insert Interactive Chart
              </button>
            </div>
          )}

          {/* TABLES TAB */}
          {activeTab === 'table' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 mb-1">Rows</label>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={rowsCount}
                    onChange={(e) => setRowsCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 mb-1">Columns</label>
                  <input
                    type="number"
                    min={2}
                    max={6}
                    value={colsCount}
                    onChange={(e) => setColsCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>
              <button
                onClick={handleInsertTable}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Create Table Matrix ({rowsCount}x{colsCount})
              </button>
            </div>
          )}

          {/* IMAGES TAB */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1">Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1">Caption</label>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
              <button
                onClick={handleInsertImage}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Insert Photo Asset
              </button>
            </div>
          )}

          {/* MEDIA TAB */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 text-center">
                <Film size={28} className="mx-auto text-sky-400" />
                <span className="font-extrabold text-xs block">Embedded Video Placeholder</span>
                <p className="text-[11px] text-slate-400">
                  Adds an interactive video card component directly onto the slide stage.
                </p>
              </div>
              <button
                onClick={() => {
                  onInsert({
                    type: 'video',
                    x: 25,
                    y: 25,
                    width: 50,
                    height: 45,
                  });
                  onClose();
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Insert Video Canvas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

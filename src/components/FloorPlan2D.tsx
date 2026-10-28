import React, { useState } from 'react';
import { FloorPlanFurnitureItem } from '../types/makan';
import { RotateCw, Plus, Trash2, Move, Eye } from 'lucide-react';

interface FloorPlan2DProps {
  lengthM: number;
  widthM: number;
  doorsCount: number;
  windowsCount: number;
  items: FloorPlanFurnitureItem[];
  onChangeItems: (items: FloorPlanFurnitureItem[]) => void;
}

const PRESET_FURNITURE_BLOCKS: Omit<FloorPlanFurnitureItem, 'id' | 'xMeters' | 'yMeters'>[] = [
  { nameAr: 'كنبة رئيسية 3 مقاعد', category: 'sofa', widthMeters: 2.2, depthMeters: 0.9, rotationDeg: 0, colorHex: '#C6A355' },
  { nameAr: 'فوتيه مفرد', category: 'chair', widthMeters: 0.85, depthMeters: 0.85, rotationDeg: 0, colorHex: '#B8945F' },
  { nameAr: 'طاولة وسط', category: 'table', widthMeters: 1.2, depthMeters: 0.65, rotationDeg: 0, colorHex: '#D8CEBE' },
  { nameAr: 'وحدة تلفزيون', category: 'tv_unit', widthMeters: 2.0, depthMeters: 0.45, rotationDeg: 0, colorHex: '#7A5B40' },
  { nameAr: 'سرير ماستر', category: 'bed', widthMeters: 1.8, depthMeters: 2.0, rotationDeg: 0, colorHex: '#D9D0C1' },
  { nameAr: 'مكتب عمل', category: 'desk', widthMeters: 1.4, depthMeters: 0.7, rotationDeg: 0, colorHex: '#8C6747' },
  { nameAr: 'دولاب ملابس', category: 'cabinet', widthMeters: 2.2, depthMeters: 0.6, rotationDeg: 0, colorHex: '#5E4938' },
  { nameAr: 'نبات داخلي', category: 'plant', widthMeters: 0.5, depthMeters: 0.5, rotationDeg: 0, colorHex: '#4E7A56' },
];

export const FloorPlan2D: React.FC<FloorPlan2DProps> = ({
  lengthM,
  widthM,
  doorsCount,
  windowsCount,
  items,
  onChangeItems,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);
  const [showCirculationPaths, setShowCirculationPaths] = useState<boolean>(true);

  const safeLength = Math.max(2.5, Math.min(12, lengthM || 5.0));
  const safeWidth = Math.max(2.5, Math.min(10, widthM || 4.0));

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  const handleAddBlock = (preset: Omit<FloorPlanFurnitureItem, 'id' | 'xMeters' | 'yMeters'>) => {
    const newItem: FloorPlanFurnitureItem = {
      ...preset,
      id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      xMeters: +(safeLength / 2 - preset.widthMeters / 2).toFixed(2),
      yMeters: +(safeWidth / 2 - preset.depthMeters / 2).toFixed(2),
    };
    const next = [...items, newItem];
    onChangeItems(next);
    setSelectedId(newItem.id);
  };

  const updateSelected = (patch: Partial<FloorPlanFurnitureItem>) => {
    if (!selectedId) return;
    onChangeItems(items.map((it) => (it.id === selectedId ? { ...it, ...patch } : it)));
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    onChangeItems(items.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-bold text-[#F5F2EB]">
            المخطط الهندسي التفاعلي لتوزيع الأثاث (2D Floor Plan)
          </h3>
          <p className="text-xs text-[#A6A29A] mt-0.5">
            حرّك قطع الأثاث وقم بتدويرها ومراجعة مسارات الحركة بناءً على أبعاد الغرفة ({safeLength}م × {safeWidth}م)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCirculationPaths(!showCirculationPaths)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            showCirculationPaths
              ? 'bg-[#C6A355]/15 border-[#C6A355] text-[#C6A355]'
              : 'bg-[#0B0B0E] border-white/10 text-[#A6A29A]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showCirculationPaths ? 'إخفاء مسارات الحركة' : 'إظهار مسارات الحركة'}</span>
        </button>
      </div>

      {/* Add Furniture Strip */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs text-[#A6A29A] ml-1">إضافة قطعة للمخطط:</span>
        {PRESET_FURNITURE_BLOCKS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleAddBlock(preset)}
            className="px-2.5 py-1.5 text-xs bg-[#0B0B0E] hover:bg-white/5 text-[#EAE4DA] border border-white/10 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3 text-[#C6A355]" />
            <span>{preset.nameAr}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 2D Architectural Canvas */}
        <div className="lg:col-span-2 bg-[#0B0B0E] border border-white/15 rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="text-xs font-mono tabular-nums text-[#C6A355] mb-2">
            الطول: {safeLength} متر
          </div>

          <div className="relative flex items-center">
            <div
              className="relative bg-[#16171B] border-4 border-[#EAE4DA] rounded shadow-inner overflow-hidden"
              style={{
                width: `${Math.min(540, Math.round(safeLength * 85))}px`,
                height: `${Math.min(420, Math.round(safeWidth * 85))}px`,
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '42.5px 42.5px',
              }}
            >
              {/* Circulation Zone Indicator */}
              {showCirculationPaths && (
                <div
                  className="absolute inset-4 border border-dashed border-emerald-400/40 pointer-events-none flex items-end justify-end p-1.5"
                  title="مسار الحركة الآمن"
                >
                  <span className="text-[10px] text-emerald-400/80 bg-[#0B0B0E]/80 px-1.5 py-0.5 rounded">
                    نطاق مسارات الحركة القياسية (60-80 سم)
                  </span>
                </div>
              )}

              {/* Door Indicator on Left Wall */}
              {doorsCount > 0 && (
                <div
                  className="absolute left-0 bottom-6 w-10 h-10 border-t-2 border-r-2 border-dashed border-[#C6A355] rounded-tr-full bg-[#C6A355]/10 pointer-events-none flex items-end pl-1 pb-0.5"
                  title="فتحة الباب ومسار الفتح"
                >
                  <span className="text-[9px] text-[#C6A355]">باب</span>
                </div>
              )}

              {/* Window Indicator on Right Wall */}
              {windowsCount > 0 && (
                <div
                  className="absolute right-0 top-1/3 w-2 h-20 bg-sky-400/60 border border-sky-300 pointer-events-none"
                  title="شباك الإضاءة والتهوية"
                />
              )}

              {/* Furniture Pieces */}
              {items.map((item) => {
                const leftPct = Math.max(0, Math.min(88, (item.xMeters / safeLength) * 100));
                const topPct = Math.max(0, Math.min(88, (item.yMeters / safeWidth) * 100));
                const widthPct = Math.min(95, (item.widthMeters / safeLength) * 100);
                const heightPct = Math.min(95, (item.depthMeters / safeWidth) * 100);
                const isSel = item.id === selectedId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      backgroundColor: item.colorHex + 'CC',
                      transform: `rotate(${item.rotationDeg}deg)`,
                    }}
                    className={`absolute rounded flex flex-col items-center justify-center text-center p-1 transition-shadow cursor-pointer ${
                      isSel
                        ? 'ring-2 ring-[#C6A355] shadow-lg z-20'
                        : 'border border-white/30 hover:border-white z-10'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-[#0B0B0E] leading-tight truncate max-w-full">
                      {item.nameAr}
                    </span>
                    <span className="text-[9px] font-mono tabular-nums text-[#0B0B0E]/80">
                      {item.widthMeters}×{item.depthMeters}م
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mr-3 text-xs font-mono tabular-nums text-[#C6A355] [writing-mode:vertical-rl]">
              العرض: {safeWidth} متر
            </div>
          </div>
        </div>

        {/* Selected Piece Inspector Controls */}
        <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4">
          {selectedItem ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-sm font-bold text-[#C6A355]">{selectedItem.nameAr}</span>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">
                  الموضع الأفقي (X بالمتر): <span className="font-mono">{selectedItem.xMeters}م</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.5, +(safeLength - selectedItem.widthMeters).toFixed(1))}
                  step={0.1}
                  value={selectedItem.xMeters}
                  onChange={(e) => updateSelected({ xMeters: parseFloat(e.target.value) })}
                  className="w-full accent-[#C6A355]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">
                  الموضع الرأسي (Y بالمتر): <span className="font-mono">{selectedItem.yMeters}م</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.5, +(safeWidth - selectedItem.depthMeters).toFixed(1))}
                  step={0.1}
                  value={selectedItem.yMeters}
                  onChange={(e) => updateSelected({ yMeters: parseFloat(e.target.value) })}
                  className="w-full accent-[#C6A355]"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSelected({ rotationDeg: (selectedItem.rotationDeg + 90) % 360 })
                  }
                  className="flex-1 py-2 px-3 bg-[#141418] hover:bg-white/5 border border-white/10 rounded-lg text-xs text-[#F5F2EB] flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#C6A355]" />
                  <span>تدوير 90° ({selectedItem.rotationDeg}°)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1.5">لون القطعة في المخطط:</label>
                <div className="flex items-center gap-2">
                  {['#C6A355', '#D8CEBE', '#8C6747', '#465B6B', '#7E8C7D', '#5E4938'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => updateSelected({ colorHex: hex })}
                      className={`w-6 h-6 rounded-full border ${
                        selectedItem.colorHex === hex ? 'border-white scale-110' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#A6A29A]">
              <Move className="w-6 h-6 text-[#C6A355] mx-auto mb-2 opacity-80" />
              اضغط على أي قطعة أثاث داخل المخطط لتحريكها أو تدويرها، أو أضف قطعة جديدة من الشريط العلوي.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCcw,
  Columns,
  Sliders,
  Sparkles,
  Check,
} from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabelAr?: string;
  afterLabelAr?: string;
  preservedElementsAr?: string[];
  aiNotesAr?: string;
  onRevertToOriginal?: () => void;
  onSaveToFavorites?: () => void;
  isFavorite?: boolean;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabelAr = 'قبل (الصورة الأصلية)',
  afterLabelAr = 'بعد (تصميم مكان AI)',
  preservedElementsAr = [],
  aiNotesAr,
  onRevertToOriginal,
  onSaveToFavorites,
  isFavorite = false,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'slider' | 'sideBySide' | 'beforeOnly' | 'afterOnly'>('slider');
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPos(Math.round(percent * 10) / 10);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = afterUrl;
    a.download = `makan-ai-design-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#0B0B0E]/95 p-4 md:p-8 flex flex-col justify-between overflow-auto'
          : 'w-full'
      }`}
    >
      {/* Top Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-[#141418] border border-white/10 rounded-xl p-2.5">
        <div className="flex items-center gap-1 bg-[#0B0B0E] p-1 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              viewMode === 'slider'
                ? 'bg-[#C6A355] text-[#0B0B0E] font-semibold'
                : 'text-[#A6A29A] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>مقارنة بالسحب</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('sideBySide')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              viewMode === 'sideBySide'
                ? 'bg-[#C6A355] text-[#0B0B0E] font-semibold'
                : 'text-[#A6A29A] hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>جنباً إلى جنب</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('afterOnly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'afterOnly'
                ? 'bg-[#C6A355] text-[#0B0B0E] font-semibold'
                : 'text-[#A6A29A] hover:text-white'
            }`}
          >
            بعد فقط
          </button>
          <button
            type="button"
            onClick={() => setViewMode('beforeOnly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'beforeOnly'
                ? 'bg-[#C6A355] text-[#0B0B0E] font-semibold'
                : 'text-[#A6A29A] hover:text-white'
            }`}
          >
            قبل فقط
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0B0B0E] px-2 py-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
              className="p-1 text-[#A6A29A] hover:text-white transition-colors"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono tabular-nums text-[#F5F2EB] px-1.5">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.25, +(z + 0.25).toFixed(2)))}
              className="p-1 text-[#A6A29A] hover:text-white transition-colors"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {onSaveToFavorites && (
            <button
              type="button"
              onClick={onSaveToFavorites}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                isFavorite
                  ? 'bg-[#C6A355]/20 border-[#C6A355] text-[#C6A355]'
                  : 'bg-[#0B0B0E] border-white/10 text-[#F5F2EB] hover:border-[#C6A355]/60'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isFavorite ? 'محفوظ في المفضلة' : 'حفظ النتيجة'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 text-xs font-medium bg-[#0B0B0E] hover:bg-white/5 text-[#F5F2EB] border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#C6A355]" />
            <span>تحميل الصورة</span>
          </button>

          {onRevertToOriginal && (
            <button
              type="button"
              onClick={onRevertToOriginal}
              className="px-3 py-1.5 text-xs font-medium bg-[#0B0B0E] hover:bg-white/5 text-[#A6A29A] hover:text-white border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              title="العودة إلى الصورة الأصلية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>الأصلية</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-[#0B0B0E] hover:bg-white/5 text-[#F5F2EB] border border-white/10 rounded-lg transition-colors"
            title={isFullscreen ? 'إغلاق ملء الشاشة' : 'عرض ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      {viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0B0B0E]">
            <img
              src={beforeUrl}
              alt={beforeLabelAr}
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover"
            />
            <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm px-3 py-1 rounded text-xs text-white">
              {beforeLabelAr}
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-[#C6A355]/40 bg-[#0B0B0E]">
            <img
              src={afterUrl}
              alt={afterLabelAr}
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-[#C6A355] text-[#0B0B0E] font-semibold px-3 py-1 rounded text-xs">
              {afterLabelAr}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          onMouseDown={() => {
            if (viewMode === 'slider') isDraggingRef.current = true;
          }}
          onMouseUp={() => {
            isDraggingRef.current = false;
          }}
          onMouseLeave={() => {
            isDraggingRef.current = false;
          }}
          onMouseMove={(e) => {
            if (isDraggingRef.current && viewMode === 'slider') {
              handleMove(e.clientX);
            }
          }}
          onTouchMove={(e) => {
            if (viewMode === 'slider' && e.touches[0]) {
              handleMove(e.touches[0].clientX);
            }
          }}
          onClick={(e) => {
            if (viewMode === 'slider') handleMove(e.clientX);
          }}
          className="relative w-full rounded-xl overflow-hidden border border-white/15 bg-[#09090B] select-none cursor-ew-resize"
        >
          <div
            className="relative w-full aspect-[16/10] max-h-[580px] transition-transform duration-150 origin-center"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Base Layer: AFTER (Result) */}
            <img
              src={viewMode === 'beforeOnly' ? beforeUrl : afterUrl}
              alt={afterLabelAr}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover block"
              draggable={false}
            />

            {/* Clipped Overlay Layer: BEFORE (Original) when in slider mode */}
            {viewMode === 'slider' && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
              >
                <img
                  src={beforeUrl}
                  alt={beforeLabelAr}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover block"
                  draggable={false}
                />
              </div>
            )}

            {/* Vertical Divider Handle */}
            {viewMode === 'slider' && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#C6A355] shadow-[0_0_12px_rgba(0,0,0,0.9)] pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#C6A355] text-[#0B0B0E] shadow-lg flex items-center justify-center font-bold text-xs border-2 border-[#0B0B0E]">
                  ⇄
                </div>
              </div>
            )}
          </div>

          {/* Labels */}
          {viewMode === 'slider' && (
            <>
              <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm px-3 py-1 rounded text-xs text-white pointer-events-none">
                {beforeLabelAr}
              </div>
              <div className="absolute bottom-3 left-3 bg-[#C6A355] text-[#0B0B0E] font-semibold px-3 py-1 rounded text-xs pointer-events-none">
                {afterLabelAr}
              </div>
            </>
          )}
        </div>
      )}

      {/* Architectural Integrity & AI Notes Strip */}
      {(preservedElementsAr.length > 0 || aiNotesAr) && (
        <div className="mt-3 p-3.5 rounded-xl bg-[#141418] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {aiNotesAr && (
            <div className="flex items-start gap-2 text-[#EAE4DA]">
              <Sparkles className="w-4 h-4 text-[#C6A355] shrink-0 mt-0.5" />
              <span>{aiNotesAr}</span>
            </div>
          )}
          {preservedElementsAr.length > 0 && (
            <div className="text-[#A6A29A] shrink-0">
              <span className="text-[#C6A355] font-medium">عناصر تم الحفاظ عليها: </span>
              {preservedElementsAr.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

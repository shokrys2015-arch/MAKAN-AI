import React from 'react';
import {
  SmartRoomAnalysis,
  DetailedDesignAdvice,
  RoomDimensionsInput,
} from '../types/makan';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Palette,
  Layers,
  Lightbulb,
  Compass,
  ListChecks,
} from 'lucide-react';

interface ArchitecturalPlanPanelProps {
  analysis?: SmartRoomAnalysis;
  advice?: DetailedDesignAdvice;
  dimensions: RoomDimensionsInput;
  isAnalyzing: boolean;
  onRefreshAnalysis: () => void;
}

export const ArchitecturalPlanPanel: React.FC<ArchitecturalPlanPanelProps> = ({
  analysis,
  advice,
  dimensions,
  isAnalyzing,
  onRefreshAnalysis,
}) => {
  const effectiveAdvice = advice || analysis?.designAdvice;
  const palette = analysis?.estimatedInsights?.palette || [];
  const strengths = analysis?.estimatedInsights?.strengthsAr || [];
  const weaknesses = analysis?.estimatedInsights?.weaknessesAr || [];

  return (
    <div className="space-y-5">
      {/* 1. Executive Architectural Design Plan (from VISION AI) */}
      {effectiveAdvice && (
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
            <div>
              <h4 className="text-sm font-bold text-[#F5F2EB] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C6A355]" />
                <span>الخطة التنفيذية الهندسية وتوزيع الألوان القياسي (60-30-10)</span>
              </h4>
              <p className="text-xs text-[#A6A29A] mt-0.5">
                خطة تشطيب وفرش محسوبة بناءً على اختياراتك وأبعاد الفراغ ({dimensions.widthM}م × {dimensions.lengthM}م × {dimensions.heightM}م)
              </p>
            </div>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={onRefreshAnalysis}
              className="px-3.5 py-2 bg-[#0B0B0E] hover:bg-white/5 text-[#C6A355] border border-[#C6A355]/40 rounded-xl text-xs font-bold transition-colors"
            >
              {isAnalyzing ? 'جارٍ التحديث عبر Gemini...' : 'تحديث التحليل والخطة المعمارية'}
            </button>
          </div>

          {/* 4 Architectural Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="text-[#C6A355] font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>رؤية الطراز والتكوين المعماري</span>
              </div>
              <p className="text-[#EAE4DA] leading-relaxed">{effectiveAdvice.styleDefinition}</p>
            </div>

            <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="text-[#C6A355] font-bold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>التخطيط المكاني ومسارات الحركة</span>
              </div>
              <p className="text-[#EAE4DA] leading-relaxed">{effectiveAdvice.spatialPlanning}</p>
            </div>

            <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="text-[#C6A355] font-bold flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>توزيع الطبقات الضوئية (Kelvin)</span>
              </div>
              <p className="text-[#EAE4DA] leading-relaxed">{effectiveAdvice.lightingLayout}</p>
            </div>

            <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="text-[#C6A355] font-bold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>تناغم الخامات والملمس البصري</span>
              </div>
              <p className="text-[#EAE4DA] leading-relaxed">
                {effectiveAdvice.materialsAndTexturalDetails}
              </p>
            </div>
          </div>

          {/* Golden Color Rule 60% - 30% - 10% (Pantone Breakdown) */}
          {effectiveAdvice.pantoneColors && effectiveAdvice.pantoneColors.length > 0 && (
            <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-[#F5F2EB] flex items-center justify-between">
                <span>قاعدة التوازن اللوني الذهبية (60% أساسي · 30% ثانوي · 10% لكنة)</span>
                <span className="text-[11px] text-[#C6A355] font-mono">60 / 30 / 10 Rule</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {effectiveAdvice.pantoneColors.map((pc, idx) => (
                  <div
                    key={idx}
                    className="bg-[#141418] border border-white/10 rounded-xl p-3 flex items-start gap-3"
                  >
                    <div
                      className="w-11 h-11 rounded-xl border border-white/20 shrink-0 shadow-inner"
                      style={{ backgroundColor: pc.hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#F5F2EB] truncate">
                          {pc.colorName}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#C6A355] bg-[#C6A355]/15 px-1.5 py-0.5 rounded">
                          {pc.ratio}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[#A6A29A] mt-0.5">{pc.hex}</div>
                      <div className="text-[11px] text-[#EAE4DA] mt-1 leading-snug">
                        {pc.purpose}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4 Sequential Execution Steps */}
          {effectiveAdvice.furniturePlacementStepByStep &&
            effectiveAdvice.furniturePlacementStepByStep.length > 0 && (
              <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-[#F5F2EB] flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-[#C6A355]" />
                  <span>خطوات التنفيذ والتشطيب المتسلسلة للمكان:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {effectiveAdvice.furniturePlacementStepByStep.map((step, i) => (
                    <div
                      key={i}
                      className="bg-[#141418] border border-white/5 rounded-lg p-3 flex items-start gap-2.5 text-xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#C6A355] text-[#0B0B0E] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-[#EAE4DA] leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* 2. Architectural Room Analysis (Strengths, Weaknesses & 5-Color HEX Palette) */}
      {analysis && (
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="text-sm font-bold text-[#F5F2EB]">
            التحليل المعماري لحالة الفراغ ونقاط القوة والمعالجة البصرية
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Confirmed Visible + Strengths */}
            <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>مواطن القوة المعمارية والعناصر المؤكدة:</span>
              </div>

              <div className="space-y-1 text-[#EAE4DA]">
                <div>
                  <span className="text-[#A6A29A]">نوع المكان والحالة: </span>
                  <span className="font-semibold">
                    {analysis.confirmedVisible.probableRoomTypeAr} —{' '}
                    {analysis.confirmedVisible.finishConditionAr}
                  </span>
                </div>
                <div>
                  <span className="text-[#A6A29A]">العناصر الثابتة المحمية 100%: </span>
                  <span>{analysis.confirmedVisible.architecturalElementsAr.join(' · ')}</span>
                </div>
              </div>

              {strengths.length > 0 && (
                <ul className="space-y-1.5 pt-2 border-t border-white/10 text-[#EAE4DA]">
                  {strengths.map((st, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Weaknesses & Renovation Priorities */}
            <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="text-amber-400 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>المعالجات الهندسية وأولويات التشطيب:</span>
              </div>

              {weaknesses.length > 0 && (
                <ul className="space-y-1.5 text-[#EAE4DA]">
                  {weaknesses.map((wk, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{wk}</span>
                    </li>
                  ))}
                </ul>
              )}

              <ul className="space-y-1.5 pt-2 border-t border-white/10 text-[#EAE4DA]">
                {analysis.estimatedInsights.renovationPrioritiesAr.map((pr, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#C6A355] font-bold">←</span>
                    <span>{pr}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5-Color Coordinated Palette Strip */}
          {palette.length > 0 && (
            <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-[#F5F2EB]">
                باليتة الألوان الخماسية المتناغمة للمكان (بأكواد HEX):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {palette.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#141418] border border-white/10 rounded-xl p-2.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="w-6 h-6 rounded-lg border border-white/20 shrink-0"
                        style={{ backgroundColor: item.hex }}
                      />
                      <span className="text-[11px] font-mono text-[#C6A355]">{item.hex}</span>
                    </div>
                    <div className="text-xs font-bold text-[#F5F2EB]">{item.name}</div>
                    <div className="text-[10px] text-[#A6A29A] mt-0.5 leading-snug">{item.use}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

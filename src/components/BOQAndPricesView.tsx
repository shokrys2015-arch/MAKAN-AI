import React, { useState } from 'react';
import {
  MakanProject,
  ApartmentRoomUnit,
  RoomDimensionsInput,
  PriceRecord,
  EgyptianRegion,
  QualityTier,
} from '../types/makan';
import {
  EGYPTIAN_REGIONS,
  QUALITY_TIERS,
  DESIGN_STYLES,
  WALL_COLORS,
  WALL_FINISHES,
  FLOORING_OPTIONS,
} from '../data/catalogData';
import {
  calculateRoomBOQ,
  calculateFullApartmentSummary,
} from '../utils/boqCalculator';
import {
  Calculator,
  FileText,
  Database,
  Plus,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Edit3,
  Save,
} from 'lucide-react';

interface BOQAndPricesViewProps {
  project: MakanProject;
  activeRoom: ApartmentRoomUnit;
  priceCatalog: PriceRecord[];
  onUpdateDimensions: (dims: RoomDimensionsInput) => void;
  onUpdatePriceRecord: (record: PriceRecord) => void;
  onSelectRoom: (roomId: string) => void;
}

export const BOQAndPricesView: React.FC<BOQAndPricesViewProps> = ({
  project,
  activeRoom,
  priceCatalog,
  onUpdateDimensions,
  onUpdatePriceRecord,
  onSelectRoom,
}) => {
  const [subTab, setSubTab] = useState<'room_boq' | 'apartment_summary' | 'price_db' | 'report_preview'>('room_boq');
  const [contractorQuotes, setContractorQuotes] = useState<Record<string, number>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('الكل');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<number>(0);
  const [editSourceVal, setEditSourceVal] = useState<string>('');

  // New price record form
  const [showAddPriceModal, setShowAddPriceModal] = useState<boolean>(false);
  const [newMaterialName, setNewMaterialName] = useState<string>('');
  const [newCategoryAr, setNewCategoryAr] = useState<PriceRecord['categoryAr']>('الدهانات');
  const [newUnitAr, setNewUnitAr] = useState<string>('متر مربع');
  const [newPriceEgp, setNewPriceEgp] = useState<number>(350);
  const [newSupplierAr, setNewSupplierAr] = useState<string>('');
  const [newNotesAr, setNewNotesAr] = useState<string>('');

  const dims = activeRoom.dimensions;
  const boq = calculateRoomBOQ(activeRoom.selections, dims, priceCatalog, contractorQuotes);
  const apartmentSummary = calculateFullApartmentSummary(project, priceCatalog);

  const selectedStyle = DESIGN_STYLES.find((s) => s.id === activeRoom.selections.styleId) || DESIGN_STYLES[0];
  const selectedWallColor = WALL_COLORS.find((w) => w.id === activeRoom.selections.wallColorId) || WALL_COLORS[0];
  const selectedWallFinish = WALL_FINISHES.find((f) => f.id === activeRoom.selections.wallFinishId) || WALL_FINISHES[0];
  const selectedFloor = FLOORING_OPTIONS.find((f) => f.id === activeRoom.selections.flooringId) || FLOORING_OPTIONS[0];

  const activeDesignVersion =
    activeRoom.versions.find((v) => v.id === activeRoom.selectedVersionId) ||
    activeRoom.versions[0] ||
    null;

  const handleDimChange = (patch: Partial<RoomDimensionsInput>) => {
    onUpdateDimensions({
      ...dims,
      ...patch,
      isMeasuredByUser: true,
    });
  };

  const handleSaveNewPriceRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;
    const rec: PriceRecord = {
      id: `pr_custom_${Date.now()}`,
      categoryKey: `custom_${Date.now()}`,
      materialNameAr: newMaterialName.trim(),
      categoryAr: newCategoryAr,
      unitAr: newUnitAr.trim() || 'متر مربع',
      qualityTier: dims.qualityTier,
      referencePriceEgp: Number(newPriceEgp) || 100,
      region: dims.region,
      sourceAr: newSupplierAr.trim() || 'إدخال يدوي من المستخدم / عرض سعر مورد',
      supplierNameAr: newSupplierAr.trim(),
      lastUpdated: new Date().toISOString().slice(0, 10),
      notesAr: newNotesAr.trim() || 'سعر مضاف يدوياً في قاعدة البيانات',
    };
    onUpdatePriceRecord(rec);
    setNewMaterialName('');
    setNewSupplierAr('');
    setNewNotesAr('');
    setShowAddPriceModal(false);
  };

  const categories = ['الكل', 'الدهانات', 'تجاليد الحوائط', 'السيراميك والبورسلين', 'الرخام والجرانيت', 'الأخشاب والباركيه', 'الجبس بورد والأسقف', 'الإضاءة والكهرباء', 'المصنعيات والعمالة'];

  const filteredPrices =
    categoryFilter === 'الكل'
      ? priceCatalog
      : priceCatalog.filter((p) => p.categoryAr === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141418] border border-white/10 rounded-xl p-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('room_boq')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              subTab === 'room_boq'
                ? 'bg-[#C6A355] text-[#0B0B0E]'
                : 'text-[#A6A29A] hover:text-white bg-[#0B0B0E]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>حصر كميات وتكلفة الغرفة ({activeRoom.nameAr})</span>
          </button>

          {project.rooms.length > 1 && (
            <button
              type="button"
              onClick={() => setSubTab('apartment_summary')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                subTab === 'apartment_summary'
                  ? 'bg-[#C6A355] text-[#0B0B0E]'
                  : 'text-[#A6A29A] hover:text-white bg-[#0B0B0E]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>ملخص الشقة الكاملة ({project.rooms.length} غرف)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSubTab('price_db')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              subTab === 'price_db'
                ? 'bg-[#C6A355] text-[#0B0B0E]'
                : 'text-[#A6A29A] hover:text-white bg-[#0B0B0E]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>قاعدة بيانات الأسعار المصرية ({priceCatalog.length} بند)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('report_preview')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              subTab === 'report_preview'
                ? 'bg-[#C6A355] text-[#0B0B0E]'
                : 'text-[#A6A29A] hover:text-white bg-[#0B0B0E]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>التقرير الهندسي والتصدير (PDF)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubTab('report_preview');
            setTimeout(() => window.print(), 200);
          }}
          className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-[#F5F2EB] rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Printer className="w-4 h-4 text-[#C6A355]" />
          <span>طباعة / حفظ التقرير PDF</span>
        </button>
      </div>

      {/* TAB 1: ROOM BOQ & ENGINEERING DIMENSIONS */}
      {subTab === 'room_boq' && (
        <div className="space-y-6">
          {/* Accuracy Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              boq.isExactMeasurement
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {boq.isExactMeasurement ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold">
                  {boq.isExactMeasurement
                    ? 'حصر كميات هندسي مبني على مقاساتك المدخلة'
                    : 'تقدير تقريبي محدود الدقة (لم يتم إدخال مقاسات فعلية بعد)'}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">{boq.accuracyNoticeAr}</p>
              </div>
            </div>
            {!boq.isExactMeasurement && (
              <button
                type="button"
                onClick={() => handleDimChange({ isMeasuredByUser: true })}
                className="px-3.5 py-2 rounded-lg bg-amber-400 text-[#0B0B0E] text-xs font-bold whitespace-nowrap shrink-0"
              >
                تأكيد المقاسات الحالية كمقاسات فعلية
              </button>
            )}
          </div>

          {/* Engineering Inputs Grid */}
          <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
            <h3 className="text-base font-bold text-[#F5F2EB] mb-4">
              بيانات أبعاد المكان ومحددات التشطيب (اختياري لزيادة الدقة الهندسية)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">طول الغرفة (متر)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.5"
                  max="25"
                  value={dims.lengthM}
                  onChange={(e) => handleDimChange({ lengthM: parseFloat(e.target.value) || 4.0 })}
                  className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">عرض الغرفة (متر)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.5"
                  max="25"
                  value={dims.widthM}
                  onChange={(e) => handleDimChange({ widthM: parseFloat(e.target.value) || 3.5 })}
                  className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">ارتفاع السقف (متر)</label>
                <input
                  type="number"
                  step="0.05"
                  min="2.4"
                  max="6"
                  value={dims.heightM}
                  onChange={(e) => handleDimChange({ heightM: parseFloat(e.target.value) || 2.9 })}
                  className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">عدد الأبواب</label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={dims.doorsCount}
                  onChange={(e) => handleDimChange({ doorsCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">عدد الشبابيك</label>
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={dims.windowsCount}
                  onChange={(e) => handleDimChange({ windowsCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">حالة المكان الحالية</label>
                <select
                  value={dims.finishScope}
                  onChange={(e) =>
                    handleDimChange({
                      finishScope: e.target.value as RoomDimensionsInput['finishScope'],
                    })
                  }
                  className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                >
                  <option value="semi_finished_to_full">نصف تشطيب (على المحارة)</option>
                  <option value="red_brick_to_full">على الطوب الأحمر (شامل المحارة)</option>
                  <option value="paint_and_decor">تجديد دهانات وديكور وأرضيات</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">المحافظة / المنطقة في مصر</label>
                <select
                  value={dims.region}
                  onChange={(e) => handleDimChange({ region: e.target.value as EgyptianRegion })}
                  className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                >
                  {EGYPTIAN_REGIONS.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#A6A29A] mb-1">مستوى جودة الخامات</label>
                <select
                  value={dims.qualityTier}
                  onChange={(e) => handleDimChange({ qualityTier: e.target.value as QualityTier })}
                  className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                >
                  {QUALITY_TIERS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  id="chk_labor"
                  type="checkbox"
                  checked={dims.includeLabor}
                  onChange={(e) => handleDimChange({ includeLabor: e.target.checked })}
                  className="w-4 h-4 accent-[#C6A355]"
                />
                <label htmlFor="chk_labor" className="text-xs text-[#EAE4DA] cursor-pointer">
                  تضمين بنود المصنعيات والعمالة
                </label>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  id="chk_supervision"
                  type="checkbox"
                  checked={dims.includeSupervisionAndContingency}
                  onChange={(e) =>
                    handleDimChange({ includeSupervisionAndContingency: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#C6A355]"
                />
                <label htmlFor="chk_supervision" className="text-xs text-[#EAE4DA] cursor-pointer">
                  إضافة 10% إشراف هندسي ونقل وتشوينات
                </label>
              </div>
            </div>
          </div>

          {/* Calculated Engineering Quantities Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#141418] border border-white/10 rounded-xl p-3.5">
              <div className="text-xs text-[#A6A29A]">مساحة الأرضية الصافية</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                {boq.geometry.floorAreaM2} م²
              </div>
              <div className="text-[11px] text-[#C6A355] mt-0.5 font-mono tabular-nums">
                شامل الهالك: {boq.quantitiesSummary.floorTilesWithWasteM2} م²
              </div>
            </div>

            <div className="bg-[#141418] border border-white/10 rounded-xl p-3.5">
              <div className="text-xs text-[#A6A29A]">صافي الحوائط القابلة للدهان</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                {boq.geometry.netPaintableWallAreaM2} م²
              </div>
              <div className="text-[11px] text-[#A6A29A] mt-0.5 font-mono tabular-nums">
                بعد خصم {boq.geometry.openingsAreaM2} م² فتحات
              </div>
            </div>

            <div className="bg-[#141418] border border-white/10 rounded-xl p-3.5">
              <div className="text-xs text-[#A6A29A]">كمية الدهانات المطلوبة</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                {boq.quantitiesSummary.paintLitersRequired} لتر
              </div>
              <div className="text-[11px] text-[#C6A355] mt-0.5 font-mono tabular-nums">
                ({boq.quantitiesSummary.paintBuckets18L} بستلة 18L + {boq.quantitiesSummary.puttyBagsRequired} شيكارة معجون)
              </div>
            </div>

            <div className="bg-[#141418] border border-white/10 rounded-xl p-3.5">
              <div className="text-xs text-[#A6A29A]">احتياج الإضاءة والسبوتات</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                {boq.quantitiesSummary.recommendedSpotlightsCount} سبوت
              </div>
              <div className="text-[11px] text-[#A6A29A] mt-0.5 font-mono tabular-nums">
                + {boq.quantitiesSummary.ledStripMeters} م.ط ليد مخفي
              </div>
            </div>

            <div className="bg-[#141418] border border-white/10 rounded-xl p-3.5">
              <div className="text-xs text-[#A6A29A]">إجمالي الخامات والفرش</div>
              <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                {(boq.totals.materialsTotalEgp + boq.totals.furnitureTotalEgp).toLocaleString('en-US')} ج.م
              </div>
              <div className="text-[11px] text-[#A6A29A] mt-0.5 font-mono tabular-nums">
                المصنعيات: {boq.totals.laborTotalEgp.toLocaleString('en-US')} ج.م
              </div>
            </div>

            <div className="bg-[#141418] border border-[#C6A355]/50 rounded-xl p-3.5">
              <div className="text-xs text-[#C6A355] font-semibold">التكلفة التقديرية الإجمالية</div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#C6A355] mt-1">
                {boq.totals.estimatedGrandTotalEgp.toLocaleString('en-US')} ج.م
              </div>
              <div className="text-[11px] text-[#A6A29A] mt-0.5">
                مرتبطة بالتصميم المختار فقط
              </div>
            </div>
          </div>

          {/* Detailed BOQ Table */}
          <div className="bg-[#141418] border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#F5F2EB]">
                  جدول حصر الكميات والمقايسة التقديرية — {activeRoom.nameAr}
                </h3>
                <p className="text-xs text-[#A6A29A] mt-0.5">
                  يفصل الجدول بين سعر الخامة المرجعي، تكلفة المصنعية، والتكلفة الإجمالية، مع إمكانية إدخال عرض السعر الفعلي من مقاولك للمقارنة.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0B0B0E] text-[#A6A29A] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4 font-semibold">البند والتوصيف الهندسي</th>
                    <th className="py-3 px-3 font-semibold">الوحدة</th>
                    <th className="py-3 px-3 font-semibold">الكمية الصافية</th>
                    <th className="py-3 px-3 font-semibold">شامل الهالك</th>
                    <th className="py-3 px-3 font-semibold">سعر الخامة المرجعي</th>
                    <th className="py-3 px-3 font-semibold">إجمالي الخامات</th>
                    <th className="py-3 px-3 font-semibold">إجمالي المصنعيات</th>
                    <th className="py-3 px-3 font-semibold text-[#C6A355]">الإجمالي التقديري</th>
                    <th className="py-3 px-4 font-semibold">عرض سعر المقاول الفعلي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {boq.lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#F5F2EB]">{item.itemNameAr}</div>
                        <div className="text-[11px] text-[#A6A29A] mt-0.5">
                          {item.categoryAr} · المصدر: {item.priceSourceAr} (تحديث {item.lastUpdated})
                        </div>
                        {item.notesAr && (
                          <div className="text-[11px] text-[#C6A355]/90 mt-0.5">{item.notesAr}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#A6A29A] whitespace-nowrap">{item.unitAr}</td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[#F5F2EB]">{item.quantity}</td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[#EAE4DA]">
                        {item.quantityWithWaste}
                        {item.wastePercent > 0 && (
                          <span className="text-[10px] text-[#A6A29A] mr-1">({item.wastePercent}%)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[#F5F2EB]">
                        {item.referenceUnitPriceEgp.toLocaleString('en-US')} ج.م
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[#F5F2EB]">
                        {item.materialTotalEgp.toLocaleString('en-US')} ج.م
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[#A6A29A]">
                        {item.laborTotalEgp.toLocaleString('en-US')} ج.م
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums font-bold text-[#C6A355]">
                        {item.combinedTotalEgp.toLocaleString('en-US')} ج.م
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          placeholder="أدخل عرض المورد..."
                          value={contractorQuotes[item.id] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setContractorQuotes((prev) => {
                              const next = { ...prev };
                              if (v === '') delete next[item.id];
                              else next[item.id] = parseFloat(v) || 0;
                              return next;
                            });
                          }}
                          className="w-28 bg-[#0B0B0E] border border-white/15 rounded px-2 py-1 text-xs font-mono tabular-nums text-[#F5F2EB] focus:border-[#C6A355] outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FULL APARTMENT SUMMARY */}
      {subTab === 'apartment_summary' && (
        <div className="space-y-6">
          <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
            <h3 className="text-base font-bold text-[#F5F2EB]">
              ملخص مشروع الشقة الكاملة — {project.nameAr}
            </h3>
            <p className="text-xs text-[#A6A29A] mt-1">
              يجمع هذا الملخص تكاليف جميع الغرف المضافة في الشقة بالإضافة إلى البنود المشتركة للشقة لمرة واحدة فقط دون تكرار احتساب أي بند.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">
              <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-3.5">
                <div className="text-xs text-[#A6A29A]">إجمالي مسطح الغرف</div>
                <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                  {apartmentSummary.totalFloorAreaM2} م²
                </div>
              </div>
              <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-3.5">
                <div className="text-xs text-[#A6A29A]">خامات جميع الغرف</div>
                <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                  {apartmentSummary.roomsMaterialsTotalEgp.toLocaleString('en-US')} ج.م
                </div>
              </div>
              <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-3.5">
                <div className="text-xs text-[#A6A29A]">مصنعيات جميع الغرف</div>
                <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                  {apartmentSummary.roomsLaborTotalEgp.toLocaleString('en-US')} ج.م
                </div>
              </div>
              <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-3.5">
                <div className="text-xs text-[#A6A29A]">بنود الشقة المشتركة (مرة واحدة)</div>
                <div className="text-lg font-bold font-mono tabular-nums text-[#F5F2EB] mt-1">
                  {apartmentSummary.sharedItemsTotalEgp.toLocaleString('en-US')} ج.م
                </div>
                <div className="text-[10px] text-[#A6A29A] mt-0.5">
                  لوحة الكهرباء الرئيسية + الباب المصفح + التغذية العمومية
                </div>
              </div>
              <div className="bg-[#0B0B0E] border border-[#C6A355]/50 rounded-xl p-3.5">
                <div className="text-xs text-[#C6A355] font-semibold">إجمالي الشقة الكاملة</div>
                <div className="text-xl font-bold font-mono tabular-nums text-[#C6A355] mt-1">
                  {apartmentSummary.apartmentGrandTotalEgp.toLocaleString('en-US')} ج.م
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0B0B0E] text-[#A6A29A] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">الغرفة / المساحة</th>
                    <th className="py-3 px-3">الأبعاد</th>
                    <th className="py-3 px-3">المساحة (م²)</th>
                    <th className="py-3 px-3">خامات التشطيب</th>
                    <th className="py-3 px-3">الأثاث والفرش</th>
                    <th className="py-3 px-3">المصنعيات</th>
                    <th className="py-3 px-3 text-[#C6A355]">إجمالي الغرفة</th>
                    <th className="py-3 px-4">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {apartmentSummary.roomReports.map(({ roomId, roomNameAr, report }) => {
                    const rm = project.rooms.find((r) => r.id === roomId)!;
                    return (
                      <tr key={roomId} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-bold text-[#F5F2EB]">{roomNameAr}</td>
                        <td className="py-3 px-3 font-mono tabular-nums text-[#A6A29A]">
                          {rm.dimensions.lengthM}×{rm.dimensions.widthM}م
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-[#F5F2EB]">
                          {report.geometry.floorAreaM2} م²
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-[#F5F2EB]">
                          {report.totals.materialsTotalEgp.toLocaleString('en-US')} ج.م
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-[#F5F2EB]">
                          {report.totals.furnitureTotalEgp.toLocaleString('en-US')} ج.م
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-[#A6A29A]">
                          {report.totals.laborTotalEgp.toLocaleString('en-US')} ج.م
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums font-bold text-[#C6A355]">
                          {report.totals.estimatedGrandTotalEgp.toLocaleString('en-US')} ج.م
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectRoom(roomId);
                              setSubTab('room_boq');
                            }}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-[#C6A355]"
                          >
                            عرض تفاصيل الغرفة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EGYPTIAN PRICE DATABASE */}
      {subTab === 'price_db' && (
        <div className="space-y-4">
          <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#F5F2EB]">
                  قاعدة بيانات أسعار الخامات والمصنعيات في السوق المصري
                </h3>
                <p className="text-xs text-[#A6A29A] mt-0.5">
                  يمكنك تعديل أي سعر مرجعي يدوياً أو إضافة موردين ومصادر أسعار جديدة ليتم تحديث الحسابات فوراً.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPriceModal(!showAddPriceModal)}
                className="px-4 py-2 bg-[#C6A355] hover:bg-[#d4b265] text-[#0B0B0E] font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة خامة أو مورد جديد</span>
              </button>
            </div>

            {showAddPriceModal && (
              <form
                onSubmit={handleSaveNewPriceRecord}
                className="mb-6 p-4 rounded-xl bg-[#0B0B0E] border border-[#C6A355]/40 grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block text-xs text-[#A6A29A] mb-1">اسم الخامة أو البند</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بورسلين كليوباترا 60×120..."
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                    className="w-full bg-[#141418] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A6A29A] mb-1">الفئة</label>
                  <select
                    value={newCategoryAr}
                    onChange={(e) => setNewCategoryAr(e.target.value as PriceRecord['categoryAr'])}
                    className="w-full bg-[#141418] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB]"
                  >
                    {categories
                      .filter((c) => c !== 'الكل')
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A6A29A] mb-1">الوحدة</label>
                  <input
                    type="text"
                    value={newUnitAr}
                    onChange={(e) => setNewUnitAr(e.target.value)}
                    className="w-full bg-[#141418] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A6A29A] mb-1">السعر المرجعي (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={newPriceEgp}
                    onChange={(e) => setNewPriceEgp(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#141418] border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A6A29A] mb-1">اسم المورد / مصدر السعر</label>
                  <input
                    type="text"
                    placeholder="مثال: معرض السلاب - مدينة نصر"
                    value={newSupplierAr}
                    onChange={(e) => setNewSupplierAr(e.target.value)}
                    className="w-full bg-[#141418] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#C6A355] text-[#0B0B0E] font-bold text-xs rounded-lg"
                  >
                    حفظ السجل في قاعدة البيانات
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPriceModal(false)}
                    className="px-3 py-2 bg-white/5 text-[#A6A29A] text-xs rounded-lg"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {/* Filter tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-[#C6A355] text-[#0B0B0E] font-bold'
                      : 'bg-[#0B0B0E] text-[#A6A29A] hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0B0B0E] text-[#A6A29A] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">اسم الخامة / البند</th>
                    <th className="py-3 px-3">الفئة</th>
                    <th className="py-3 px-3">الوحدة</th>
                    <th className="py-3 px-3">السعر المرجعي (ج.م)</th>
                    <th className="py-3 px-3">مصدر السعر والمورد</th>
                    <th className="py-3 px-3">تاريخ التحديث</th>
                    <th className="py-3 px-4">تعديل السعر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPrices.map((rec) => {
                    const isEditing = editingPriceId === rec.id;
                    return (
                      <tr key={rec.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#F5F2EB]">{rec.materialNameAr}</div>
                          <div className="text-[11px] text-[#A6A29A]">{rec.notesAr}</div>
                        </td>
                        <td className="py-3 px-3 text-[#EAE4DA] whitespace-nowrap">{rec.categoryAr}</td>
                        <td className="py-3 px-3 text-[#A6A29A] whitespace-nowrap">{rec.unitAr}</td>
                        <td className="py-3 px-3 font-mono tabular-nums font-bold text-[#C6A355]">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editPriceVal}
                              onChange={(e) => setEditPriceVal(parseFloat(e.target.value) || 0)}
                              className="w-24 bg-[#0B0B0E] border border-[#C6A355] rounded px-2 py-1 text-xs font-mono text-white"
                            />
                          ) : (
                            `${rec.referencePriceEgp.toLocaleString('en-US')} ج.م`
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#A6A29A]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editSourceVal}
                              onChange={(e) => setEditSourceVal(e.target.value)}
                              className="w-44 bg-[#0B0B0E] border border-[#C6A355] rounded px-2 py-1 text-xs text-white"
                            />
                          ) : (
                            rec.sourceAr
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-[#A6A29A] whitespace-nowrap">
                          {rec.lastUpdated}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdatePriceRecord({
                                  ...rec,
                                  referencePriceEgp: editPriceVal,
                                  sourceAr: editSourceVal,
                                  lastUpdated: new Date().toISOString().slice(0, 10),
                                });
                                setEditingPriceId(null);
                              }}
                              className="px-2.5 py-1 bg-emerald-500 text-[#0B0B0E] font-bold rounded text-xs flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>حفظ</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceId(rec.id);
                                setEditPriceVal(rec.referencePriceEgp);
                                setEditSourceVal(rec.sourceAr);
                              }}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[#EAE4DA] rounded text-xs flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#C6A355]" />
                              <span>تحديث</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRINTABLE ENGINEERING & DESIGN REPORT (Section 24) */}
      {subTab === 'report_preview' && (
        <div className="bg-[#141418] print:bg-white print:text-black border border-white/10 rounded-xl p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
            <div>
              <div className="text-xs text-[#C6A355] font-semibold flex items-center gap-1.5">
                <span>تقرير التصميم الداخلي والمقايسة التقديرية —</span>
                <bdi>مكان</bdi>
                <span>|</span>
                <bdi dir="ltr">MAKAN AI</bdi>
              </div>
              <h2 className="text-2xl font-bold text-[#F5F2EB] print:text-black mt-1">
                مشروع: {project.nameAr} — {activeRoom.nameAr}
              </h2>
              <p className="text-xs text-[#A6A29A] mt-1">
                تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')} · حالة المقاسات:{' '}
                {boq.isExactMeasurement ? 'مقاسات فعلية مدخلة من المستخدم' : 'تقدير تقريبي على أبعاد افتراضية'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print px-5 py-2.5 bg-[#C6A355] text-[#0B0B0E] font-bold text-xs rounded-lg flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير / حفظ كملف PDF</span>
            </button>
          </div>

          {/* Before & After Visuals in Report */}
          {activeDesignVersion && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-white/10 rounded-xl p-3 bg-[#0B0B0E]">
                <div className="text-xs font-semibold text-[#A6A29A] mb-2">الصورة الأصلية قبل التعديل</div>
                <img
                  src={activeDesignVersion.originalDataUrl}
                  alt="الصورة الأصلية"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover rounded-lg"
                />
              </div>
              <div className="border border-[#C6A355]/40 rounded-xl p-3 bg-[#0B0B0E]">
                <div className="text-xs font-semibold text-[#C6A355] mb-2">
                  التصميم المختار ({activeDesignVersion.labelAr})
                </div>
                <img
                  src={activeDesignVersion.resultDataUrl}
                  alt="التصميم المختار"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Design Specifications Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0B0B0E] p-4 rounded-xl border border-white/10 text-xs">
            <div>
              <span className="text-[#A6A29A] block">النمط المختار:</span>
              <strong className="text-[#F5F2EB] text-sm">{selectedStyle.nameAr}</strong>
            </div>
            <div>
              <span className="text-[#A6A29A] block">لون وتشطيب الحوائط:</span>
              <strong className="text-[#F5F2EB] text-sm">
                {selectedWallColor.nameAr} · {selectedWallFinish.nameAr}
              </strong>
            </div>
            <div>
              <span className="text-[#A6A29A] block">الأرضيات المختارة:</span>
              <strong className="text-[#F5F2EB] text-sm">{selectedFloor.nameAr}</strong>
            </div>
            <div>
              <span className="text-[#A6A29A] block">الأبعاد المسجلة:</span>
              <strong className="text-[#F5F2EB] text-sm font-mono tabular-nums">
                {dims.lengthM}م × {dims.widthM}م × ارتفاع {dims.heightM}م
              </strong>
            </div>
          </div>

          {/* Assumptions & Disclaimers */}
          <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-[#C6A355]">الافتراضات الهندسية والتنبيهات المرجعية:</h4>
            <ul className="list-disc list-inside text-xs text-[#A6A29A] space-y-1">
              {boq.assumptionsAr.map((assump, i) => (
                <li key={i}>{assump}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

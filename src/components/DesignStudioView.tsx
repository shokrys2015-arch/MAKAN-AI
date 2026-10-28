import React, { useState, useRef } from 'react';
import {
  MakanProject,
  ApartmentRoomUnit,
  UserDesignSelections,
  UploadedPhoto,
  DesignPathId,
  RoomTypeId,
  MaskZoneId,
  QualityTier,
  FloorPlanFurnitureItem,
} from '../types/makan';
import {
  ROOM_TYPES,
  DESIGN_STYLES,
  WALL_COLORS,
  WALL_FINISHES,
  FLOORING_OPTIONS,
  CEILING_LIGHTING_OPTIONS,
  LIGHTING_TEMPS,
  FURNITURE_CATALOG,
  QUALITY_TIERS,
} from '../data/catalogData';
import {
  getStylePreviewDataUrl,
  SAMPLE_STARTING_ROOMS,
  renderProceduralRoomToDataUrl,
} from '../utils/proceduralRoomRenderer';
import { analyzeImageClarity } from '../utils/imageCompositor';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { FloorPlan2D } from './FloorPlan2D';
import {
  Upload,
  Sparkles,
  Layers,
  Wand2,
  Sliders,
  Check,
  Trash2,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Calculator,
  Compass,
  Brush,
  RotateCcw,
  Star,
  Building2,
} from 'lucide-react';

interface DesignStudioViewProps {
  project: MakanProject;
  activeRoom: ApartmentRoomUnit;
  isGenerating: boolean;
  isAnalyzing: boolean;
  onSelectRoom: (roomId: string) => void;
  onAddRoomToApartment: (nameAr: string, roomType: RoomTypeId) => void;
  onUpdatePhotos: (photos: UploadedPhoto[]) => void;
  onUpdateSelections: (selections: UserDesignSelections) => void;
  onGenerateDesign: (threeAlternatives?: boolean) => void;
  onRunSmartAnalysis: () => void;
  onSelectVersion: (versionId: string) => void;
  onToggleFavoriteVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onUpdateFloorPlanItems: (items: FloorPlanFurnitureItem[]) => void;
  onOpenBOQForSelectedDesign: () => void;
}

export const DesignStudioView: React.FC<DesignStudioViewProps> = ({
  project,
  activeRoom,
  isGenerating,
  isAnalyzing,
  onSelectRoom,
  onAddRoomToApartment,
  onUpdatePhotos,
  onUpdateSelections,
  onGenerateDesign,
  onRunSmartAnalysis,
  onSelectVersion,
  onToggleFavoriteVersion,
  onDeleteVersion,
  onUpdateFloorPlanItems,
  onOpenBOQForSelectedDesign,
}) => {
  const [studioStep, setStudioStep] = useState<1 | 2 | 3>(1);
  const [catalogTab, setCatalogTab] = useState<
    'mask_zone' | 'styles' | 'walls' | 'flooring' | 'ceiling_lighting' | 'furniture'
  >('styles');
  const [newRoomModalOpen, setNewRoomModalOpen] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomType, setNewRoomType] = useState<RoomTypeId>('master_bedroom');
  const [brushRadius, setBrushRadius] = useState<number>(0.05);
  const [show2DPlanner, setShow2DPlanner] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskCanvasRef = useRef<HTMLDivElement>(null);

  const sel = activeRoom.selections;
  const primaryPhoto =
    activeRoom.photos.find((p) => p.isPrimary) || activeRoom.photos[0] || null;
  const activeVersion =
    activeRoom.versions.find((v) => v.id === activeRoom.selectedVersionId) ||
    activeRoom.versions[0] ||
    null;

  const updateSel = (patch: Partial<UserDesignSelections>) => {
    onUpdateSelections({ ...sel, ...patch });
  };

  // Handle uploading 1 or multiple photos from PC or Mobile
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        const img = new Image();
        img.onload = () => {
          const clarity = analyzeImageClarity(img);
          const newPhoto: UploadedPhoto = {
            id: `photo_${Date.now()}_${idx}`,
            name: file.name,
            dataUrl,
            angleLabelAr: activeRoom.photos.length === 0 && idx === 0 ? 'الزاوية الرئيسية' : `زاوية إضافية ${activeRoom.photos.length + idx + 1}`,
            isPrimary: activeRoom.photos.length === 0 && idx === 0,
            clarityCheck: clarity,
          };
          onUpdatePhotos([...activeRoom.photos, newPhoto]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleLoadSampleRoom = (sampleId: string) => {
    const sample = SAMPLE_STARTING_ROOMS.find((s) => s.id === sampleId) || SAMPLE_STARTING_ROOMS[0];
    const dataUrl = renderProceduralRoomToDataUrl({
      width: 960,
      height: 580,
      state: sample.state,
      roomType: sample.roomType,
    });
    const newPhoto: UploadedPhoto = {
      id: `sample_${sample.id}_${Date.now()}`,
      name: sample.nameAr,
      dataUrl,
      angleLabelAr: 'الزاوية الأساسية',
      isPrimary: true,
      clarityCheck: { isClear: true, width: 960, height: 580, brightness: 135 },
    };
    const others = activeRoom.photos.map((p) => ({ ...p, isPrimary: false }));
    onUpdatePhotos([newPhoto, ...others]);
  };

  const handleSetPrimaryPhoto = (photoId: string) => {
    onUpdatePhotos(
      activeRoom.photos.map((p) => ({
        ...p,
        isPrimary: p.id === photoId,
      }))
    );
  };

  const handleDeletePhoto = (photoId: string) => {
    const remaining = activeRoom.photos.filter((p) => p.id !== photoId);
    if (remaining.length > 0 && !remaining.some((p) => p.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    onUpdatePhotos(remaining);
  };

  const handleSelectDesignPath = (pathId: DesignPathId) => {
    if (pathId === 'element_mask') {
      updateSel({
        designPath: 'element_mask',
        activeMaskZones: sel.activeMaskZones.length > 0 ? sel.activeMaskZones : ['walls'],
        preserveArchitecture: true,
      });
      setCatalogTab('mask_zone');
    } else if (pathId === 'quick') {
      updateSel({
        designPath: 'quick',
        modifyWalls: true,
        modifyFloor: true,
        modifyCeiling: true,
        modifyLighting: true,
        modifyFurniture: true,
        modifyCurtains: true,
        preserveArchitecture: true,
      });
      setCatalogTab('styles');
    } else if (pathId === 'custom') {
      updateSel({
        designPath: 'custom',
        preserveArchitecture: true,
      });
      setCatalogTab('walls');
    } else {
      updateSel({
        designPath: 'complete',
        modifyWalls: true,
        modifyFloor: true,
        modifyCeiling: true,
        modifyLighting: true,
        modifyFurniture: true,
        modifyCurtains: true,
        preserveArchitecture: true,
      });
      setCatalogTab('styles');
    }
  };

  const toggleMaskZone = (zone: MaskZoneId) => {
    const exists = sel.activeMaskZones.includes(zone);
    const nextZones = exists
      ? sel.activeMaskZones.filter((z) => z !== zone)
      : [...sel.activeMaskZones, zone];
    updateSel({
      activeMaskZones: nextZones.length > 0 ? nextZones : ['walls'],
      modifyWalls: nextZones.includes('walls'),
      modifyFloor: nextZones.includes('floor'),
      modifyCeiling: nextZones.includes('ceiling'),
      modifyLighting: nextZones.includes('lighting'),
      modifyFurniture: nextZones.includes('furniture'),
      modifyCurtains: nextZones.includes('curtains'),
    });
  };

  const handleCanvasBrushClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (sel.designPath !== 'element_mask' || !sel.activeMaskZones.includes('custom_brush')) return;
    if (!maskCanvasRef.current) return;
    const rect = maskCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    updateSel({
      customBrushStrokes: [...sel.customBrushStrokes, { x, y, radius: brushRadius }],
    });
  };

  const selectedWallColorObj =
    WALL_COLORS.find((w) => w.id === sel.wallColorId) || WALL_COLORS[0];

  const applicableFurniture = FURNITURE_CATALOG.filter((f) =>
    f.applicableRooms.includes(sel.roomType)
  );

  return (
    <div className="space-y-5">
      {/* Unified Compact Top Studio Bar */}
      <div className="bg-[#141418] border border-white/10 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Right side: 3 Clear Steps */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStudioStep(1)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              studioStep === 1
                ? 'bg-[#C6A355] text-[#0B0B0E]'
                : 'bg-[#0B0B0E] text-[#A6A29A] hover:text-white border border-white/5'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. صورة المكان</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioStep(2)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              studioStep === 2
                ? 'bg-[#C6A355] text-[#0B0B0E]'
                : 'bg-[#0B0B0E] text-[#A6A29A] hover:text-white border border-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. الألوان والخامات</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioStep(3)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              studioStep === 3
                ? 'bg-[#C6A355] text-[#0B0B0E]'
                : 'bg-[#0B0B0E] text-[#A6A29A] hover:text-white border border-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. النتيجة والمقارنة</span>
          </button>
        </div>

        {/* Left side: Context actions or Multi-room pills (only if user added rooms) */}
        <div className="flex flex-wrap items-center gap-2">
          {project.rooms.length > 1 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              {project.rooms.map((rm) => (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => onSelectRoom(rm.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    rm.id === activeRoom.id
                      ? 'bg-white/15 text-[#C6A355] border border-[#C6A355]/50'
                      : 'bg-[#0B0B0E] text-[#A6A29A] hover:text-white border border-white/10'
                  }`}
                >
                  {rm.nameAr}
                </button>
              ))}
            </div>
          )}

          {studioStep === 3 ? (
            <>
              <button
                type="button"
                onClick={() => setStudioStep(2)}
                className="px-3 py-1.5 bg-[#0B0B0E] hover:bg-white/5 text-[#EAE4DA] border border-white/15 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#C6A355]" />
                <span>تعديل الاختيارات</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => onGenerateDesign(true)}
                className="px-3 py-1.5 bg-[#0B0B0E] hover:bg-white/5 text-[#C6A355] border border-[#C6A355]/40 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>3 بدائل</span>
              </button>

              <button
                type="button"
                onClick={onOpenBOQForSelectedDesign}
                className="px-3.5 py-1.5 bg-[#C6A355] hover:bg-[#d4b265] text-[#0B0B0E] font-bold text-xs rounded-lg flex items-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>حساب التكلفة</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setNewRoomModalOpen(!newRoomModalOpen)}
              className="px-3 py-1.5 bg-[#0B0B0E] hover:bg-white/5 text-[#A6A29A] hover:text-[#C6A355] border border-white/10 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-[#C6A355]" />
              <span>إضافة غرفة أخرى</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Room Inline Modal */}
      {newRoomModalOpen && (
        <div className="bg-[#141418] border border-[#C6A355]/50 rounded-xl p-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[#A6A29A] mb-1">اسم الغرفة الجديدة</label>
            <input
              type="text"
              placeholder="مثال: غرفة النوم / المطبخ / المكتب..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB]"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs text-[#A6A29A] mb-1">نوع الغرفة</label>
            <select
              value={newRoomType}
              onChange={(e) => setNewRoomType(e.target.value as RoomTypeId)}
              className="w-full bg-[#0B0B0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F5F2EB]"
            >
              {ROOM_TYPES.filter((r) => r.id !== 'full_apartment').map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameAr}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const defaultTitle =
                  newRoomName.trim() ||
                  ROOM_TYPES.find((r) => r.id === newRoomType)?.nameAr ||
                  'غرفة جديدة';
                onAddRoomToApartment(defaultTitle, newRoomType);
                setNewRoomName('');
                setNewRoomModalOpen(false);
              }}
              className="px-4 py-2 bg-[#C6A355] text-[#0B0B0E] font-bold text-xs rounded-lg"
            >
              إضافة الغرفة
            </button>
            <button
              type="button"
              onClick={() => setNewRoomModalOpen(false)}
              className="px-3 py-2 bg-white/5 text-[#A6A29A] text-xs rounded-lg"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ==================== STEP 1: PHOTO UPLOAD, ROOM TYPE, DESIGN PATH ==================== */}
      {studioStep === 1 && (
        <div className="space-y-6">
          {/* 1A. Photo Upload & Multi-Angle Manager */}
          <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#F5F2EB]">
                  1. ارفع صورة مكانك الحالي (أو عدة صور من زوايا مختلفة)
                </h3>
                <p className="text-xs text-[#A6A29A] mt-0.5">
                  لا يشترط إدخال مقاسات أو ميزانية أو كتابة وصف يدوي. ارفع صورة للمكان سواء كان على الطوب الأحمر، نصف تشطيب، أو مفروشاً بالفعل.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-[#C6A355] hover:bg-[#d4b265] text-[#0B0B0E] font-bold text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع صورة / صور من جهازك أو الموبايل</span>
                </button>
              </div>
            </div>

            {/* Clarity Warning Banner if primary photo has low light or resolution */}
            {primaryPhoto && !primaryPhoto.clarityCheck.isClear && primaryPhoto.clarityCheck.warningMessageAr && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{primaryPhoto.clarityCheck.warningMessageAr}</span>
              </div>
            )}

            {/* Uploaded Photos Grid + Quick Sample Rooms */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Primary Photo Preview */}
              <div className="lg:col-span-2 bg-[#0B0B0E] border border-white/10 rounded-xl p-3">
                {primaryPhoto ? (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-black">
                      <img
                        src={primaryPhoto.dataUrl}
                        alt={primaryPhoto.name}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-[340px] object-contain mx-auto"
                      />
                      <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-sm px-3 py-1 rounded text-xs text-[#C6A355] font-semibold">
                        الصورة الأساسية للتصميم: {primaryPhoto.name}
                      </div>
                    </div>

                    {/* Multi-angle thumbnails */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {activeRoom.photos.map((ph) => (
                        <div
                          key={ph.id}
                          className={`relative rounded-lg overflow-hidden border p-1 bg-[#141418] flex items-center gap-2 ${
                            ph.isPrimary ? 'border-[#C6A355]' : 'border-white/10'
                          }`}
                        >
                          <img
                            src={ph.dataUrl}
                            alt={ph.name}
                            referrerPolicy="no-referrer"
                            className="w-16 h-12 object-cover rounded cursor-pointer"
                            onClick={() => handleSetPrimaryPhoto(ph.id)}
                          />
                          <div className="text-[11px] pl-1">
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryPhoto(ph.id)}
                              className="block font-semibold text-[#F5F2EB] hover:text-[#C6A355]"
                            >
                              {ph.isPrimary ? '✓ أساسية' : 'تعيين كأساسية'}
                            </button>
                            {activeRoom.photos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(ph.id)}
                                className="text-[10px] text-red-400 hover:underline mt-0.5 flex items-center gap-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                                حذف
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-14 px-3 rounded-lg border border-dashed border-white/20 hover:border-[#C6A355] text-xs text-[#A6A29A] hover:text-white flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#C6A355]" />
                        <span>إضافة زاوية أخرى</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                    <Upload className="w-8 h-8 text-[#C6A355] mb-2" />
                    <p className="text-sm font-bold text-[#F5F2EB]">ارفع صورة المكان للبدء فوراً</p>
                  </div>
                )}
              </div>

              {/* Ready Sample Rooms for Instant Testing */}
              <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#C6A355] mb-1">
                    أو جرّب فوراً على نماذج أماكن حقيقية جاهزة:
                  </h4>
                  <p className="text-[11px] text-[#A6A29A] mb-3">
                    اختر حالة المكان لتجربة التغيير من الطوب الأحمر أو المحارة أو التجديد الجزئي:
                  </p>

                  <div className="space-y-2.5">
                    {SAMPLE_STARTING_ROOMS.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleLoadSampleRoom(sample.id)}
                        className="w-full text-right p-2.5 rounded-lg bg-[#141418] hover:bg-white/5 border border-white/10 hover:border-[#C6A355]/50 transition-colors flex items-center gap-3"
                      >
                        <img
                          src={sample.imageUrl}
                          alt={sample.nameAr}
                          loading="lazy"
                          className="w-16 h-12 object-cover rounded border border-white/10 shrink-0"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#F5F2EB]">{sample.nameAr}</div>
                          <div className="text-[11px] text-[#A6A29A] mt-0.5 line-clamp-2">{sample.subtitleAr}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-[#A6A29A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C6A355] shrink-0" />
                  <span>القاعدة الأساسية: نحافظ على الأبواب والشبابيك وهندسة مكانك الأصلية.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 1B. Visual Room Type Selector (Section 6) */}
          <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
            <h3 className="text-base font-bold text-[#F5F2EB] mb-1">2. اختر نوع المكان</h3>
            <p className="text-xs text-[#A6A29A] mb-4">
              اختر نوع الغرفة أو المساحة التجارية لتخصيص الأثاث والخامات والإضاءة المناسبة لها، أو اختر «شقة كاملة» لإدارة عدة غرف.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ROOM_TYPES.map((rt) => {
                const isSelected = sel.roomType === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => {
                      if (rt.id === 'full_apartment') {
                        setNewRoomModalOpen(true);
                      } else {
                        updateSel({ roomType: rt.id });
                      }
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#C6A355]/15 border-[#C6A355] text-[#F5F2EB]'
                        : 'bg-[#0B0B0E] border-white/10 text-[#EAE4DA] hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] text-[#A6A29A]">{rt.categoryAr}</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: rt.previewSceneConfig.wallHex }}
                        />
                      </div>
                      <div className="text-xs font-bold text-[#F5F2EB]">{rt.nameAr}</div>
                      <div className="text-[11px] text-[#A6A29A] mt-1 line-clamp-2">
                        {rt.descriptionAr}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1C. Three Design Paths + Dedicated Element-Specific Mode (Sections 8 & 14) */}
          <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
            <h3 className="text-base font-bold text-[#F5F2EB] mb-1">
              3. اختر مسار التصميم وطريقة التحكم في العناصر
            </h3>
            <p className="text-xs text-[#A6A29A] mb-4">
              أنت صاحب القرار: اختر تجربة سريعة بنقرة واحدة، أو تعديل عنصر واحد فقط (مثل لون الحائط فقط أو الأرضية فقط)، أو تصميم متكامل.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Path 1: Quick Design */}
              <button
                type="button"
                onClick={() => handleSelectDesignPath('quick')}
                className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  sel.designPath === 'quick'
                    ? 'bg-[#C6A355]/15 border-[#C6A355]'
                    : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <Wand2 className="w-5 h-5 text-[#C6A355] mb-2" />
                  <div className="text-sm font-bold text-[#F5F2EB]">المسار الأول: تصميم سريع</div>
                  <p className="text-xs text-[#A6A29A] mt-1.5 leading-relaxed">
                    للمستخدم الذي يريد رؤية أفكار متناسقة فوراً باختيار النمط العام فقط دون الدخول في تفاصيل كل عنصر.
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-[#C6A355] font-semibold">
                  بدون مقاسات أو ميزانية ←
                </div>
              </button>

              {/* Path 2: Custom Element-by-Element */}
              <button
                type="button"
                onClick={() => handleSelectDesignPath('custom')}
                className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  sel.designPath === 'custom'
                    ? 'bg-[#C6A355]/15 border-[#C6A355]'
                    : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <Sliders className="w-5 h-5 text-[#C6A355] mb-2" />
                  <div className="text-sm font-bold text-[#F5F2EB]">المسار الثاني: تخصيص التصميم</div>
                  <p className="text-xs text-[#A6A29A] mt-1.5 leading-relaxed">
                    اختر كل عنصر على حدة (الحوائط، الأرضيات، السقف، الإضاءة، الأثاث) وحدد ما تريد تغييره وما يظل كما هو.
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-[#C6A355] font-semibold">
                  تحكم تفصيلي في كل بند ←
                </div>
              </button>

              {/* Path 3: Complete Redesign */}
              <button
                type="button"
                onClick={() => handleSelectDesignPath('complete')}
                className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  sel.designPath === 'complete'
                    ? 'bg-[#C6A355]/15 border-[#C6A355]'
                    : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <Layers className="w-5 h-5 text-[#C6A355] mb-2" />
                  <div className="text-sm font-bold text-[#F5F2EB]">المسار الثالث: تصميم متكامل</div>
                  <p className="text-xs text-[#A6A29A] mt-1.5 leading-relaxed">
                    اختر النمط والألوان والخامات والأثاث لإنشاء تصميم متكامل للغرفة بالكامل مع الحفاظ على الأبواب والشبابيك.
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-[#C6A355] font-semibold">
                  إعادة تصميم شاملة للمكان ←
                </div>
              </button>

              {/* Dedicated Mode: Single Element Masking (Section 14) */}
              <button
                type="button"
                onClick={() => handleSelectDesignPath('element_mask')}
                className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  sel.designPath === 'element_mask'
                    ? 'bg-[#C6A355]/15 border-[#C6A355]'
                    : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <Brush className="w-5 h-5 text-[#C6A355] mb-2" />
                  <div className="text-sm font-bold text-[#F5F2EB]">وضع تعديل عنصر محدد (Masking)</div>
                  <p className="text-xs text-[#A6A29A] mt-1.5 leading-relaxed">
                    غيّر لون الحائط فقط، أو الأرضية فقط، أو الأريكة/الستائر فقط باستخدام التحديد الموضعي مع ثبات باقي الصورة 100%.
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-[#C6A355] font-semibold">
                  تحديد موضعي دقيق ←
                </div>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStudioStep(2)}
                className="px-6 py-2.5 bg-[#C6A355] hover:bg-[#d4b265] text-[#0B0B0E] font-bold text-xs rounded-lg transition-colors"
              >
                التالي: اختيار الألوان والخامات والأنماط ←
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 2: VISUAL LIBRARIES & ELEMENT MASKING ==================== */}
      {studioStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Right Column (8 cols): Visual Catalog Tabs */}
          <div className="lg:col-span-8 bg-[#141418] border border-white/10 rounded-xl p-5 space-y-5">
            {/* Catalog Category Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 pb-3">
              {(sel.designPath === 'element_mask' || sel.designPath === 'custom') && (
                <button
                  type="button"
                  onClick={() => setCatalogTab('mask_zone')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    catalogTab === 'mask_zone'
                      ? 'bg-[#C6A355] text-[#0B0B0E]'
                      : 'bg-[#0B0B0E] text-[#EAE4DA] hover:bg-white/5'
                  }`}
                >
                  <Brush className="w-3.5 h-3.5" />
                  <span>تحديد العنصر / المنطقة</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCatalogTab('styles')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  catalogTab === 'styles'
                    ? 'bg-[#C6A355] text-[#0B0B0E]'
                    : 'bg-[#0B0B0E] text-[#EAE4DA] hover:bg-white/5'
                }`}
              >
                أنماط التصميم (14 نمط)
              </button>

              <button
                type="button"
                onClick={() => setCatalogTab('walls')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  catalogTab === 'walls'
                    ? 'bg-[#C6A355] text-[#0B0B0E]'
                    : 'bg-[#0B0B0E] text-[#EAE4DA] hover:bg-white/5'
                }`}
              >
                الحوائط (الألوان والتجاليد)
              </button>

              <button
                type="button"
                onClick={() => setCatalogTab('flooring')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  catalogTab === 'flooring'
                    ? 'bg-[#C6A355] text-[#0B0B0E]'
                    : 'bg-[#0B0B0E] text-[#EAE4DA] hover:bg-white/5'
                }`}
              >
                الأرضيات (12 خامة)
              </button>

              <button
                type="button"
                onClick={() => setCatalogTab('ceiling_lighting')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  catalogTab === 'ceiling_lighting'
                    ? 'bg-[#C6A355] text-[#0B0B0E]'
                    : 'bg-[#0B0B0E] text-[#EAE4DA] hover:bg-white/5'
                }`}
              >
                السقف والإضاءة
              </button>

              <button
                type="button"
                onClick={() => setCatalogTab('furniture')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  catalogTab === 'furniture'
                    ? 'bg-[#C6A355] text-[#0B0B0E]'
                    : 'bg-[#0B0B0E] text-[#EAE4DA] hover:bg-white/5'
                }`}
              >
                الأثاث والستائر والإكسسوارات
              </button>
            </div>

            {/* 2.0 ELEMENT MASKING & ZONE SELECTOR (Section 14) */}
            {catalogTab === 'mask_zone' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-[#F5F2EB]">
                    اختر العنصر المحدد الذي تريد تعديله فقط (مع تثبيت باقي عناصر الصورة الأصلية)
                  </h4>
                  <p className="text-xs text-[#A6A29A] mt-0.5">
                    حدد عنصراً واحداً أو أكثر، أو استخدم فرشاة التحديد الموضعي للرسم مباشرة فوق المنطقة المراد تغييرها على الصورة.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'walls' as MaskZoneId, label: 'تغيير الحائط فقط' },
                    { id: 'floor' as MaskZoneId, label: 'تغيير الأرضية فقط' },
                    { id: 'ceiling' as MaskZoneId, label: 'تعديل السقف فقط' },
                    { id: 'lighting' as MaskZoneId, label: 'تغيير الإضاءة فقط' },
                    { id: 'furniture' as MaskZoneId, label: 'تغيير الأريكة / الأثاث فقط' },
                    { id: 'curtains' as MaskZoneId, label: 'تغيير الستائر فقط' },
                    { id: 'custom_brush' as MaskZoneId, label: 'تحديد يدوي بالفرشاة (Mask)' },
                  ].map((z) => {
                    const active = sel.activeMaskZones.includes(z.id);
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => toggleMaskZone(z.id)}
                        className={`p-3 rounded-xl border text-right text-xs font-semibold transition-all flex items-center justify-between ${
                          active
                            ? 'bg-[#C6A355]/20 border-[#C6A355] text-[#C6A355]'
                            : 'bg-[#0B0B0E] border-white/10 text-[#EAE4DA]'
                        }`}
                      >
                        <span>{z.label}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Interactive Masking Canvas over Primary Photo */}
                {primaryPhoto && (
                  <div className="bg-[#0B0B0E] border border-white/15 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#EAE4DA]">
                        معاينة قناع التعديل الموضعي على صورتك الأصلية:
                      </span>
                      {sel.activeMaskZones.includes('custom_brush') && (
                        <div className="flex items-center gap-3">
                          <label className="text-[#A6A29A] flex items-center gap-1.5">
                            <span>حجم الفرشاة:</span>
                            <input
                              type="range"
                              min={0.02}
                              max={0.12}
                              step={0.01}
                              value={brushRadius}
                              onChange={(e) => setBrushRadius(parseFloat(e.target.value))}
                              className="w-20 accent-[#C6A355]"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => updateSel({ customBrushStrokes: [] })}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-[#A6A29A]"
                          >
                            مسح الفرشاة
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      ref={maskCanvasRef}
                      onClick={handleCanvasBrushClick}
                      className="relative rounded-lg overflow-hidden cursor-crosshair select-none border border-white/10"
                    >
                      <img
                        src={primaryPhoto.dataUrl}
                        alt="قناع التعديل"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-[340px] object-contain mx-auto block"
                      />

                      {/* Visual highlight overlay showing active zones */}
                      <div className="absolute inset-0 pointer-events-none">
                        {sel.activeMaskZones.includes('walls') && (
                          <div className="absolute inset-x-[18%] top-[15%] bottom-[32%] bg-[#C6A355]/25 border-2 border-dashed border-[#C6A355] flex items-center justify-center">
                            <span className="bg-[#0B0B0E]/85 text-[#C6A355] text-xs font-bold px-2.5 py-1 rounded">
                              منطقة الحوائط المحددة للتعديل
                            </span>
                          </div>
                        )}
                        {sel.activeMaskZones.includes('floor') && (
                          <div className="absolute inset-x-[10%] top-[68%] bottom-2 bg-emerald-500/25 border-2 border-dashed border-emerald-400 flex items-center justify-center">
                            <span className="bg-[#0B0B0E]/85 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded">
                              منطقة الأرضية المحددة للتعديل فقط
                            </span>
                          </div>
                        )}
                        {sel.activeMaskZones.includes('ceiling') && (
                          <div className="absolute inset-x-[10%] top-2 h-[13%] bg-sky-500/25 border-2 border-dashed border-sky-400 flex items-center justify-center">
                            <span className="bg-[#0B0B0E]/85 text-sky-300 text-[11px] font-bold px-2 py-0.5 rounded">
                              السقف المحدد للتعديل
                            </span>
                          </div>
                        )}
                        {sel.customBrushStrokes.map((st, idx) => (
                          <div
                            key={idx}
                            style={{
                              left: `${(st.x - st.radius) * 100}%`,
                              top: `${(st.y - st.radius) * 100}%`,
                              width: `${st.radius * 200}%`,
                              height: `${st.radius * 200}%`,
                            }}
                            className="absolute rounded-full bg-[#C6A355]/45 border border-[#C6A355]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2.1 DESIGN STYLES LIBRARY (Section 9) */}
            {catalogTab === 'styles' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-[#F5F2EB]">
                    مكتبة أنماط التصميم الداخلي (اختر النمط المفضل لمساحتك)
                  </h4>
                  <p className="text-xs text-[#A6A29A] mt-0.5">
                    يمكنك اختيار نمط واحد أو تجربة أكثر من نمط على صورتك الأصلية وحفظ كل نتيجة بشكل مستقل.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
                  {DESIGN_STYLES.map((st) => {
                    const isSelected = sel.styleId === st.id;
                    const previewUrl = getStylePreviewDataUrl(st.id);

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          // In quick mode, picking a style also syncs recommended harmonious defaults unless user customized them
                          if (sel.designPath === 'quick') {
                            const recWall = WALL_COLORS.find((w) => w.id === st.recommendedWallColorId);
                            updateSel({
                              styleId: st.id,
                              wallColorId: st.recommendedWallColorId,
                              selectedWallShadeHex: recWall?.hex || '#EFE9DC',
                              wallFinishId: st.recommendedWallFinishId,
                              flooringId: st.recommendedFloorId,
                              lightingTemp: st.recommendedLightingTemp,
                            });
                          } else {
                            updateSel({ styleId: st.id });
                          }
                        }}
                        className={`rounded-xl border overflow-hidden text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#C6A355]/15 border-[#C6A355] ring-1 ring-[#C6A355]'
                            : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div>
                          <div className="relative h-32 bg-black overflow-hidden">
                            <img
                              src={previewUrl}
                              alt={st.nameAr}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded">
                              {st.paletteHex.map((hex, i) => (
                                <span
                                  key={i}
                                  className="w-3 h-3 rounded-full border border-white/30"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#F5F2EB]">{st.nameAr}</span>
                              <span className="text-[10px] text-[#A6A29A] font-mono">{st.nameEn}</span>
                            </div>
                            <p className="text-[11px] text-[#A6A29A] mt-1 line-clamp-2">
                              {st.descriptionAr}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2.2 WALLS LIBRARY: PAINTS, SHADES & FINISHES (Section 10) */}
            {catalogTab === 'walls' && (
              <div className="space-y-6">
                {sel.designPath === 'custom' && (
                  <label className="flex items-center gap-2 text-xs text-[#C6A355] font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sel.modifyWalls}
                      onChange={(e) => updateSel({ modifyWalls: e.target.checked })}
                      className="w-4 h-4 accent-[#C6A355]"
                    />
                    <span>تفعيل تعديل الحوائط في هذا التصميم (اتركه غير مفعل للحفاظ على الحائط الأصلي)</span>
                  </label>
                )}

                {/* Paint Colors */}
                <div>
                  <h4 className="text-sm font-bold text-[#F5F2EB] mb-2">
                    أولاً: ألوان الدهانات والدرجات (الأبيض، الأوف وايت، البيج، الجريج، الرمادي، الدافئ والبارد)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {WALL_COLORS.map((wc) => {
                      const isSel = sel.wallColorId === wc.id;
                      return (
                        <div
                          key={wc.id}
                          onClick={() =>
                            updateSel({
                              wallColorId: wc.id,
                              selectedWallShadeHex: wc.hex,
                              modifyWalls: true,
                            })
                          }
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSel
                              ? 'bg-[#C6A355]/15 border-[#C6A355]'
                              : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-9 h-9 rounded-lg border border-white/20 shrink-0 shadow-inner"
                              style={{ backgroundColor: wc.hex }}
                            />
                            <div>
                              <div className="text-xs font-bold text-[#F5F2EB]">{wc.nameAr}</div>
                              <div className="text-[10px] font-mono text-[#A6A29A]">{wc.code}</div>
                            </div>
                          </div>

                          {/* 3 Shades per color */}
                          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
                            {wc.shades.map((sh, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSel({
                                    wallColorId: wc.id,
                                    selectedWallShadeHex: sh.hex,
                                    modifyWalls: true,
                                  });
                                }}
                                className={`flex-1 py-1 px-1.5 rounded text-[10px] border flex items-center gap-1 ${
                                  sel.selectedWallShadeHex === sh.hex && isSel
                                    ? 'border-[#C6A355] bg-[#C6A355]/20 text-white font-bold'
                                    : 'border-white/10 text-[#A6A29A]'
                                }`}
                              >
                                <span
                                  className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                                  style={{ backgroundColor: sh.hex }}
                                />
                                <span className="truncate">{sh.labelAr}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Wall Finishes & Cladding */}
                <div>
                  <h4 className="text-sm font-bold text-[#F5F2EB] mb-2">
                    ثانياً: تشطيبات وتجاليد الحوائط (دهانات، بانوهات، بديل خشب، بديل رخام، ورق حائط، حجر، 3D)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {WALL_FINISHES.map((wf) => {
                      const isSel = sel.wallFinishId === wf.id;
                      return (
                        <button
                          key={wf.id}
                          type="button"
                          onClick={() => updateSel({ wallFinishId: wf.id, modifyWalls: true })}
                          className={`p-3.5 rounded-xl border text-right transition-all ${
                            isSel
                              ? 'bg-[#C6A355]/15 border-[#C6A355]'
                              : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-[#C6A355]">{wf.categoryAr}</span>
                            <span
                              className="w-6 h-4 rounded border border-white/20"
                              style={{
                                background: `linear-gradient(135deg, ${wf.previewHex} 55%, ${wf.accentHex} 100%)`,
                              }}
                            />
                          </div>
                          <div className="text-xs font-bold text-[#F5F2EB]">{wf.nameAr}</div>
                          <div className="text-[11px] text-[#A6A29A] mt-1">{wf.descriptionAr}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2.3 FLOORING LIBRARY (Section 11) */}
            {catalogTab === 'flooring' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#F5F2EB]">
                      مكتبة الأرضيات المصورة (السيراميك، البورسلين، الرخام، الجرانيت، الباركيه، HDF، الفينيل، الميكروسيمنت)
                    </h4>
                    <p className="text-xs text-[#A6A29A] mt-0.5">
                      يمكنك تغيير الأرضية فقط مع الحفاظ على الحوائط والأثاث والأبواب والشبابيك.
                    </p>
                  </div>

                  {/* Quality selector for flooring */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#A6A29A]">مستوى الجودة:</span>
                    <select
                      value={sel.flooringQuality}
                      onChange={(e) => updateSel({ flooringQuality: e.target.value as QualityTier })}
                      className="bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-[#F5F2EB]"
                    >
                      {QUALITY_TIERS.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {FLOORING_OPTIONS.map((fl) => {
                    const isSel = sel.flooringId === fl.id;
                    return (
                      <button
                        key={fl.id}
                        type="button"
                        onClick={() => updateSel({ flooringId: fl.id, modifyFloor: true })}
                        className={`p-3.5 rounded-xl border text-right transition-all ${
                          isSel
                            ? 'bg-[#C6A355]/15 border-[#C6A355]'
                            : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div
                          className="h-14 w-full rounded-lg mb-2.5 border border-white/15 flex items-end p-2"
                          style={{
                            background: `repeating-linear-gradient(45deg, ${fl.primaryHex}, ${fl.primaryHex} 14px, ${fl.secondaryHex} 14px, ${fl.secondaryHex} 28px)`,
                          }}
                        >
                          <span className="bg-black/75 text-[10px] text-white px-2 py-0.5 rounded">
                            {fl.typeAr}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#F5F2EB]">{fl.nameAr}</div>
                        <div className="text-[11px] text-[#A6A29A] mt-0.5">
                          اللون: {fl.colorNameAr} · الهالك القياسي: {fl.wastePercentage}%
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2.4 CEILING & LIGHTING LIBRARY (Section 12) */}
            {catalogTab === 'ceiling_lighting' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-[#F5F2EB] mb-2">
                    أولاً: درجة حرارة الإضاءة (Kelvin Color Temperature)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {LIGHTING_TEMPS.map((lt) => {
                      const isSel = sel.lightingTemp === lt.id;
                      return (
                        <button
                          key={lt.id}
                          type="button"
                          onClick={() => updateSel({ lightingTemp: lt.id, modifyLighting: true })}
                          className={`p-3 rounded-xl border text-right transition-all ${
                            isSel
                              ? 'bg-[#C6A355]/15 border-[#C6A355]'
                              : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-bold text-[#F5F2EB]">{lt.id}</span>
                            <span
                              className="w-5 h-5 rounded-full border border-white/30 shadow"
                              style={{ backgroundColor: lt.hexGlow }}
                            />
                          </div>
                          <div className="text-xs font-semibold text-[#EAE4DA]">{lt.nameAr}</div>
                          <div className="text-[10px] text-[#A6A29A] mt-0.5">{lt.descAr}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#F5F2EB] mb-2">
                    ثانياً: اختيارات السقف ووحدات الإضاءة (لا يضيف النظام وحدات إلا وفق اختيارك)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {CEILING_LIGHTING_OPTIONS.map((co) => {
                      const isChecked = sel.ceilingOptions.includes(co.id);
                      return (
                        <button
                          key={co.id}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? sel.ceilingOptions.filter((id) => id !== co.id)
                              : [...sel.ceilingOptions, co.id];
                            updateSel({
                              ceilingOptions: next,
                              modifyCeiling: true,
                              modifyLighting: true,
                            });
                          }}
                          className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                            isChecked
                              ? 'bg-[#C6A355]/15 border-[#C6A355]'
                              : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-[#C6A355] mb-1">
                              <span>{co.categoryAr}</span>
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <div className="text-xs font-bold text-[#F5F2EB]">{co.nameAr}</div>
                            <div className="text-[11px] text-[#A6A29A] mt-1">{co.descriptionAr}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2.5 FURNITURE, CURTAINS & ACCESSORIES (Section 13) */}
            {catalogTab === 'furniture' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#F5F2EB]">
                      الأثاث والستائر والسجاد والإكسسوارات المتناسقة مع ({ROOM_TYPES.find((r) => r.id === sel.roomType)?.nameAr})
                    </h4>
                    <p className="text-xs text-[#A6A29A] mt-0.5">
                      حدد العناصر التي ترغب في إضافتها أو تحديثها ومستوى فخامتها.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#A6A29A]">فخامة الأثاث:</span>
                    <select
                      value={sel.furnitureLuxury}
                      onChange={(e) => updateSel({ furnitureLuxury: e.target.value as QualityTier })}
                      className="bg-[#0B0B0E] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-[#F5F2EB]"
                    >
                      {QUALITY_TIERS.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {applicableFurniture.map((fn) => {
                    const isChecked = sel.selectedFurnitureIds.includes(fn.id);
                    const estPrice = fn.estimatedPriceEgp[sel.furnitureLuxury || 'standard'];

                    return (
                      <button
                        key={fn.id}
                        type="button"
                        onClick={() => {
                          const next = isChecked
                            ? sel.selectedFurnitureIds.filter((id) => id !== fn.id)
                            : [...sel.selectedFurnitureIds, fn.id];
                          updateSel({ selectedFurnitureIds: next, modifyFurniture: true });
                        }}
                        className={`p-3.5 rounded-xl border text-right transition-all flex items-start justify-between gap-3 ${
                          isChecked
                            ? 'bg-[#C6A355]/15 border-[#C6A355]'
                            : 'bg-[#0B0B0E] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div>
                          <div className="text-[10px] text-[#C6A355]">{fn.categoryAr}</div>
                          <div className="text-xs font-bold text-[#F5F2EB] mt-0.5">{fn.nameAr}</div>
                          <div className="text-[11px] text-[#A6A29A] mt-1">
                            الخامة: {fn.materialAr} · الشكل: {fn.shapeAr}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-[#EAE4DA] mt-1.5">
                            متوسط السعر المرجعي: {estPrice.toLocaleString('en-US')} ج.م
                          </div>
                        </div>
                        <div
                          className="w-6 h-6 rounded-full border border-white/20 shrink-0 mt-1"
                          style={{ backgroundColor: fn.defaultColorHex }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Left Column (4 cols): Live Summary & Generate Actions */}
          <div className="lg:col-span-4 bg-[#141418] border border-white/10 rounded-xl p-5 space-y-4 sticky top-20">
            <h3 className="text-sm font-bold text-[#F5F2EB] border-b border-white/10 pb-3">
              ملخص اختياراتك الحالية — {activeRoom.nameAr}
            </h3>

            {primaryPhoto && (
              <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black">
                <img
                  src={primaryPhoto.dataUrl}
                  alt="الصورة الأساسية"
                  referrerPolicy="no-referrer"
                  className="w-full h-36 object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/75 px-2 py-0.5 rounded text-[10px] text-white">
                  الصورة الأصلية المرجعية
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-[#A6A29A]">مسار التصميم:</span>
                <span className="font-bold text-[#C6A355]">
                  {sel.designPath === 'quick'
                    ? 'تصميم سريع'
                    : sel.designPath === 'custom'
                    ? 'تخصيص عناصر'
                    : sel.designPath === 'element_mask'
                    ? 'تعديل عنصر محدد (Mask)'
                    : 'تصميم متكامل'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-[#A6A29A]">النمط المختار:</span>
                <span className="font-semibold text-[#F5F2EB]">
                  {DESIGN_STYLES.find((s) => s.id === sel.styleId)?.nameAr}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-[#A6A29A]">لون وتشطيب الحائط:</span>
                <span className="font-semibold text-[#F5F2EB] flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/30"
                    style={{ backgroundColor: sel.selectedWallShadeHex }}
                  />
                  {selectedWallColorObj.nameAr}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-[#A6A29A]">الأرضية:</span>
                <span className="font-semibold text-[#F5F2EB]">
                  {FLOORING_OPTIONS.find((f) => f.id === sel.flooringId)?.nameAr}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-[#A6A29A]">الإضاءة:</span>
                <span className="font-mono text-[#F5F2EB]">{sel.lightingTemp}</span>
              </div>

              <label className="flex items-center gap-2 pt-2 text-xs text-emerald-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sel.preserveArchitecture}
                  onChange={(e) => updateSel({ preserveArchitecture: e.target.checked })}
                  className="w-4 h-4 accent-[#C6A355]"
                />
                <span>تثبيت مواضع الأبواب والشبابيك والأعمدة (موصى به)</span>
              </label>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  onGenerateDesign(false);
                  setStudioStep(3);
                }}
                className="w-full py-3 px-4 bg-[#C6A355] hover:bg-[#d4b265] disabled:opacity-50 text-[#0B0B0E] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'جارٍ معالجة وتوليد التصميم...' : 'اعرض التصميم الآن'}</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  onGenerateDesign(true);
                  setStudioStep(3);
                }}
                className="w-full py-2.5 px-4 bg-[#0B0B0E] hover:bg-white/5 disabled:opacity-50 text-[#C6A355] border border-[#C6A355]/50 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>إنشاء 3 بدائل تصميمية مستقلة للمقارنة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 3: BEFORE/AFTER RESULT, 3 ALTERNATIVES, SMART ANALYSIS & 2D PLAN ==================== */}
      {studioStep === 3 && (
        <div className="space-y-5">
          {/* Interactive Before / After Comparison Viewer */}
          {activeVersion ? (
            <BeforeAfterSlider
              beforeUrl={activeVersion.originalDataUrl}
              afterUrl={activeVersion.resultDataUrl}
              beforeLabelAr="قبل (الصورة الأصلية)"
              afterLabelAr={`بعد (${activeVersion.labelAr})`}
              preservedElementsAr={activeVersion.preservedElementsAr}
              aiNotesAr={activeVersion.aiNotesAr}
              isFavorite={activeVersion.isFavorite}
              onSaveToFavorites={() => onToggleFavoriteVersion(activeVersion.id)}
              onRevertToOriginal={() => setStudioStep(2)}
            />
          ) : (
            <div className="bg-[#141418] border border-white/10 rounded-xl p-12 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-[#C6A355] mx-auto" />
              <div className="text-sm font-bold text-[#F5F2EB]">
                اضغط على «اعرض التصميم الآن» لتوليد النتيجة ومقارنتها بالصورة الأصلية
              </div>
              <button
                type="button"
                onClick={() => onGenerateDesign(false)}
                className="px-5 py-2.5 bg-[#C6A355] text-[#0B0B0E] font-bold text-xs rounded-lg"
              >
                توليد التصميم الآن
              </button>
            </div>
          )}

          {/* Saved Design Versions & 3 Independent Alternatives Strip (Section 18) */}
          {activeRoom.versions.length > 0 && (
            <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-[#F5F2EB]">
                    نسخ التصميم والبدائل المستقلة المحفوظة لهذه الغرفة ({activeRoom.versions.length})
                  </h4>
                  <p className="text-xs text-[#A6A29A]">
                    اختر التصميم المفضل لربط حصر الكميات وحساب التكلفة به حصرياً.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeRoom.versions.map((ver) => {
                  const isCurrent = ver.id === activeVersion?.id;
                  return (
                    <div
                      key={ver.id}
                      onClick={() => onSelectVersion(ver.id)}
                      className={`rounded-xl border overflow-hidden cursor-pointer transition-all p-2.5 bg-[#0B0B0E] flex flex-col justify-between ${
                        isCurrent ? 'border-[#C6A355] ring-1 ring-[#C6A355]' : 'border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div>
                        <div className="relative h-32 rounded-lg overflow-hidden mb-2">
                          <img
                            src={ver.resultDataUrl}
                            alt={ver.labelAr}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {isCurrent && (
                            <div className="absolute top-2 right-2 bg-[#C6A355] text-[#0B0B0E] text-[10px] font-bold px-2 py-0.5 rounded">
                              محدد حالياً للتكلفة
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-[#F5F2EB]">{ver.labelAr}</div>
                        <div className="text-[10px] text-[#A6A29A] mt-0.5">توقيت الحفظ: {ver.createdAt}</div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavoriteVersion(ver.id);
                          }}
                          className={`text-[11px] flex items-center gap-1 ${
                            ver.isFavorite ? 'text-[#C6A355] font-bold' : 'text-[#A6A29A] hover:text-white'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>{ver.isFavorite ? 'مفضل' : 'تفضيل'}</span>
                        </button>

                        {activeRoom.versions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteVersion(ver.id);
                            }}
                            className="text-[11px] text-red-400 hover:underline"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Smart Room AI Analysis Section (Section 19) */}
          <div className="bg-[#141418] border border-white/10 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#F5F2EB] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#C6A355]" />
                  <span>التحليل الذكي للمكان (يفصل بين العناصر المرئية المؤكدة والتقديرات الاسترشادية)</span>
                </h4>
                <p className="text-xs text-[#A6A29A] mt-0.5">
                  يحلل الذكاء الاصطناعي الصورة لتحديد العناصر المعمارية الظاهرة ومقترحات التجديد دون ادعاء معرفة المقاسات بالمتر من الصورة.
                </p>
              </div>

              <button
                type="button"
                disabled={isAnalyzing}
                onClick={onRunSmartAnalysis}
                className="px-4 py-2 bg-[#0B0B0E] hover:bg-white/5 text-[#C6A355] border border-[#C6A355]/40 rounded-lg text-xs font-bold whitespace-nowrap shrink-0"
              >
                {isAnalyzing ? 'جارٍ تحليل الصورة...' : 'تحديث التحليل الذكي للصورة'}
              </button>
            </div>

            {activeRoom.analysis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Confirmed Visible Info */}
                <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="text-[#C6A355] font-bold">
                    1. معلومات مرئية مؤكدة من الصورة:
                  </div>
                  <div>
                    <span className="text-[#A6A29A]">نوع المكان المحتمل: </span>
                    <span className="text-[#F5F2EB] font-semibold">
                      {activeRoom.analysis.confirmedVisible.probableRoomTypeAr}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A6A29A]">حالة التشطيب الظاهرة: </span>
                    <span className="text-[#F5F2EB]">
                      {activeRoom.analysis.confirmedVisible.finishConditionAr}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A6A29A]">الحوائط والأرضيات: </span>
                    <span className="text-[#F5F2EB]">
                      {activeRoom.analysis.confirmedVisible.wallColorsAndStateAr} ·{' '}
                      {activeRoom.analysis.confirmedVisible.floorMaterialAndStateAr}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A6A29A]">العناصر المعمارية الثابتة: </span>
                    <span className="text-[#F5F2EB]">
                      {activeRoom.analysis.confirmedVisible.architecturalElementsAr.join(' · ')}
                    </span>
                  </div>
                </div>

                {/* Estimated / Suggested Insights */}
                <div className="bg-[#0B0B0E] border border-white/10 rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="text-amber-400 font-bold">
                    2. تقديرات ومقترحات تجديد استرشادية:
                  </div>
                  <ul className="list-disc list-inside text-[#EAE4DA] space-y-1">
                    {activeRoom.analysis.estimatedInsights.renovationPrioritiesAr.map((pr, idx) => (
                      <li key={idx}>{pr}</li>
                    ))}
                  </ul>
                  <div className="text-[#A6A29A] pt-1">
                    {activeRoom.analysis.estimatedInsights.colorHarmonyAdviceAr}
                  </div>
                  <div className="p-2.5 rounded bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 mt-2">
                    {activeRoom.analysis.estimatedInsights.measurementDisclaimerAr}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive 2D Room Layout Toggle & Planner (Section 26) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShow2DPlanner(!show2DPlanner)}
              className="px-4 py-2.5 bg-[#141418] hover:bg-white/5 text-[#EAE4DA] border border-white/10 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-[#C6A355]" />
              <span>
                {show2DPlanner
                  ? 'إخفاء أداة التخطيط التفاعلي ثنائي الأبعاد (2D Floor Plan)'
                  : 'فتح أداة التخطيط التفاعلي وتوزيع الأثاث ومسارات الحركة (2D)'}
              </span>
            </button>

            {show2DPlanner && (
              <FloorPlan2D
                lengthM={activeRoom.dimensions.lengthM}
                widthM={activeRoom.dimensions.widthM}
                doorsCount={activeRoom.dimensions.doorsCount}
                windowsCount={activeRoom.dimensions.windowsCount}
                items={activeRoom.floorPlanItems}
                onChangeItems={onUpdateFloorPlanItems}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  MakanProject,
  ApartmentRoomUnit,
  UserDesignSelections,
  UploadedPhoto,
  RoomTypeId,
  StyleId,
  PriceRecord,
  RoomDimensionsInput,
  FloorPlanFurnitureItem,
  DesignVersion,
} from './types/makan';
import {
  INITIAL_EGYPTIAN_PRICES,
  ROOM_TYPES,
  DESIGN_STYLES,
  WALL_COLORS,
  WALL_FINISHES,
  FLOORING_OPTIONS,
} from './data/catalogData';
import { renderProceduralRoomToDataUrl } from './utils/proceduralRoomRenderer';
import {
  composePhotometricDesign,
  buildLocalSmartAnalysis,
} from './utils/imageCompositor';
import { LandingHomeView } from './components/LandingHomeView';
import { DesignStudioView } from './components/DesignStudioView';
import { InspirationGalleryView } from './components/InspirationGalleryView';
import { BOQAndPricesView } from './components/BOQAndPricesView';
import { ProjectsDashboardView } from './components/ProjectsDashboardView';

type MainTab = 'home' | 'studio' | 'gallery' | 'boq' | 'projects';

const STORAGE_PROJECTS_KEY = 'makan_ai_projects_v3';
const STORAGE_PRICES_KEY = 'makan_ai_prices_v1';

function createDefaultRoomUnit(
  id: string,
  nameAr: string,
  roomType: RoomTypeId = 'living_room',
  initialState: 'unfinished_brick' | 'semi_plaster' | 'old_room' = 'semi_plaster'
): ApartmentRoomUnit {
  const roomMeta = ROOM_TYPES.find((r) => r.id === roomType) || ROOM_TYPES[0];
  const beforeUrl = renderProceduralRoomToDataUrl({
    state: initialState,
    roomType,
  });

  const defaultSelections: UserDesignSelections = {
    roomType,
    designPath: 'complete',
    styleId: 'neoclassic',
    modifyWalls: true,
    modifyFloor: true,
    modifyCeiling: true,
    modifyLighting: true,
    modifyFurniture: true,
    modifyCurtains: true,
    preserveArchitecture: true,
    wallColorId: 'wall_greige_warm',
    selectedWallShadeHex: '#D7CFC4',
    wallFinishId: 'finish_neoclassic_molding',
    flooringId: 'floor_marble_crema',
    flooringQuality: 'luxury',
    ceilingOptions: ['ceil_gypsum_cove', 'light_hidden_led', 'light_spotlights', 'light_chandelier'],
    lightingTemp: '3000K',
    selectedFurnitureIds: ['furn_sofa_sectional', 'furn_coffee_table', 'furn_tv_library', 'furn_curtains_rug'],
    furnitureLuxury: 'standard',
    activeMaskZones: ['walls'],
    customBrushStrokes: [],
  };

  const afterUrl =
    roomType === 'master_bedroom' || roomType === 'kids_room'
      ? '/images/room_bedroom_luxury.jpg'
      : roomType === 'kitchen'
      ? '/images/room_kitchen_modern.jpg'
      : '/images/after_neoclassic.jpg';

  const initialVersion: DesignVersion = {
    id: `ver_init_${id}`,
    labelAr: 'تصميم نيو كلاسيك — جريج ورخام كريما مارفيل',
    createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    sourcePhotoId: `ph_init_${id}`,
    originalDataUrl: beforeUrl,
    resultDataUrl: afterUrl,
    selections: defaultSelections,
    isFavorite: true,
    aiNotesAr:
      'تم تنسيق بانوهات الحوائط بلون جريج دافئ مع أرضية رخام كريما مارفيل وإضاءة 3000K مع الحفاظ الكامل على مواضع الفتحات المعمارية.',
    preservedElementsAr: ['ثبات مواضع الأبواب والشبابيك والفتحات المعمارية', 'ثبات زاوية التصوير وأبعاد الغرفة'],
  };

  const dimensions: RoomDimensionsInput = {
    isMeasuredByUser: false,
    lengthM: roomMeta.defaultDimensions.length,
    widthM: roomMeta.defaultDimensions.width,
    heightM: roomMeta.defaultDimensions.height,
    doorsCount: roomMeta.defaultDimensions.doors,
    doorAreaM2: 1.98,
    windowsCount: roomMeta.defaultDimensions.windows,
    windowAreaM2: 1.8,
    region: 'greater_cairo',
    qualityTier: 'standard',
    finishScope: initialState === 'unfinished_brick' ? 'red_brick_to_full' : 'semi_finished_to_full',
    includeLabor: true,
    includeSupervisionAndContingency: true,
    contingencyPercent: 10,
  };

  const defaultFloorPlan: FloorPlanFurnitureItem[] = [
    {
      id: 'fp_1',
      nameAr: 'كنبة رئيسية 3 مقاعد',
      category: 'sofa',
      xMeters: 1.4,
      yMeters: 0.4,
      widthMeters: 2.3,
      depthMeters: 0.9,
      rotationDeg: 0,
      colorHex: '#C6A355',
    },
    {
      id: 'fp_2',
      nameAr: 'طاولة وسط رخام',
      category: 'table',
      xMeters: 1.9,
      yMeters: 1.6,
      widthMeters: 1.2,
      depthMeters: 0.65,
      rotationDeg: 0,
      colorHex: '#D8CEBE',
    },
    {
      id: 'fp_3',
      nameAr: 'وحدة تلفزيون',
      category: 'tv_unit',
      xMeters: 1.5,
      yMeters: 3.1,
      widthMeters: 2.0,
      depthMeters: 0.45,
      rotationDeg: 0,
      colorHex: '#7A5B40',
    },
  ];

  return {
    id,
    nameAr,
    roomType,
    photos: [
      {
        id: `ph_init_${id}`,
        name: 'الصورة الأصلية للمكان',
        dataUrl: beforeUrl,
        angleLabelAr: 'الزاوية الأساسية',
        isPrimary: true,
        clarityCheck: { isClear: true, width: 960, height: 580, brightness: 130 },
      },
    ],
    selections: defaultSelections,
    versions: [initialVersion],
    selectedVersionId: initialVersion.id,
    dimensions,
    analysis: buildLocalSmartAnalysis(defaultSelections, { width: 960, height: 580, brightness: 130 }),
    floorPlanItems: defaultFloorPlan,
  };
}

function createInitialProjects(): MakanProject[] {
  const room1 = createDefaultRoomUnit('room_reception_1', 'الريسبشن والمعيشة', 'living_room', 'semi_plaster');
  const room2 = createDefaultRoomUnit('room_master_2', 'غرفة النوم الرئيسية (ماستر)', 'master_bedroom', 'unfinished_brick');

  return [
    {
      id: 'proj_default_apartment',
      nameAr: 'مشروع شقة سكنية — التجمع الخامس',
      isFullApartment: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      region: 'new_cairo_capital',
      rooms: [room1, room2],
      activeRoomId: room1.id,
      sharedApartmentCosts: {
        mainElectricalPanelEgp: 14500,
        mainArmoredDoorEgp: 18500,
        sharedPlumbingNetworkEgp: 16000,
      },
    },
  ];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [projects, setProjects] = useState<MakanProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {
      // ignore
    }
    return createInitialProjects();
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => projects[0]?.id || 'proj_default_apartment');
  const [priceCatalog, setPriceCatalog] = useState<PriceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PRICES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {
      // ignore
    }
    return INITIAL_EGYPTIAN_PRICES;
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  // Sync projects to localStorage and backend persistent store
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (_e) {
      // ignore storage quota errors on huge images
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRICES_KEY, JSON.stringify(priceCatalog));
    } catch (_e) {
      // ignore
    }
  }, [priceCatalog]);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeRoom =
    activeProject.rooms.find((r) => r.id === activeProject.activeRoomId) ||
    activeProject.rooms[0];

  const updateActiveProject = (updater: (proj: MakanProject) => MakanProject) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        const updated = updater({ ...p, updatedAt: new Date().toISOString() });
        // Persist to backend asynchronously
        fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: updated }),
        }).catch(() => {});
        return updated;
      })
    );
  };

  const updateActiveRoom = (updater: (room: ApartmentRoomUnit) => ApartmentRoomUnit) => {
    updateActiveProject((proj) => ({
      ...proj,
      rooms: proj.rooms.map((r) => (r.id === activeRoom.id ? updater(r) : r)),
    }));
  };

  // Generate 1 design or 3 independent alternatives
  const handleGenerateDesign = async (threeAlternatives = false) => {
    const primaryPhoto =
      activeRoom.photos.find((p) => p.isPrimary) || activeRoom.photos[0];
    if (!primaryPhoto) return;

    setIsGenerating(true);
    try {
      const sel = activeRoom.selections;
      const styleObj = DESIGN_STYLES.find((s) => s.id === sel.styleId) || DESIGN_STYLES[0];
      const wallColorObj = WALL_COLORS.find((w) => w.id === sel.wallColorId) || WALL_COLORS[0];
      const wallFinishObj = WALL_FINISHES.find((f) => f.id === sel.wallFinishId) || WALL_FINISHES[0];
      const floorObj = FLOORING_OPTIONS.find((f) => f.id === sel.flooringId) || FLOORING_OPTIONS[0];

      const promptDescAr = `نمط التصميم: ${styleObj.nameAr} (${styleObj.nameEn})، لون الحوائط: ${wallColorObj.nameAr} (${sel.selectedWallShadeHex})، تشطيب الحوائط: ${wallFinishObj.nameAr}، الأرضية: ${floorObj.nameAr} (${floorObj.colorNameAr})، الإضاءة: ${sel.lightingTemp}، المسار: ${
        sel.designPath === 'element_mask'
          ? `تعديل موضعي للعناصر المحددة فقط (${sel.activeMaskZones.join(', ')})`
          : sel.designPath
      }.`;

      // Call server-side Gemini endpoint for architectural notes / optional AI image
      let serverAiNotes = '';
      let serverGeneratedImg: string | undefined;
      try {
        const res = await fetch('/api/ai/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl: primaryPhoto.dataUrl,
            promptDescriptionAr: promptDescAr,
            preserveArchitecture: sel.preserveArchitecture,
            mode: sel.designPath,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          serverAiNotes = data.aiNotesAr || '';
          if (data.aiImageGenerated && data.resultDataUrl) {
            serverGeneratedImg = data.resultDataUrl;
          }
        }
      } catch (_err) {
        // Fallback to local photometric engine
      }

      if (threeAlternatives) {
        // Generate 3 distinct independent design alternatives
        const altConfigs: { labelAr: string; selections: UserDesignSelections; idx: number }[] = [
          {
            labelAr: `بديل 1: ${styleObj.nameAr} — ${wallColorObj.nameAr} و${floorObj.typeAr}`,
            selections: { ...sel },
            idx: 0,
          },
          {
            labelAr: `بديل 2: تناغم دافئ — بديل الخشب وأرضية باركيه`,
            selections: {
              ...sel,
              wallFinishId: 'finish_wood_slats',
              flooringId: 'floor_parquet_herringbone',
              lightingTemp: '2700K',
            },
            idx: 1,
          },
          {
            labelAr: `بديل 3: فخامة هادئة — بديل الرخام وبورسلين بيج`,
            selections: {
              ...sel,
              wallFinishId: 'finish_marble_alt',
              flooringId: 'floor_porcelain_beige',
              lightingTemp: '3000K',
            },
            idx: 2,
          },
        ];

        const generatedVersions: DesignVersion[] = [];
        for (const cfg of altConfigs) {
          const comp = await composePhotometricDesign(primaryPhoto.dataUrl, cfg.selections, cfg.idx);
          generatedVersions.push({
            id: `ver_${Date.now()}_${cfg.idx}`,
            labelAr: cfg.labelAr,
            createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            sourcePhotoId: primaryPhoto.id,
            originalDataUrl: primaryPhoto.dataUrl,
            resultDataUrl: comp.resultDataUrl,
            selections: cfg.selections,
            isFavorite: false,
            isAlternative: true,
            alternativeIndex: cfg.idx + 1,
            aiNotesAr:
              serverAiNotes ||
              `تم إنشاء ${cfg.labelAr} بشكل مستقل مع الحفاظ على الأبواب والشبابيك وأبعاد الغرفة.`,
            preservedElementsAr: comp.preservedElementsAr,
          });
        }

        updateActiveRoom((rm) => ({
          ...rm,
          versions: [...generatedVersions, ...rm.versions],
          selectedVersionId: generatedVersions[0].id,
        }));
        showToast('تم إنشاء وحفظ 3 بدائل تصميمية مستقلة للمكان بنجاح');
      } else {
        const comp = await composePhotometricDesign(primaryPhoto.dataUrl, sel, 0);
        const modePrefix =
          sel.designPath === 'element_mask'
            ? `تعديل موضعي (${sel.activeMaskZones.join(' + ')})`
            : styleObj.nameAr;

        const newVer: DesignVersion = {
          id: `ver_${Date.now()}`,
          labelAr: `${modePrefix} — ${wallColorObj.nameAr} · ${floorObj.typeAr}`,
          createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          sourcePhotoId: primaryPhoto.id,
          originalDataUrl: primaryPhoto.dataUrl,
          resultDataUrl: serverGeneratedImg || comp.resultDataUrl,
          selections: { ...sel },
          isFavorite: false,
          aiNotesAr:
            serverAiNotes ||
            'تم تطبيق الاختيارات المرئية على المساحة مع الحفاظ الكامل على مواضع الأبواب والشبابيك وزاوية التصوير.',
          preservedElementsAr: comp.preservedElementsAr,
        };

        updateActiveRoom((rm) => ({
          ...rm,
          versions: [newVer, ...rm.versions],
          selectedVersionId: newVer.id,
        }));
        showToast('تم إنشاء التصميم وحفظه في سجل نسخ الغرفة');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Run Smart Room Analysis via Gemini Vision
  const handleRunSmartAnalysis = async () => {
    const primaryPhoto =
      activeRoom.photos.find((p) => p.isPrimary) || activeRoom.photos[0];
    if (!primaryPhoto) return;

    setIsAnalyzing(true);
    try {
      const roomName = ROOM_TYPES.find((r) => r.id === activeRoom.selections.roomType)?.nameAr || 'غرفة';
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: primaryPhoto.dataUrl,
          roomTypeHintAr: roomName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.aiPowered && data.analysis) {
          updateActiveRoom((rm) => ({
            ...rm,
            analysis: data.analysis,
          }));
          showToast('تم تحديث التحليل الذكي للمكان بنجاح');
          return;
        }
      }
      // Local fallback
      const localAnalysis = buildLocalSmartAnalysis(activeRoom.selections, primaryPhoto.clarityCheck);
      updateActiveRoom((rm) => ({
        ...rm,
        analysis: localAnalysis,
      }));
      showToast('تم تحديث التحليل الهندسي لعناصر المكان');
    } catch (_e) {
      const localAnalysis = buildLocalSmartAnalysis(activeRoom.selections, primaryPhoto.clarityCheck);
      updateActiveRoom((rm) => ({
        ...rm,
        analysis: localAnalysis,
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdatePriceRecord = (record: PriceRecord) => {
    setPriceCatalog((prev) => {
      const exists = prev.some((p) => p.id === record.id);
      const next = exists
        ? prev.map((p) => (p.id === record.id ? record : p))
        : [record, ...prev];
      fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceRecord: record }),
      }).catch(() => {});
      return next;
    });
    showToast(`تم تحديث سعر «${record.materialNameAr}» في قاعدة البيانات`);
  };

  const handleApplyGalleryPresetToUserPhoto = (
    preset: Partial<UserDesignSelections>,
    titleAr: string
  ) => {
    updateActiveRoom((rm) => ({
      ...rm,
      selections: {
        ...rm.selections,
        ...preset,
      },
    }));
    setActiveTab('studio');
    showToast(`تم نقل إعدادات «${titleAr}» إلى صورتك الأصلية — اضغط «اعرض التصميم» لمعاينة النتيجة`);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-[#F5F2EB] flex flex-col">
      {/* TOP BAR CONTRACT: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#0B0B0E]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 no-print">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand lockup with architectural house/interior icon and BiDi-safe Arabic & English name */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F5F2EB] whitespace-nowrap shrink-0"
          >
            <svg
              viewBox="0 0 36 36"
              fill="none"
              className="w-8 h-8 shrink-0"
              aria-hidden="true"
            >
              {/* Outer Architectural House Frame */}
              <path
                d="M4 16.5L18 5L32 16.5V31H4V16.5Z"
                stroke="#C6A355"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Inner Interior Perspective Lines */}
              <path
                d="M11 31V19.5L18 14L25 19.5V31"
                stroke="#F5F2EB"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M4 31L11 24.5H25L32 31"
                stroke="#C6A355"
                strokeWidth="1.4"
                strokeOpacity="0.75"
              />
              <circle cx="18" cy="19.5" r="1.6" fill="#C6A355" />
            </svg>
            <span className="flex items-center gap-2">
              <bdi className="text-[#F5F2EB] font-bold">مكان</bdi>
              <span className="text-white/25 font-light" aria-hidden="true">|</span>
              <bdi dir="ltr" className="text-[#C6A355] font-mono text-sm tracking-wider font-semibold">
                MAKAN AI
              </bdi>
            </span>
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#A6A29A]">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('home');
              }}
              className={`hover:text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'home' ? 'text-[#C6A355] underline underline-offset-8' : ''
              }`}
            >
              الرئيسية
            </a>
            <a
              href="#studio"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('studio');
              }}
              className={`hover:text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'studio' ? 'text-[#C6A355] underline underline-offset-8' : ''
              }`}
            >
              استوديو التصميم
            </a>
            <a
              href="#gallery"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('gallery');
              }}
              className={`hover:text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'gallery' ? 'text-[#C6A355] underline underline-offset-8' : ''
              }`}
            >
              معرض الإلهام
            </a>
            <a
              href="#boq"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('boq');
              }}
              className={`hover:text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'boq' ? 'text-[#C6A355] underline underline-offset-8' : ''
              }`}
            >
              حاسبة التشطيبات
            </a>
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('projects');
              }}
              className={`hover:text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'projects' ? 'text-[#C6A355] underline underline-offset-8' : ''
              }`}
            >
              مشروعاتي
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className="px-4 py-2 text-xs font-bold text-[#0B0B0E] bg-[#C6A355] rounded-lg hover:bg-[#d4b265] transition-colors whitespace-nowrap shrink-0"
            >
              ابدأ تصميم مكانك
            </button>
          </div>
        </div>

        {/* Mobile Secondary Nav Bar */}
        <div className="flex md:hidden items-center justify-around gap-2 pt-2.5 mt-2.5 border-t border-white/10 overflow-x-auto text-xs">
          {[
            { id: 'home', label: 'الرئيسية' },
            { id: 'studio', label: 'استوديو التصميم' },
            { id: 'gallery', label: 'المعرض' },
            { id: 'boq', label: 'حاسبة التكلفة' },
            { id: 'projects', label: 'مشروعاتي' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as MainTab)}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 ${
                activeTab === t.id ? 'bg-[#C6A355] text-[#0B0B0E] font-bold' : 'text-[#A6A29A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-[#141418] border border-[#C6A355] text-[#F5F2EB] px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 no-print">
          <span className="text-[#C6A355]">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 md:px-8 py-6">
        {activeTab === 'home' && (
          <LandingHomeView
            projectsCount={projects.length}
            savedProjects={projects}
            onStartStudioWithUpload={() => setActiveTab('studio')}
            onStartWithSampleState={(state) => {
              const newUrl = renderProceduralRoomToDataUrl({
                width: 960,
                height: 580,
                state,
                roomType: activeRoom.selections.roomType,
              });
              const samplePhoto: UploadedPhoto = {
                id: `sample_${state}_${Date.now()}`,
                name:
                  state === 'unfinished_brick'
                    ? 'غرفة على الطوب الأحمر'
                    : state === 'semi_plaster'
                    ? 'شقة على المحارة'
                    : 'غرفة قديمة للتجديد',
                dataUrl: newUrl,
                angleLabelAr: 'الزاوية الأساسية',
                isPrimary: true,
                clarityCheck: { isClear: true, width: 960, height: 580, brightness: 130 },
              };
              updateActiveRoom((rm) => ({
                ...rm,
                photos: [samplePhoto, ...rm.photos.map((p) => ({ ...p, isPrimary: false }))],
              }));
              setActiveTab('studio');
            }}
            onStartWithStyle={(styleId: StyleId) => {
              const st = DESIGN_STYLES.find((s) => s.id === styleId) || DESIGN_STYLES[0];
              const wc = WALL_COLORS.find((w) => w.id === st.recommendedWallColorId) || WALL_COLORS[0];
              updateActiveRoom((rm) => ({
                ...rm,
                selections: {
                  ...rm.selections,
                  styleId: st.id,
                  wallColorId: st.recommendedWallColorId,
                  selectedWallShadeHex: wc.hex,
                  wallFinishId: st.recommendedWallFinishId,
                  flooringId: st.recommendedFloorId,
                  lightingTemp: st.recommendedLightingTemp,
                },
              }));
              setActiveTab('studio');
            }}
            onOpenGallery={() => setActiveTab('gallery')}
            onOpenBOQCalculator={() => setActiveTab('boq')}
            onOpenSavedProject={(projId) => {
              setActiveProjectId(projId);
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'studio' && (
          <DesignStudioView
            project={activeProject}
            activeRoom={activeRoom}
            isGenerating={isGenerating}
            isAnalyzing={isAnalyzing}
            onSelectRoom={(roomId) => {
              updateActiveProject((proj) => ({ ...proj, activeRoomId: roomId }));
            }}
            onAddRoomToApartment={(nameAr, roomType) => {
              const newRoom = createDefaultRoomUnit(
                `room_${Date.now()}`,
                nameAr,
                roomType,
                'semi_plaster'
              );
              updateActiveProject((proj) => ({
                ...proj,
                isFullApartment: true,
                rooms: [...proj.rooms, newRoom],
                activeRoomId: newRoom.id,
              }));
              showToast(`تمت إضافة «${nameAr}» إلى مشروع الشقة بنجاح`);
            }}
            onUpdatePhotos={(photos) => {
              updateActiveRoom((rm) => ({ ...rm, photos }));
            }}
            onUpdateSelections={(selections) => {
              updateActiveRoom((rm) => ({ ...rm, selections }));
            }}
            onGenerateDesign={handleGenerateDesign}
            onRunSmartAnalysis={handleRunSmartAnalysis}
            onSelectVersion={(versionId) => {
              const chosen = activeRoom.versions.find((v) => v.id === versionId);
              updateActiveRoom((rm) => ({
                ...rm,
                selectedVersionId: versionId,
                selections: chosen ? { ...chosen.selections } : rm.selections,
              }));
              showToast('تم ربط حساب التكلفة والكميات بهذا التصميم المحدد');
            }}
            onToggleFavoriteVersion={(versionId) => {
              updateActiveRoom((rm) => ({
                ...rm,
                versions: rm.versions.map((v) =>
                  v.id === versionId ? { ...v, isFavorite: !v.isFavorite } : v
                ),
              }));
            }}
            onDeleteVersion={(versionId) => {
              updateActiveRoom((rm) => {
                const filtered = rm.versions.filter((v) => v.id !== versionId);
                return {
                  ...rm,
                  versions: filtered,
                  selectedVersionId:
                    rm.selectedVersionId === versionId ? filtered[0]?.id : rm.selectedVersionId,
                };
              });
            }}
            onUpdateFloorPlanItems={(items) => {
              updateActiveRoom((rm) => ({ ...rm, floorPlanItems: items }));
            }}
            onOpenBOQForSelectedDesign={() => setActiveTab('boq')}
          />
        )}

        {activeTab === 'gallery' && (
          <InspirationGalleryView
            onApplyPresetToUserPhoto={handleApplyGalleryPresetToUserPhoto}
          />
        )}

        {activeTab === 'boq' && (
          <BOQAndPricesView
            project={activeProject}
            activeRoom={activeRoom}
            priceCatalog={priceCatalog}
            onUpdateDimensions={(dimensions) => {
              updateActiveRoom((rm) => ({ ...rm, dimensions }));
            }}
            onUpdatePriceRecord={handleUpdatePriceRecord}
            onSelectRoom={(roomId) => {
              updateActiveProject((proj) => ({ ...proj, activeRoomId: roomId }));
            }}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsDashboardView
            projects={projects}
            activeProjectId={activeProject.id}
            priceCatalog={priceCatalog}
            onSelectProject={(projId) => {
              setActiveProjectId(projId);
              setActiveTab('studio');
            }}
            onCreateNewProject={(nameAr, isFullApartment, initialRoomType) => {
              const roomName =
                ROOM_TYPES.find((r) => r.id === initialRoomType)?.nameAr || 'الغرفة الرئيسية';
              const firstRoom = createDefaultRoomUnit(
                `room_${Date.now()}_1`,
                roomName,
                initialRoomType,
                'unfinished_brick'
              );
              const newRooms = [firstRoom];
              if (isFullApartment) {
                newRooms.push(
                  createDefaultRoomUnit(
                    `room_${Date.now()}_2`,
                    'غرفة النوم الرئيسية',
                    'master_bedroom',
                    'semi_plaster'
                  ),
                  createDefaultRoomUnit(
                    `room_${Date.now()}_3`,
                    'المطبخ',
                    'kitchen',
                    'semi_plaster'
                  )
                );
              }
              const newProj: MakanProject = {
                id: `proj_${Date.now()}`,
                nameAr,
                isFullApartment,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                region: 'greater_cairo',
                rooms: newRooms,
                activeRoomId: firstRoom.id,
                sharedApartmentCosts: {
                  mainElectricalPanelEgp: 14500,
                  mainArmoredDoorEgp: 18500,
                  sharedPlumbingNetworkEgp: 16000,
                },
              };
              setProjects((prev) => [newProj, ...prev]);
              setActiveProjectId(newProj.id);
              setActiveTab('studio');
              showToast(`تم إنشاء مشروع «${nameAr}» وفتحه في استوديو التصميم`);
            }}
            onDeleteProject={(projId) => {
              setProjects((prev) => {
                const next = prev.filter((p) => p.id !== projId);
                if (activeProjectId === projId && next[0]) {
                  setActiveProjectId(next[0].id);
                }
                return next;
              });
              fetch(`/api/projects/${projId}`, { method: 'DELETE' }).catch(() => {});
              showToast('تم حذف المشروع');
            }}
          />
        )}
      </main>

      {/* QUIET ARCHITECTURAL FOOTER */}
      <footer className="border-t border-white/10 py-6 px-4 md:px-8 mt-12 text-xs text-[#A6A29A] no-print">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <bdi className="text-[#F5F2EB] font-bold">مكان</bdi>
            <span className="text-white/25">|</span>
            <bdi dir="ltr" className="text-[#C6A355] font-mono font-semibold">MAKAN AI</bdi>
            <span>— «تخيّل مساحتك قبل ما تغيّرها.»</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className="hover:text-white transition-colors"
            >
              استوديو التصميم
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className="hover:text-white transition-colors"
            >
              معرض الإلهام
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('boq')}
              className="hover:text-white transition-colors"
            >
              حاسبة الكميات والأسعار المصرية
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className="hover:text-white transition-colors"
            >
              مشروعاتي
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

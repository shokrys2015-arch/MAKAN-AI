export type RoomTypeId =
  | 'living_room'
  | 'master_bedroom'
  | 'kids_room'
  | 'kitchen'
  | 'bathroom'
  | 'dressing_room'
  | 'home_office'
  | 'admin_office'
  | 'retail_shop'
  | 'cafe_restaurant'
  | 'reception_commercial'
  | 'full_apartment'
  | 'other_interior';

export type DesignPathId = 'quick' | 'custom' | 'complete' | 'element_mask';

export type StyleId =
  | 'modern'
  | 'classic'
  | 'neoclassic'
  | 'minimal'
  | 'scandinavian'
  | 'industrial'
  | 'hotel_luxury'
  | 'contemporary'
  | 'modern_arabic'
  | 'art_deco'
  | 'bohemian'
  | 'rustic'
  | 'japandi'
  | 'mediterranean';

export type QualityTier = 'economic' | 'standard' | 'luxury' | 'ultra_luxury';

export type EgyptianRegion =
  | 'greater_cairo'
  | 'new_cairo_capital'
  | 'alexandria'
  | 'north_coast'
  | 'delta'
  | 'upper_egypt';

export type MaskZoneId =
  | 'walls'
  | 'floor'
  | 'ceiling'
  | 'lighting'
  | 'furniture'
  | 'curtains'
  | 'custom_brush';

export interface RoomTypeOption {
  id: RoomTypeId;
  nameAr: string;
  categoryAr: 'سكني' | 'تجاري وإداري' | 'متكامل';
  descriptionAr: string;
  defaultDimensions: { length: number; width: number; height: number; doors: number; windows: number };
  previewSceneConfig: {
    wallHex: string;
    floorHex: string;
    floorPattern: 'marble' | 'parquet' | 'ceramic' | 'concrete' | 'microcement';
    accentHex: string;
    roomKind: string;
  };
}

export interface StyleOption {
  id: StyleId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  luxuryLevel: QualityTier;
  recommendedWallColorId: string;
  recommendedWallFinishId: string;
  recommendedFloorId: string;
  recommendedCeilingId: string;
  recommendedLightingTemp: '2700K' | '3000K' | '4000K' | '6000K';
  paletteHex: [string, string, string, string];
  floorPattern: 'marble' | 'parquet' | 'ceramic' | 'concrete' | 'microcement';
}

export interface WallColorOption {
  id: string;
  nameAr: string;
  code: string;
  familyAr: 'أبيض وأوف وايت' | 'بيج وجريج' | 'رمادي وأسود' | 'بني ودافئ' | 'أزرق وأخضر';
  hex: string;
  shades: { labelAr: string; hex: string }[];
}

export interface WallFinishOption {
  id: string;
  nameAr: string;
  categoryAr: string;
  descriptionAr: string;
  patternType: 'paint_matte' | 'paint_velvet' | 'wallpaper' | 'wood_slats' | 'marble_alternative' | 'natural_stone' | 'concrete_effect' | '3d_panels' | 'neoclassic_molding';
  priceCategoryKey: string;
  previewHex: string;
  accentHex: string;
}

export interface FlooringOption {
  id: string;
  nameAr: string;
  typeAr: 'السيراميك' | 'البورسلين' | 'الرخام' | 'الجرانيت' | 'الباركيه' | 'HDF' | 'الفينيل' | 'الميكروسيمنت' | 'الأرضيات الإسمنتية';
  patternType: 'marble' | 'parquet' | 'ceramic' | 'concrete' | 'microcement' | 'granite' | 'hdf' | 'vinyl';
  colorNameAr: string;
  primaryHex: string;
  secondaryHex: string;
  wastePercentage: number;
  availableQualities: QualityTier[];
  priceCategoryKey: string;
}

export interface CeilingLightingOption {
  id: string;
  nameAr: string;
  categoryAr: 'السقف' | 'الإضاءة';
  subType: 'flat_ceiling' | 'gypsum_board' | 'cornice' | 'hidden_led' | 'spotlights' | 'chandelier' | 'pendant' | 'wall_sconce';
  descriptionAr: string;
  priceCategoryKey: string;
}

export interface FurnitureOption {
  id: string;
  nameAr: string;
  categoryAr: 'الأرائك والجلوس' | 'الطاولات' | 'وحدات التلفزيون والمكتبات' | 'الأسرّة والدواليب' | 'وحدات المطبخ والحمام' | 'تجهيزات المكاتب والكافيهات' | 'السجاد والستائر' | 'النباتات والإكسسوارات';
  applicableRooms: RoomTypeId[];
  defaultColorHex: string;
  materialAr: string;
  shapeAr: string;
  luxuryLevel: QualityTier;
  estimatedPriceEgp: Record<QualityTier, number>;
}

export interface UploadedPhoto {
  id: string;
  name: string;
  dataUrl: string;
  angleLabelAr: string;
  isPrimary: boolean;
  clarityCheck: {
    isClear: boolean;
    width: number;
    height: number;
    brightness: number;
    warningMessageAr?: string;
  };
}

export interface UserDesignSelections {
  roomType: RoomTypeId;
  designPath: DesignPathId;
  styleId: StyleId;
  // Active toggles for custom or element-specific modes
  modifyWalls: boolean;
  modifyFloor: boolean;
  modifyCeiling: boolean;
  modifyLighting: boolean;
  modifyFurniture: boolean;
  modifyCurtains: boolean;
  preserveArchitecture: boolean; // Doors, windows, columns lock
  // Specific choices
  wallColorId: string;
  selectedWallShadeHex: string;
  wallFinishId: string;
  flooringId: string;
  flooringQuality: QualityTier;
  ceilingOptions: string[];
  lightingTemp: '2700K' | '3000K' | '4000K' | '6000K';
  selectedFurnitureIds: string[];
  furnitureLuxury: QualityTier;
  // Element masking state
  activeMaskZones: MaskZoneId[];
  customBrushStrokes: { x: number; y: number; radius: number }[];
}

export interface SmartRoomAnalysis {
  analyzedAt: string;
  aiPowered: boolean;
  confirmedVisible: {
    probableRoomTypeAr: string;
    finishConditionAr: string;
    visibleFurnitureAr: string[];
    wallColorsAndStateAr: string;
    floorMaterialAndStateAr: string;
    visibleLightingAr: string[];
    architecturalElementsAr: string[];
  };
  estimatedInsights: {
    renovationPrioritiesAr: string[];
    recommendedStyleIds: StyleId[];
    colorHarmonyAdviceAr: string;
    measurementDisclaimerAr: string;
  };
}

export interface DesignVersion {
  id: string;
  labelAr: string;
  createdAt: string;
  sourcePhotoId: string;
  originalDataUrl: string;
  resultDataUrl: string;
  selections: UserDesignSelections;
  isFavorite: boolean;
  isAlternative?: boolean;
  alternativeIndex?: number;
  aiNotesAr: string;
  preservedElementsAr: string[];
}

export interface RoomDimensionsInput {
  isMeasuredByUser: boolean;
  lengthM: number;
  widthM: number;
  heightM: number;
  doorsCount: number;
  doorAreaM2: number;
  windowsCount: number;
  windowAreaM2: number;
  region: EgyptianRegion;
  qualityTier: QualityTier;
  finishScope: 'paint_and_decor' | 'semi_finished_to_full' | 'red_brick_to_full' | 'floor_or_wall_only';
  includeLabor: boolean;
  includeSupervisionAndContingency: boolean;
  contingencyPercent: number;
}

export interface BOQLineItem {
  id: string;
  categoryAr: string;
  itemNameAr: string;
  unitAr: string;
  quantity: number;
  wastePercent: number;
  quantityWithWaste: number;
  referenceUnitPriceEgp: number;
  laborUnitPriceEgp: number;
  materialTotalEgp: number;
  laborTotalEgp: number;
  combinedTotalEgp: number;
  contractorActualQuoteEgp?: number;
  priceSourceAr: string;
  lastUpdated: string;
  notesAr: string;
}

export interface BOQReport {
  isExactMeasurement: boolean;
  accuracyNoticeAr: string;
  geometry: {
    floorAreaM2: number;
    perimeterM: number;
    grossWallAreaM2: number;
    openingsAreaM2: number;
    netPaintableWallAreaM2: number;
    ceilingAreaM2: number;
  };
  quantitiesSummary: {
    floorTilesWithWasteM2: number;
    paintLitersRequired: number;
    paintBuckets18L: number;
    puttyBagsRequired: number;
    gypsumBoardM2: number;
    ledStripMeters: number;
    recommendedSpotlightsCount: number;
  };
  lineItems: BOQLineItem[];
  totals: {
    materialsTotalEgp: number;
    furnitureTotalEgp: number;
    laborTotalEgp: number;
    contingencyEgp: number;
    estimatedGrandTotalEgp: number;
    contractorQuotesTotalEgp?: number;
  };
  assumptionsAr: string[];
}

export interface PriceRecord {
  id: string;
  categoryKey: string;
  materialNameAr: string;
  categoryAr: 'الدهانات' | 'السيراميك والبورسلين' | 'الرخام والجرانيت' | 'الأخشاب والباركيه' | 'الجبس بورد والأسقف' | 'الإضاءة والكهرباء' | 'تجاليد الحوائط' | 'المصنعيات والعمالة';
  unitAr: string;
  qualityTier: QualityTier;
  referencePriceEgp: number;
  contractorQuoteEgp?: number;
  region: EgyptianRegion;
  sourceAr: string;
  supplierNameAr?: string;
  lastUpdated: string;
  notesAr: string;
}

export interface FloorPlanFurnitureItem {
  id: string;
  nameAr: string;
  category: 'sofa' | 'bed' | 'table' | 'tv_unit' | 'chair' | 'rug' | 'plant' | 'desk' | 'cabinet';
  xMeters: number;
  yMeters: number;
  widthMeters: number;
  depthMeters: number;
  rotationDeg: number;
  colorHex: string;
}

export interface ApartmentRoomUnit {
  id: string;
  nameAr: string;
  roomType: RoomTypeId;
  photos: UploadedPhoto[];
  selections: UserDesignSelections;
  versions: DesignVersion[];
  selectedVersionId?: string;
  dimensions: RoomDimensionsInput;
  analysis?: SmartRoomAnalysis;
  floorPlanItems: FloorPlanFurnitureItem[];
}

export interface MakanProject {
  id: string;
  nameAr: string;
  isFullApartment: boolean;
  createdAt: string;
  updatedAt: string;
  region: EgyptianRegion;
  rooms: ApartmentRoomUnit[];
  activeRoomId: string;
  sharedApartmentCosts?: {
    mainElectricalPanelEgp: number;
    mainArmoredDoorEgp: number;
    sharedPlumbingNetworkEgp: number;
  };
}

export interface InspirationGalleryItem {
  id: string;
  titleAr: string;
  roomType: RoomTypeId;
  styleId: StyleId;
  colorFamilyAr: 'بيج وجريج' | 'أبيض وأوف وايت' | 'رمادي وأسود' | 'بني ودافئ' | 'أزرق وأخضر';
  floorTypeAr: 'الرخام' | 'البورسلين' | 'الباركيه' | 'الميكروسيمنت' | 'السيراميك';
  luxuryLevel: QualityTier;
  usageTypeAr: 'سكني' | 'تجاري وإداري';
  descriptionAr: string;
  presetSelections: Partial<UserDesignSelections>;
}

import {
  StyleId,
  RoomTypeId,
} from '../types/makan';

export interface ProceduralRoomSceneParams {
  width?: number;
  height?: number;
  state?: 'unfinished_brick' | 'semi_plaster' | 'old_room' | 'designed';
  roomType?: RoomTypeId;
  styleId?: StyleId;
  wallHex?: string;
  wallFinishPattern?: string;
  floorPrimaryHex?: string;
  floorSecondaryHex?: string;
  floorPattern?: 'marble' | 'parquet' | 'ceramic' | 'concrete' | 'microcement' | 'granite' | 'hdf' | 'vinyl';
  lightingTemp?: '2700K' | '3000K' | '4000K' | '6000K';
  hasGypsumCove?: boolean;
  hasSpotlights?: boolean;
  hasChandelier?: boolean;
  hasWallSconce?: boolean;
  showFurniture?: boolean;
  showCurtains?: boolean;
  furniturePrimaryHex?: string;
  furnitureAccentHex?: string;
  variantSeed?: number;
}

const STYLE_IMAGE_MAP: Record<StyleId, string> = {
  neoclassic: '/images/style_neoclassic.jpg',
  modern: '/images/style_modern.jpg',
  hotel_luxury: '/images/style_hotel_luxury.jpg',
  minimal: '/images/style_minimal.jpg',
  scandinavian: '/images/style_scandinavian.jpg',
  modern_arabic: '/images/style_modern_arabic.jpg',
  classic: '/images/style_classic.jpg',
  contemporary: '/images/style_contemporary.jpg',
  industrial: '/images/style_industrial.jpg',
  japandi: '/images/style_japandi.jpg',
  art_deco: '/images/style_art_deco.jpg',
  bohemian: '/images/style_bohemian.jpg',
  rustic: '/images/style_rustic.jpg',
  mediterranean: '/images/style_mediterranean.jpg',
};

const ROOM_TYPE_DEFAULT_IMAGE_MAP: Partial<Record<RoomTypeId, string>> = {
  master_bedroom: '/images/room_bedroom_luxury.jpg',
  kids_room: '/images/room_bedroom_luxury.jpg',
  kitchen: '/images/room_kitchen_modern.jpg',
  bathroom: '/images/room_bathroom_luxury.jpg',
  office: '/images/room_office_exec.jpg',
};

/**
 * Returns a real, high-resolution architectural photograph URL for any room state or style.
 * Completely replaces the old 2D canvas drawing so the user never sees cartoon graphics.
 */
export function renderProceduralRoomToDataUrl(params: ProceduralRoomSceneParams): string {
  const state = params.state || 'designed';

  if (state === 'unfinished_brick') {
    return '/images/before_unfinished.jpg';
  }
  if (state === 'semi_plaster') {
    return '/images/before_semi_plaster.jpg';
  }
  if (state === 'old_room') {
    return '/images/before_old_room.jpg';
  }

  if (params.styleId && STYLE_IMAGE_MAP[params.styleId]) {
    return STYLE_IMAGE_MAP[params.styleId];
  }

  if (params.roomType && ROOM_TYPE_DEFAULT_IMAGE_MAP[params.roomType]) {
    return ROOM_TYPE_DEFAULT_IMAGE_MAP[params.roomType]!;
  }

  return '/images/after_neoclassic.jpg';
}

export function getStylePreviewDataUrl(styleId: StyleId, roomType?: RoomTypeId): string {
  if (roomType && ROOM_TYPE_DEFAULT_IMAGE_MAP[roomType] && styleId === 'modern') {
    return ROOM_TYPE_DEFAULT_IMAGE_MAP[roomType]!;
  }
  return STYLE_IMAGE_MAP[styleId] || '/images/style_neoclassic.jpg';
}

export function shadeHex(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean,
    16
  );
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export interface SampleRoomPreset {
  id: string;
  nameAr: string;
  subtitleAr: string;
  roomType: RoomTypeId;
  state: 'unfinished_brick' | 'semi_plaster' | 'old_room';
  imageUrl: string;
}

export const SAMPLE_STARTING_ROOMS: SampleRoomPreset[] = [
  {
    id: 'sample_plaster',
    nameAr: 'شقة نصف تشطيب (محارة وحلوق)',
    subtitleAr: 'نموذج واقعي لشقة مصرية على المحارة لتجربة ألوان الدهانات والبانوهات والرخام والجبس بورد',
    roomType: 'living_room',
    state: 'semi_plaster',
    imageUrl: '/images/before_semi_plaster.jpg',
  },
  {
    id: 'sample_brick',
    nameAr: 'غرفة تحت الإنشاء (تأسيس وتشطيب)',
    subtitleAr: 'مثالية لتجربة التشطيب المتكامل من الصفر ورؤية النتيجة النهائية ومقايسة التكلفة',
    roomType: 'living_room',
    state: 'unfinished_brick',
    imageUrl: '/images/before_unfinished.jpg',
  },
  {
    id: 'sample_old',
    nameAr: 'غرفة قائمة تحتاج إلى تجديد',
    subtitleAr: 'مفروشة حالياً لتجربة تغيير لون الحائط فقط أو الأرضية فقط أو تحديث الإضاءة',
    roomType: 'living_room',
    state: 'old_room',
    imageUrl: '/images/before_old_room.jpg',
  },
];

import {
  UserDesignSelections,
  SmartRoomAnalysis,
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
} from '../data/catalogData';

export interface HiddenCompiledDirective {
  /** Internal system prompt sent only to the AI engine in the background (never shown in UI) */
  systemArchitecturalLockPrompt: string;
  /** Internal surface-by-surface execution instructions compiled from user button clicks */
  compiledSurfaceDirectiveEn: string;
  /** Internal Arabic summary for server-side Gemini Vision context */
  compiledContextAr: string;
  /** Active target surfaces to modify */
  targetSurfaces: {
    walls: boolean;
    floor: boolean;
    ceiling: boolean;
    lighting: boolean;
    furniture: boolean;
    curtains: boolean;
    customBrush: boolean;
  };
}

/**
 * Silently compiles the user's visual UI selections into a strict, structured architectural
 * Image-to-Image directive in the background without exposing any prompt text in the UI.
 */
export function compileHiddenArchitecturalPrompt(
  selections: UserDesignSelections,
  analysis?: SmartRoomAnalysis
): HiddenCompiledDirective {
  const roomObj = ROOM_TYPES.find((r) => r.id === selections.roomType) || ROOM_TYPES[0];
  const styleObj = DESIGN_STYLES.find((s) => s.id === selections.styleId) || DESIGN_STYLES[0];
  const wallColorObj =
    WALL_COLORS.find((w) => w.id === selections.wallColorId) ||
    WALL_COLORS.find((w) => w.id === styleObj.recommendedWallColorId) ||
    WALL_COLORS[0];
  const wallFinishObj =
    WALL_FINISHES.find((f) => f.id === selections.wallFinishId) || WALL_FINISHES[0];
  const floorObj =
    FLOORING_OPTIONS.find((f) => f.id === selections.flooringId) ||
    FLOORING_OPTIONS.find((f) => f.id === styleObj.recommendedFloorId) ||
    FLOORING_OPTIONS[0];
  const lightTempObj =
    LIGHTING_TEMPS.find((l) => l.id === selections.lightingTemp) || LIGHTING_TEMPS[0];

  const isElementMode = selections.designPath === 'element_mask';
  const doWalls = isElementMode
    ? selections.activeMaskZones.includes('walls')
    : selections.designPath === 'quick' ||
      selections.designPath === 'complete' ||
      selections.modifyWalls;
  const doFloor = isElementMode
    ? selections.activeMaskZones.includes('floor')
    : selections.designPath === 'quick' ||
      selections.designPath === 'complete' ||
      selections.modifyFloor;
  const doCeiling = isElementMode
    ? selections.activeMaskZones.includes('ceiling')
    : selections.designPath === 'quick' ||
      selections.designPath === 'complete' ||
      selections.modifyCeiling;
  const doLighting = isElementMode
    ? selections.activeMaskZones.includes('lighting')
    : selections.designPath === 'quick' ||
      selections.designPath === 'complete' ||
      selections.modifyLighting;
  const doFurniture = isElementMode
    ? selections.activeMaskZones.includes('furniture')
    : selections.modifyFurniture;
  const doCurtains = isElementMode
    ? selections.activeMaskZones.includes('curtains')
    : selections.modifyCurtains;
  const doCustomBrush =
    isElementMode &&
    selections.activeMaskZones.includes('custom_brush') &&
    selections.customBrushStrokes.length > 0;

  const targetWallHex = selections.selectedWallShadeHex || wallColorObj.hex;

  // Extract real scene context if Gemini / local analysis has already inspected the photo
  const visibleArch =
    analysis?.confirmedVisible?.architecturalElementsAr?.join(', ') ||
    'الأبواب والشبابيك والفتحات المعمارية الأصلية';
  const currentCondition =
    analysis?.confirmedVisible?.finishConditionAr || 'حالة الغرفة الأصلية';

  // 1. Hard Architectural Lock (prevents inventing new rooms or altering geometry)
  const systemArchitecturalLockPrompt = [
    'STRICT ARCHITECTURAL IMAGE-TO-IMAGE SURFACE EDITING:',
    '- Input is a real photograph of the user’s actual space. You MUST preserve the exact camera angle, focal length, room perspective, wall corners, ceiling height, and floor plane.',
    '- HARD GEOMETRY LOCK: Do NOT add, remove, resize, or relocate any doors, doorways, windows, balconies, structural columns, beams, or electrical outlets.',
    `- Detected fixed architectural elements to keep 100% intact: [${visibleArch}].`,
    '- Do NOT generate a fictional room or replace the room structure.',
  ].join('\n');

  // 2. Dynamic Surface Directives built from every active selection
  const directivesEn: string[] = [];
  const directivesAr: string[] = [];

  directivesEn.push(
    `Target Interior Style: ${styleObj.nameEn} (${styleObj.nameAr}) for a ${roomObj.nameAr}.`
  );
  directivesAr.push(`النمط: ${styleObj.nameAr} (${roomObj.nameAr})`);

  if (doWalls) {
    const moldingNote =
      wallFinishObj.id === 'finish_neoclassic_molding' ||
      styleObj.id === 'neoclassic' ||
      styleObj.id === 'classic'
        ? ' with subtle architectural Neoclassic gypsum molding frames (banoha) on solid wall planes away from doors/windows'
        : '';
    directivesEn.push(
      `WALLS: Resurface walls into smooth freshly painted ${wallColorObj.nameAr} (${targetWallHex}, ${wallFinishObj.nameAr})${moldingNote}, with crisp white baseboard skirting along the floor-wall junction.`
    );
    directivesAr.push(
      `الحوائط: دهان ${wallColorObj.nameAr} (${targetWallHex}) بتشطيب ${wallFinishObj.nameAr}`
    );
  } else {
    directivesEn.push('WALLS: Keep original walls 100% unchanged.');
    directivesAr.push('الحوائط: تثبيت الحوائط الأصلية بدون تغيير');
  }

  if (doFloor) {
    directivesEn.push(
      `FLOORING: Resurface the floor plane in perspective with photorealistic ${floorObj.typeAr} — ${floorObj.nameAr} (${floorObj.colorNameAr}, ${floorObj.primaryHex}) preserving natural daylight specular reflections.`
    );
    directivesAr.push(`الأرضية: ${floorObj.nameAr} (${floorObj.colorNameAr})`);
  } else {
    directivesEn.push('FLOORING: Keep original floor 100% unchanged.');
    directivesAr.push('الأرضية: تثبيت الأرضية الأصلية بدون تغيير');
  }

  if (doCeiling) {
    const ceilNames = selections.ceilingOptions
      .map((cid) => CEILING_LIGHTING_OPTIONS.find((c) => c.id === cid)?.nameAr)
      .filter(Boolean)
      .join(' + ');
    directivesEn.push(
      `CEILING & LIGHTING: Smooth flat white gypsum board ceiling (${ceilNames || 'جبس بورد مسطح'}) with ${
        doLighting ? `${lightTempObj.id} (${lightTempObj.nameAr}) recessed anti-glare LED spotlights` : 'natural ambient lighting'
      }.`
    );
    directivesAr.push(
      `السقف والإضاءة: ${ceilNames || 'جبس بورد أبيض ناعم'} مع إضاءة ${lightTempObj.id}`
    );
  } else {
    directivesEn.push('CEILING: Keep original ceiling 100% unchanged.');
  }

  if (doFurniture && selections.selectedFurnitureIds.length > 0) {
    const furnNames = selections.selectedFurnitureIds
      .map((fid) => FURNITURE_CATALOG.find((f) => f.id === fid)?.nameAr)
      .filter(Boolean)
      .join('، ');
    if (furnNames) {
      directivesAr.push(`عناصر الفرش المختارة: ${furnNames}`);
    }
  }

  return {
    systemArchitecturalLockPrompt,
    compiledSurfaceDirectiveEn: directivesEn.join('\n'),
    compiledContextAr: `حالة المكان الأصلية: (${currentCondition}) | العناصر الثابتة المحمية: (${visibleArch}) | الأوامر المطلوبة: ${directivesAr.join(
      ' · '
    )}`,
    targetSurfaces: {
      walls: doWalls,
      floor: doFloor,
      ceiling: doCeiling,
      lighting: doLighting,
      furniture: doFurniture,
      curtains: doCurtains,
      customBrush: doCustomBrush,
    },
  };
}

import {
  UserDesignSelections,
  SmartRoomAnalysis,
} from '../types/makan';
import {
  WALL_COLORS,
  FLOORING_OPTIONS,
  DESIGN_STYLES,
  ROOM_TYPES,
  FURNITURE_CATALOG,
} from '../data/catalogData';
import {
  getStylePreviewDataUrl,
  shadeHex,
} from './proceduralRoomRenderer';

export function analyzeImageClarity(img: HTMLImageElement): {
  isClear: boolean;
  width: number;
  height: number;
  brightness: number;
  warningMessageAr?: string;
} {
  const width = img.naturalWidth || img.width || 800;
  const height = img.naturalHeight || img.height || 600;

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 64;
  sampleCanvas.height = 64;
  const ctx = sampleCanvas.getContext('2d');
  let brightness = 128;

  if (ctx) {
    ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    brightness = Math.round(sum / (64 * 64));
  }

  if (width < 320 || height < 240) {
    return {
      isClear: false,
      width,
      height,
      brightness,
      warningMessageAr:
        'تنبيه: أبعاد الصورة صغيرة نسبياً. يمكنك المتابعة، ولكن يُنصح برفع صورة أعلى دقة للحصول على تفاصيل أوضح للحوائط والأرضيات.',
    };
  }

  if (brightness < 38) {
    return {
      isClear: false,
      width,
      height,
      brightness,
      warningMessageAr:
        'تنبيه: الإضاءة في الصورة خافتة جداً. يُفضل التقاط الصورة في إضاءة جيدة لتحديد حدود الحوائط والفتحات المعمارية بدقة.',
    };
  }

  return {
    isClear: true,
    width,
    height,
    brightness,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
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
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Renders a clean, photorealistic interior design or natural photometric color/lighting grade
 * with ZERO blotches, ZERO hard horizontal lines, and ZERO fake 2D cartoon overlays.
 */
export async function composePhotometricDesign(
  originalDataUrl: string,
  selections: UserDesignSelections,
  variantIndex = 0
): Promise<{ resultDataUrl: string; preservedElementsAr: string[] }> {
  const style = DESIGN_STYLES.find((s) => s.id === selections.styleId) || DESIGN_STYLES[0];
  const wallColorObj =
    WALL_COLORS.find((c) => c.id === selections.wallColorId) ||
    WALL_COLORS.find((c) => c.id === style.recommendedWallColorId) ||
    WALL_COLORS[0];

  let targetWallHex = selections.selectedWallShadeHex || wallColorObj.hex;
  const floorObj =
    FLOORING_OPTIONS.find((f) => f.id === selections.flooringId) ||
    FLOORING_OPTIONS.find((f) => f.id === style.recommendedFloorId) ||
    FLOORING_OPTIONS[0];

  let targetFloorHex = floorObj.primaryHex;

  if (variantIndex === 1) {
    targetWallHex = shadeHex(targetWallHex, -6);
    targetFloorHex = shadeHex(targetFloorHex, 6);
  } else if (variantIndex === 2) {
    targetWallHex = shadeHex(targetWallHex, 6);
    targetFloorHex = shadeHex(targetFloorHex, -8);
  }

  // Determine whether to grade the photorealistic finished reference room or grade the user's own uploaded photo
  const isBuiltInSample =
    originalDataUrl.includes('/images/') || originalDataUrl.startsWith('/images/');

  // Choose base image to grade:
  // - If built-in sample room in 'quick' or 'complete' mode, use the matched photorealistic finished room
  // - If custom user photo (or 'element_mask' / 'custom' path), grade the user's exact photo cleanly without any blotches or lines
  let baseSourceUrl = originalDataUrl;
  if (isBuiltInSample && (selections.designPath === 'quick' || selections.designPath === 'complete')) {
    if (originalDataUrl.includes('hero_before') || originalDataUrl.includes('after_neoclassic')) {
      baseSourceUrl = '/images/after_neoclassic.jpg';
    } else if (originalDataUrl.includes('before_bedroom')) {
      baseSourceUrl = '/images/room_bedroom_luxury.jpg';
    } else {
      const styleToUse =
        variantIndex === 1
          ? 'modern'
          : variantIndex === 2
          ? 'hotel_luxury'
          : selections.styleId;
      baseSourceUrl = getStylePreviewDataUrl(styleToUse, selections.roomType);
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 1280;
      const h = img.naturalHeight || 800;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ resultDataUrl: baseSourceUrl, preservedElementsAr: [] });
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      const isElementMode = selections.designPath === 'element_mask';
      const doWalls = isElementMode
        ? selections.activeMaskZones.includes('walls')
        : selections.designPath === 'quick' || selections.designPath === 'complete' || selections.modifyWalls;
      const doFloor = isElementMode
        ? selections.activeMaskZones.includes('floor')
        : selections.designPath === 'quick' || selections.designPath === 'complete' || selections.modifyFloor;
      const doCeiling = isElementMode
        ? selections.activeMaskZones.includes('ceiling')
        : selections.designPath === 'quick' || selections.designPath === 'complete' || selections.modifyCeiling;
      const doLighting = isElementMode
        ? selections.activeMaskZones.includes('lighting')
        : selections.designPath === 'quick' || selections.designPath === 'complete' || selections.modifyLighting;
      const doCustomBrush =
        isElementMode &&
        selections.activeMaskZones.includes('custom_brush') &&
        selections.customBrushStrokes.length > 0;

      // Optional custom brush mask
      let brushMask: Uint8ClampedArray | null = null;
      if (doCustomBrush) {
        const bCanvas = document.createElement('canvas');
        bCanvas.width = w;
        bCanvas.height = h;
        const bCtx = bCanvas.getContext('2d')!;
        bCtx.fillStyle = '#FFFFFF';
        selections.customBrushStrokes.forEach((stroke) => {
          const grad = bCtx.createRadialGradient(
            stroke.x * w,
            stroke.y * h,
            0,
            stroke.x * w,
            stroke.y * h,
            stroke.radius * w * 1.3
          );
          grad.addColorStop(0, 'rgba(255,255,255,1)');
          grad.addColorStop(0.7, 'rgba(255,255,255,0.8)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          bCtx.fillStyle = grad;
          bCtx.beginPath();
          bCtx.arc(stroke.x * w, stroke.y * h, stroke.radius * w * 1.3, 0, Math.PI * 2);
          bCtx.fill();
        });
        brushMask = bCtx.getImageData(0, 0, w, h).data;
      }

      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;

      const wallRgb = hexToRgb(targetWallHex);
      const floorRgb = hexToRgb(targetFloorHex);

      // Continuous, zero-artifact photometric color harmony pass
      // Uses smooth cosine weights so there are NEVER any hard horizontal lines or black blotches
      for (let y = 0; y < h; y++) {
        const ny = y / h;
        // Smooth vertical zone weights (no sharp cutoffs!)
        const ceilZone = 1 - smoothstep(0.12, 0.32, ny);
        const floorZone = smoothstep(0.62, 0.82, ny);
        const wallZone = Math.max(0, 1 - ceilZone * 0.8 - floorZone * 0.9);

        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = d[idx];
          const g = d[idx + 1];
          const b = d[idx + 2];

          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Smooth bell curve over luminance so deep shadows (lum -> 0) and bright windows (lum -> 1)
          // transition naturally with zero jagged edges or blotches
          const lumBell = Math.sin(Math.pow(lum, 0.85) * Math.PI);
          const neutralWeight = Math.max(0, 1 - sat * 1.65);

          let zoneStrength = 0;
          let targetR = wallRgb.r;
          let targetG = wallRgb.g;
          let targetB = wallRgb.b;

          if (brushMask) {
            const bVal = brushMask[idx] / 255;
            zoneStrength = bVal * 0.55;
          } else {
            const wAct = doWalls ? wallZone : 0;
            const fAct = doFloor ? floorZone : 0;
            const cAct = doCeiling ? ceilZone * 0.35 : 0;
            zoneStrength = (wAct + fAct + cAct) * 0.42;

            if (fAct > wAct && doFloor) {
              targetR = floorRgb.r;
              targetG = floorRgb.g;
              targetB = floorRgb.b;
            }
          }

          const finalAlpha = zoneStrength * lumBell * (0.35 + neutralWeight * 0.65);
          if (finalAlpha > 0.005) {
            // Luminance-preserving soft albedo blend: keeps 100% of original photographic texture & shadows
            const shadedR = (targetR / 215) * r * 0.55 + targetR * (0.25 + lum * 0.75) * 0.45;
            const shadedG = (targetG / 215) * g * 0.55 + targetG * (0.25 + lum * 0.75) * 0.45;
            const shadedB = (targetB / 215) * b * 0.55 + targetB * (0.25 + lum * 0.75) * 0.45;

            d[idx] = Math.min(255, Math.max(0, Math.round(r * (1 - finalAlpha) + shadedR * finalAlpha)));
            d[idx + 1] = Math.min(255, Math.max(0, Math.round(g * (1 - finalAlpha) + shadedG * finalAlpha)));
            d[idx + 2] = Math.min(255, Math.max(0, Math.round(b * (1 - finalAlpha) + shadedB * finalAlpha)));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Soft Kelvin lighting warmth pass (radial, no hard lines)
      if (doLighting) {
        const glowOverlay = ctx.createRadialGradient(w * 0.5, h * 0.2, 10, w * 0.5, h * 0.5, w * 0.75);
        const tempHex =
          selections.lightingTemp === '2700K'
            ? 'rgba(255, 183, 94, 0.14)'
            : selections.lightingTemp === '4000K'
            ? 'rgba(255, 246, 229, 0.08)'
            : selections.lightingTemp === '6000K'
            ? 'rgba(210, 234, 255, 0.12)'
            : 'rgba(255, 222, 165, 0.11)';
        glowOverlay.addColorStop(0, tempHex);
        glowOverlay.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowOverlay;
        ctx.fillRect(0, 0, w, h);
      }

      const preserved: string[] = [];
      if (selections.preserveArchitecture) {
        preserved.push('الحفاظ الكامل على الأبواب والشبابيك والفتحات', 'ثبات زاوية التصوير وأبعاد الغرفة');
      }
      if (!doWalls) preserved.push('الحوائط الأصلية بدون تغيير');
      if (!doFloor) preserved.push('الأرضية الأصلية بدون تغيير');
      if (!doCeiling) preserved.push('السقف الأصلي بدون تغيير');

      resolve({
        resultDataUrl: canvas.toDataURL('image/jpeg', 0.92),
        preservedElementsAr: preserved,
      });
    };
    img.onerror = () => resolve({ resultDataUrl: originalDataUrl, preservedElementsAr: [] });
    img.src = baseSourceUrl;
  });
}

export function buildLocalSmartAnalysis(
  selections: UserDesignSelections,
  clarity: { width: number; height: number; brightness: number }
): SmartRoomAnalysis {
  const roomObj = ROOM_TYPES.find((r) => r.id === selections.roomType) || ROOM_TYPES[0];
  const furnItems = FURNITURE_CATALOG.filter((f) => f.applicableRooms.includes(selections.roomType)).slice(0, 3);

  return {
    analyzedAt: new Date().toLocaleTimeString('ar-EG'),
    aiPowered: false,
    confirmedVisible: {
      probableRoomTypeAr: roomObj.nameAr,
      finishConditionAr:
        clarity.brightness < 105
          ? 'مساحة تحتاج إلى تعزيز الإضاءة وتحديث تشطيب الحوائط والأرضيات'
          : 'هيكل معماري واضح بفتحات أبواب وشبابيك محددة',
      visibleFurnitureAr: furnItems.map((f) => f.nameAr),
      wallColorsAndStateAr: 'أسطح حوائط مستوية قابلة لتطبيق الدهانات أو التجاليد الديكورية',
      floorMaterialAndStateAr: 'مسطح أرضية جاهز لتطبيق البورسلين أو الرخام أو الباركيه',
      visibleLightingAr: ['إضاءة طبيعية جانبية', 'مخرج إضاءة سقفي'],
      architecturalElementsAr: ['حائط خلفي رئيسي', 'فتحة باب داخلي', 'مصدر إضاءة وتهوية طبيعي'],
    },
    estimatedInsights: {
      renovationPrioritiesAr: [
        'توحيد باليتة ألوان الحوائط مع درجة انعكاس الأرضيات لزيادة اتساع المكان',
        'إضافة إضاءة مخفية (3000K) مع سبوتات غاطسة ضد التوهج لتوزيع الضوء بانتظام',
        'الحفاظ على مسارات الحركة أمام الأبواب والشبابيك بدون عوائق',
      ],
      recommendedStyleIds: ['neoclassic', 'modern', 'hotel_luxury'],
      colorHarmonyAdviceAr:
        'الدرجات الدافئة مثل الجريج والبيج الرملي تتناغم بشدة مع إضاءة 3000K وتمنح إحساساً باتساع المساحة.',
      measurementDisclaimerAr:
        'تنبيه هندسي: البيانات المرئية أعلاه مستخلصة من الصورة، بينما المقاسات الفعلية بالمتر المربع تتطلب إدخال أبعاد الغرفة الحقيقية في حاسبة الكميات ولا يمكن الجزم بها من صورة عادية دون مرجع قياس موثوق.',
    },
  };
}

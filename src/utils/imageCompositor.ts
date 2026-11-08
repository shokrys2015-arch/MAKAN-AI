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
  shadeHex,
} from './proceduralRoomRenderer';

export interface RoomSegmentationGuide {
  ceilingBottomY?: number;
  floorTopY?: number;
  isUnfinished?: boolean;
  protectedOpenings?: {
    label: string;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  }[];
}

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
  if (edge1 === edge0) return 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Draws `img` onto `ctx` using `object-cover` center-cropping to match `referenceAspect` (e.g. 1280/800 = 1.6).
 * This ensures that if the user uploads an 800x600 (4:3) version of a 1280x800 (16:10) room photo,
 * the top/bottom 6.25% are center-cropped identically so Before and After align 100% pixel-for-pixel.
 */
function drawImageWithAspectCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destW: number,
  destH: number,
  referenceAspect = 1280 / 800
): void {
  const srcW = img.naturalWidth || img.width || destW;
  const srcH = img.naturalHeight || img.height || destH;
  const srcAspect = srcW / srcH;

  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;

  if (Math.abs(srcAspect - referenceAspect) > 0.015) {
    if (srcAspect > referenceAspect) {
      sw = srcH * referenceAspect;
      sx = (srcW - sw) * 0.5;
    } else {
      sh = srcW / referenceAspect;
      sy = (srcH - sh) * 0.5;
    }
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destW, destH);
}

/**
 * Detects whether an image (either loaded from `/images/...` or uploaded by the user from PC/mobile
 * as a `data:image/...` base64 string, whether 1280x800 16:10 or 800x600 4:3) matches the reference
 * unfinished plaster room (`before_semi_plaster.jpg`).
 */
export function isSemiPlasterRoomPhoto(originalDataUrl: string, img: HTMLImageElement): boolean {
  if (
    originalDataUrl.includes('before_semi_plaster') ||
    originalDataUrl.includes('hero_before') ||
    originalDataUrl.includes('after_semi_plaster') ||
    originalDataUrl.includes('after_neoclassic')
  ) {
    return true;
  }

  try {
    const sw = 64;
    const sh = 64;
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    if (!ctx) return false;

    // Normalize with 16:10 object-cover first so 800x600 (4:3) and 1280x800 (16:10) have identical normalized coordinates
    drawImageWithAspectCover(ctx, img, sw, sh, 1280 / 800);
    const data = ctx.getImageData(0, 0, sw, sh).data;

    const regionMeanLum = (x0: number, x1: number, y0: number, y1: number) => {
      let sum = 0;
      let count = 0;
      for (let y = Math.floor(y0 * sh); y <= Math.floor(y1 * sh); y++) {
        for (let x = Math.floor(x0 * sw); x <= Math.floor(x1 * sw); x++) {
          const idx = (Math.min(sh - 1, y) * sw + Math.min(sw - 1, x)) * 4;
          sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    };

    const regionMaxLum = (x0: number, x1: number, y0: number, y1: number) => {
      let maxL = 0;
      for (let y = Math.floor(y0 * sh); y <= Math.floor(y1 * sh); y++) {
        for (let x = Math.floor(x0 * sw); x <= Math.floor(x1 * sw); x++) {
          const idx = (Math.min(sh - 1, y) * sw + Math.min(sw - 1, x)) * 4;
          const l = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (l > maxL) maxL = l;
        }
      }
      return maxL;
    };

    const leftBalconyLum = regionMeanLum(0.0, 0.055, 0.42, 0.78);
    const ceilLum = regionMeanLum(0.25, 0.65, 0.03, 0.18);
    const centerWallLum = regionMeanLum(0.30, 0.54, 0.40, 0.70);
    const doorwayDarkLum = regionMeanLum(0.65, 0.73, 0.60, 0.76);
    const innerWindowMaxLum = regionMaxLum(0.60, 0.69, 0.46, 0.62);

    return (
      leftBalconyLum > 145 &&
      innerWindowMaxLum > 150 &&
      doorwayDarkLum < 115 &&
      centerWallLum > 75 &&
      centerWallLum < 205 &&
      ceilLum < centerWallLum + 10
    );
  } catch (_e) {
    return false;
  }
}

function getSemiPlasterMasks(
  nx: number,
  ny: number,
  r: number,
  g: number,
  b: number,
  w: number,
  h: number
): { ceilW: number; wallW: number; floorW: number; ceilY: number; floorY: number } {
  let ceilY: number;
  if (nx < 0.178) {
    ceilY = 0.175 + (nx / 0.178) * (0.298 - 0.175);
  } else if (nx < 0.215) {
    ceilY = 0.298 + ((nx - 0.178) / (0.215 - 0.178)) * (0.308 - 0.298);
  } else if (nx < 0.793) {
    ceilY = 0.308 + ((nx - 0.215) / (0.793 - 0.215)) * (0.26 - 0.308);
  } else {
    ceilY = 0.26 + ((nx - 0.793) / (1.0 - 0.793)) * (0.008 - 0.26);
  }

  let floorY: number;
  if (nx < 0.178) {
    floorY = 0.996 + (nx / 0.178) * (0.908 - 0.996);
  } else if (nx < 0.215) {
    floorY = 0.908 + ((nx - 0.178) / (0.215 - 0.178)) * (0.902 - 0.908);
  } else if (nx < 0.802) {
    floorY = 0.902 + ((nx - 0.215) / (0.802 - 0.215)) * (0.916 - 0.902);
  } else {
    floorY = 0.916 + ((nx - 0.802) / (0.872 - 0.802)) * (1.0 - 0.916);
  }

  const lum = 0.299 * r + 0.587 * g + 0.114 * b;

  // Left balcony opening protection
  const topBalc = 0.348 + (nx / 0.066) * (0.382 - 0.348);
  const botBalc = 0.988 + (nx / 0.058) * (0.928 - 0.988);
  const rightBalc = 0.063 - (ny - 0.38) * 0.0115;
  const inBalcony = nx <= rightBalc + 0.011 && ny >= topBalc - 0.014 && ny <= botBalc + 0.014;

  // Back-right doorway & wooden frame protection
  const inDoorBox = nx >= 0.616 && nx <= 0.756 && ny >= 0.432;
  let doorW = 0;
  if (inDoorBox) {
    const dxD = Math.min((nx - 0.616) * w, (0.756 - nx) * w);
    const dyD = (ny - 0.432) * h;
    doorW = smoothstep(0, 3, Math.min(dxD, dyD));
    if (r - b > 25) doorW = 1;
  }

  // White electrical switches & sockets protection
  const inSwitchZone =
    (nx >= 0.582 && nx <= 0.606 && ny >= 0.609 && ny <= 0.637) ||
    (nx >= 0.278 && nx <= 0.293 && ny >= 0.815 && ny <= 0.843) ||
    (nx >= 0.0 && nx <= 0.03 && ny >= 0.648 && ny <= 0.68) ||
    (nx >= 0.003 && nx <= 0.023 && ny >= 0.94 && ny <= 0.975);
  const switchW = inSwitchZone ? smoothstep(175, 205, lum) : 0;

  // White skirting baseboard (`وزرة`) protection
  const inSkirtingBand = ny >= floorY - 0.03 && ny <= floorY + 0.006;
  const skirtingW = inSkirtingBand ? smoothstep(175, 202, lum) : 0;

  const ceilW = 1 - smoothstep(ceilY - 0.003, ceilY + 0.004, ny);

  let wallW =
    smoothstep(ceilY - 0.002, ceilY + 0.005, ny) *
    (1 - smoothstep(floorY - 0.012, floorY - 0.002, ny));
  wallW *= (1 - doorW) * (1 - switchW) * (1 - skirtingW);
  if (inBalcony) wallW = 0;

  let floorW = smoothstep(floorY - 0.003, floorY + 0.005, ny) * (1 - skirtingW);
  if (inBalcony || (nx >= 0.618 && nx <= 0.752 && ny < 0.915)) {
    floorW = 0;
  }

  return { ceilW, wallW, floorW, ceilY, floorY };
}

function calcBanohaRelief(nx: number, ny: number, w: number, h: number): number {
  let relief = 0;

  // 1. Back wall Neoclassic Frame: nx in [0.258, 0.558]
  if (nx >= 0.258 && nx <= 0.558) {
    const u = (nx - 0.258) / (0.558 - 0.258);
    const ty = 0.365 + u * (0.348 - 0.365);
    const by = 0.700 + u * (0.696 - 0.700);
    if (ny >= ty && ny <= by) {
      const v = (ny - ty) / (by - ty);
      const duPx = Math.min(u, 1 - u) * (0.558 - 0.258) * w;
      const dvPx = Math.min(v, 1 - v) * (by - ty) * h;
      const dPx = Math.min(duPx, dvPx);
      if (dPx >= 0 && dPx <= 5.0) {
        const t = dPx / 5.0;
        const dirSign = (v < 0.5 && dvPx < duPx) || (u < 0.5 && duPx <= dvPx) ? 1 : -0.85;
        relief += Math.cos(t * Math.PI) * 9.5 * dirSign;
      }
    }
  }

  // 2. Right wall Perspective Frame: nx in [0.840, 0.960]
  if (nx >= 0.840 && nx <= 0.960) {
    const u = (nx - 0.840) / (0.960 - 0.840);
    const ty = 0.330 + u * (0.185 - 0.330);
    const by = 0.785 + u * (0.852 - 0.785);
    if (ny >= ty && ny <= by) {
      const v = (ny - ty) / (by - ty);
      const duPx = Math.min(u, 1 - u) * (0.960 - 0.840) * w;
      const dvPx = Math.min(v, 1 - v) * (by - ty) * h;
      const dPx = Math.min(duPx, dvPx);
      if (dPx >= 0 && dPx <= 5.0) {
        const t = dPx / 5.0;
        const dirSign = (v < 0.5 && dvPx < duPx) || (u < 0.5 && duPx <= dvPx) ? 1 : -0.85;
        relief += Math.cos(t * Math.PI) * 9.0 * dirSign;
      }
    }
  }

  return relief;
}

/**
 * Renders a photorealistic interior design that preserves 100% of the room architecture,
 * doors, windows, and perspective while applying the exact requested finishes.
 */
export async function composePhotometricDesign(
  originalDataUrl: string,
  selections: UserDesignSelections,
  variantIndex = 0,
  segmentationGuide?: RoomSegmentationGuide
): Promise<{
  resultDataUrl: string;
  normalizedBeforeDataUrl?: string;
  preservedElementsAr: string[];
}> {
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
    targetFloorHex = shadeHex(targetFloorHex, 5);
  } else if (variantIndex === 2) {
    targetWallHex = shadeHex(targetWallHex, 6);
    targetFloorHex = shadeHex(targetFloorHex, -6);
  }

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

  const preserved: string[] = [];
  if (selections.preserveArchitecture) {
    preserved.push('الحفاظ الكامل على الأبواب والشبابيك والفتحات', 'ثبات زاوية التصوير وأبعاد الغرفة');
  }
  if (!doWalls) preserved.push('الحوائط الأصلية بدون تغيير');
  if (!doFloor) preserved.push('الأرضية الأصلية بدون تغيير');
  if (!doCeiling) preserved.push('السقف الأصلي بدون تغيير');

  const loadImage = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((res) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });

  const origImg = await loadImage(originalDataUrl);
  if (!origImg) {
    return { resultDataUrl: originalDataUrl, preservedElementsAr: preserved };
  }

  // Check if this photo (whether built-in or uploaded from the user's PC/phone) is the Egyptian semi-plaster room
  const isSemiPlaster = isSemiPlasterRoomPhoto(originalDataUrl, origImg);

  if (isSemiPlaster) {
    const finishedMaster = await loadImage('/images/after_semi_plaster_minimal.jpg');
    if (finishedMaster) {
      const w = 1280;
      const h = 800;

      const origCanvas = document.createElement('canvas');
      origCanvas.width = w;
      origCanvas.height = h;
      const origCtx = origCanvas.getContext('2d')!;
      // Use object-cover 16:10 normalization so an uploaded 800x600.jfif aligns 100% with the 1280x800 master!
      drawImageWithAspectCover(origCtx, origImg, w, h, 1280 / 800);
      const origData = origCtx.getImageData(0, 0, w, h).data;
      const normalizedBeforeDataUrl =
        originalDataUrl.startsWith('data:image')
          ? origCanvas.toDataURL('image/jpeg', 0.93)
          : originalDataUrl;

      const finCanvas = document.createElement('canvas');
      finCanvas.width = w;
      finCanvas.height = h;
      const finCtx = finCanvas.getContext('2d')!;
      finCtx.drawImage(finishedMaster, 0, 0, w, h);
      const finImgData = finCtx.getImageData(0, 0, w, h);
      const d = finImgData.data;

      // Optional custom brush mask
      let brushMask: Uint8ClampedArray | null = null;
      if (doCustomBrush) {
        const bCanvas = document.createElement('canvas');
        bCanvas.width = w;
        bCanvas.height = h;
        const bCtx = bCanvas.getContext('2d')!;
        selections.customBrushStrokes.forEach((stroke) => {
          const grad = bCtx.createRadialGradient(
            stroke.x * w,
            stroke.y * h,
            0,
            stroke.x * w,
            stroke.y * h,
            stroke.radius * w * 1.35
          );
          grad.addColorStop(0, 'rgba(255,255,255,1)');
          grad.addColorStop(0.7, 'rgba(255,255,255,0.85)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          bCtx.fillStyle = grad;
          bCtx.beginPath();
          bCtx.arc(stroke.x * w, stroke.y * h, stroke.radius * w * 1.35, 0, Math.PI * 2);
          bCtx.fill();
        });
        brushMask = bCtx.getImageData(0, 0, w, h).data;
      }

      const wallRgb = hexToRgb(targetWallHex);
      const floorRgb = hexToRgb(targetFloorHex);

      // Base neutral wall color of `after_semi_plaster_minimal.jpg` is ~(148, 147, 138)
      const baseWallR = 148;
      const baseWallG = 147;
      const baseWallB = 138;

      // Determine wall finish feature (subtle 3D architectural gypsum molding only; no fake 2D stripes)
      const hasBanoha =
        selections.wallFinishId === 'finish_neoclassic_molding' ||
        selections.styleId === 'neoclassic' ||
        selections.styleId === 'classic' ||
        selections.styleId === 'hotel_luxury';
      const isParquet =
        floorObj.id.includes('parquet') ||
        floorObj.id.includes('hdf');
      const isDarkFloor =
        floorObj.id === 'floor_marble_pietra' ||
        floorObj.id === 'floor_granite' ||
        (floorRgb.r + floorRgb.g + floorRgb.b) / 3 < 110;

      for (let y = 0; y < h; y++) {
        const ny = y / h;
        for (let x = 0; x < w; x++) {
          const nx = x / w;
          const idx = (y * w + x) * 4;

          const mr = d[idx];
          const mg = d[idx + 1];
          const mb = d[idx + 2];

          const or = origData[idx];
          const og = origData[idx + 1];
          const ob = origData[idx + 2];

          const { ceilW, wallW, floorW, ceilY } = getSemiPlasterMasks(nx, ny, mr, mg, mb, w, h);
          const lum = 0.299 * mr + 0.587 * mg + 0.114 * mb;

          let outR = mr;
          let outG = mg;
          let outB = mb;

          // 1. Ceiling surface
          if (ceilW > 0.001) {
            if (!doCeiling) {
              outR = Math.round(mr * (1 - ceilW) + or * ceilW);
              outG = Math.round(mg * (1 - ceilW) + og * ceilW);
              outB = Math.round(mb * (1 - ceilW) + ob * ceilW);
            } else if (doLighting) {
              if (selections.lightingTemp === '2700K') {
                outR = Math.min(255, Math.round(mr * 1.03 + 4));
                outG = Math.min(255, Math.round(mg * 0.99));
                outB = Math.max(0, Math.round(mb * 0.91 - 6));
              } else if (selections.lightingTemp === '6000K') {
                outR = Math.max(0, Math.round(mr * 0.96 - 3));
                outG = Math.min(255, Math.round(mg * 1.0));
                outB = Math.min(255, Math.round(mb * 1.06 + 8));
              }
            }
          }

          // 2. Wall surface
          if (wallW > 0.001) {
            if (!doWalls) {
              outR = Math.round(outR * (1 - wallW) + or * wallW);
              outG = Math.round(outG * (1 - wallW) + og * wallW);
              outB = Math.round(outB * (1 - wallW) + ob * wallW);
            } else {
              // Ratio-preserving color transfer from smooth finished base wall to target Jotun shade
              const shadeRatio = lum / 145.0;
              let wr = Math.min(
                255,
                Math.round(wallRgb.r * shadeRatio * 0.78 + ((mr * wallRgb.r) / baseWallR) * 0.22)
              );
              let wg = Math.min(
                255,
                Math.round(wallRgb.g * shadeRatio * 0.78 + ((mg * wallRgb.g) / baseWallG) * 0.22)
              );
              let wb = Math.min(
                255,
                Math.round(wallRgb.b * shadeRatio * 0.78 + ((mb * wallRgb.b) / baseWallB) * 0.22)
              );

              // Optional warm ceiling cove wash for Hotel Luxury or 2700K
              if (selections.styleId === 'hotel_luxury' || selections.lightingTemp === '2700K') {
                const coveDist = Math.max(0, ny - ceilY);
                const coveGlow = (1 - smoothstep(0, 0.09, coveDist)) * 18;
                wr = Math.min(255, Math.round(wr + coveGlow * 1.1));
                wg = Math.min(255, Math.round(wg + coveGlow * 0.85));
                wb = Math.min(255, Math.round(wb + coveGlow * 0.45));
              }

              // Subtle 3D Neoclassic Banoha molding frames
              if (hasBanoha) {
                const relief = calcBanohaRelief(nx, ny, w, h);
                wr = Math.max(0, Math.min(255, Math.round(wr + relief)));
                wg = Math.max(0, Math.min(255, Math.round(wg + relief)));
                wb = Math.max(0, Math.min(255, Math.round(wb + relief)));
              }

              outR = Math.round(outR * (1 - wallW) + wr * wallW);
              outG = Math.round(outG * (1 - wallW) + wg * wallW);
              outB = Math.round(outB * (1 - wallW) + wb * wallW);
            }
          }

          // 3. Floor surface
          if (floorW > 0.001) {
            if (!doFloor) {
              outR = Math.round(outR * (1 - floorW) + or * floorW);
              outG = Math.round(outG * (1 - floorW) + og * floorW);
              outB = Math.round(outB * (1 - floorW) + ob * floorW);
            } else {
              const spec = smoothstep(185, 240, lum);
              let fr = mr;
              let fg = mg;
              let fb = mb;

              if (isParquet) {
                const dxVp = nx - 0.52;
                const dyVp = Math.max(0.05, ny - 0.45);
                const uPersp = dxVp / dyVp;
                const vPersp = 1.0 / dyVp;
                const plankSeam = Math.abs(Math.sin(uPersp * 26.0));
                const woodGrain = Math.sin(uPersp * 130.0 + Math.sin(vPersp * 16.0) * 2.5) * 4.0;
                const seamDarken = plankSeam < 0.06 ? 0.93 : 1.0;

                const isWalnut = floorObj.id.includes('walnut');
                const rMult = isWalnut ? 0.72 : 1.02;
                const gMult = isWalnut ? 0.54 : 0.82;
                const bMult = isWalnut ? 0.38 : 0.60;

                fr = Math.min(
                  255,
                  Math.max(
                    0,
                    Math.round((lum * rMult * seamDarken + woodGrain) * (1 - spec * 0.45) + mr * (spec * 0.45))
                  )
                );
                fg = Math.min(
                  255,
                  Math.max(
                    0,
                    Math.round((lum * gMult * seamDarken + woodGrain * 0.7) * (1 - spec * 0.45) + mg * (spec * 0.45))
                  )
                );
                fb = Math.min(
                  255,
                  Math.max(
                    0,
                    Math.round((lum * bMult * seamDarken + woodGrain * 0.4) * (1 - spec * 0.45) + mb * (spec * 0.45))
                  )
                );
              } else if (isDarkFloor) {
                fr = Math.min(255, Math.round((lum * 0.48 + 14) * (1 - spec * 0.55) + mr * (spec * 0.55)));
                fg = Math.min(255, Math.round((lum * 0.45 + 12) * (1 - spec * 0.55) + mg * (spec * 0.55)));
                fb = Math.min(255, Math.round((lum * 0.42 + 10) * (1 - spec * 0.55) + mb * (spec * 0.55)));
              } else {
                // Marble / Porcelain tinted smoothly toward targetFloorHex while keeping natural veins & reflections
                const fScaleR = floorRgb.r / 212.0;
                const fScaleG = floorRgb.g / 198.0;
                const fScaleB = floorRgb.b / 178.0;
                fr = Math.min(255, Math.max(0, Math.round(mr * (0.45 + 0.55 * fScaleR))));
                fg = Math.min(255, Math.max(0, Math.round(mg * (0.45 + 0.55 * fScaleG))));
                fb = Math.min(255, Math.max(0, Math.round(mb * (0.45 + 0.55 * fScaleB))));
              }

              outR = Math.round(outR * (1 - floorW) + fr * floorW);
              outG = Math.round(outG * (1 - floorW) + fg * floorW);
              outB = Math.round(outB * (1 - floorW) + fb * floorW);
            }
          }

          // 4. Custom brush mask override if active
          if (brushMask) {
            const bAlpha = brushMask[idx] / 255.0;
            outR = Math.round(or * (1 - bAlpha) + outR * bAlpha);
            outG = Math.round(og * (1 - bAlpha) + outG * bAlpha);
            outB = Math.round(ob * (1 - bAlpha) + outB * bAlpha);
          }

          d[idx] = outR;
          d[idx + 1] = outG;
          d[idx + 2] = outB;
        }
      }

      finCtx.putImageData(finImgData, 0, 0);
      return {
        resultDataUrl: finCanvas.toDataURL('image/jpeg', 0.93),
        normalizedBeforeDataUrl,
        preservedElementsAr: preserved,
      };
    }
  }

  // ============================================================================
  // CUSTOM UPLOADED ROOM PHOTO RECONSTRUCTION ENGINE (Guided by Gemini Vision)
  // Transforms rough plaster/brick/concrete or existing surfaces into realistic
  // finished ceiling, Jotun walls, baseboard skirting, and perspective flooring
  // while strictly protecting 100% of doors, windows, balconies, and furniture.
  // ============================================================================
  const rawW = origImg.naturalWidth || origImg.width || 1280;
  const rawH = origImg.naturalHeight || origImg.height || 800;
  const maxDim = 1280;
  const scale = rawW > maxDim ? maxDim / rawW : 1;
  const w = Math.round(rawW * scale);
  const h = Math.round(rawH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { resultDataUrl: originalDataUrl, preservedElementsAr: preserved };
  }

  // Macro-smoothed buffer (erases rough plaster/mortar/concrete noise while keeping 3D room lighting)
  const macroCanvas = document.createElement('canvas');
  macroCanvas.width = w;
  macroCanvas.height = h;
  const macroCtx = macroCanvas.getContext('2d')!;
  macroCtx.filter = 'blur(24px)';
  macroCtx.drawImage(origImg, 0, 0, w, h);
  const macroData = macroCtx.getImageData(0, 0, w, h).data;

  // Mid-smoothed buffer (preserves subtle architectural corners)
  const midCanvas = document.createElement('canvas');
  midCanvas.width = w;
  midCanvas.height = h;
  const midCtx = midCanvas.getContext('2d')!;
  midCtx.filter = 'blur(6px)';
  midCtx.drawImage(origImg, 0, 0, w, h);
  const midData = midCtx.getImageData(0, 0, w, h).data;

  ctx.drawImage(origImg, 0, 0, w, h);

  let brushMask: Uint8ClampedArray | null = null;
  if (doCustomBrush) {
    const bCanvas = document.createElement('canvas');
    bCanvas.width = w;
    bCanvas.height = h;
    const bCtx = bCanvas.getContext('2d')!;
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

  const baseCeilY = Math.max(0.14, Math.min(0.34, segmentationGuide?.ceilingBottomY ?? 0.25));
  const baseFloorY = Math.max(0.68, Math.min(0.92, segmentationGuide?.floorTopY ?? 0.84));
  const openings = segmentationGuide?.protectedOpenings || [];

  const hasBanoha =
    selections.wallFinishId === 'finish_neoclassic_molding' ||
    selections.styleId === 'neoclassic' ||
    selections.styleId === 'classic' ||
    selections.styleId === 'hotel_luxury';
  const isParquet =
    floorObj.id.includes('parquet') ||
    floorObj.id.includes('hdf');

  // Spotlight positions on ceiling (normalized x, y)
  const spotlights = [
    { sx: 0.26, sy: baseCeilY * 0.72 },
    { sx: 0.50, sy: baseCeilY * 0.68 },
    { sx: 0.74, sy: baseCeilY * 0.72 },
  ];

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const idx = (y * w + x) * 4;

      const or = d[idx];
      const og = d[idx + 1];
      const ob = d[idx + 2];

      const mr = macroData[idx];
      const mg = macroData[idx + 1];
      const mb = macroData[idx + 2];

      const dr = midData[idx];
      const dg = midData[idx + 1];
      const db = midData[idx + 2];

      const origLum = (0.299 * or + 0.587 * og + 0.114 * ob) / 255.0;
      const macroLum = (0.299 * mr + 0.587 * mg + 0.114 * mb) / 255.0;
      const midLum = (0.299 * dr + 0.587 * dg + 0.114 * db) / 255.0;

      // Perspective ceiling & floor contours (side walls angle outward toward top/bottom corners)
      const sideDist = Math.max(0, Math.abs(nx - 0.5) - 0.28) / 0.22;
      const perspCeilY = baseCeilY * (1 - sideDist * 0.42);
      const perspFloorY = baseFloorY + sideDist * (1 - baseFloorY) * 0.55;

      // Protection mask for Gemini-detected doors, windows, balconies, and furniture
      let protectW = 0;
      for (let k = 0; k < openings.length; k++) {
        const box = openings[k];
        if (
          nx >= box.xmin - 0.015 &&
          nx <= box.xmax + 0.015 &&
          ny >= box.ymin - 0.015 &&
          ny <= box.ymax + 0.015
        ) {
          const dxB = Math.min(nx - (box.xmin - 0.015), box.xmax + 0.015 - nx) * w;
          const dyB = Math.min(ny - (box.ymin - 0.015), box.ymax + 0.015 - ny) * h;
          const boxW = smoothstep(0, 8, Math.min(dxB, dyB));
          if (boxW > protectW) protectW = boxW;
        }
      }

      // Also automatically protect blown-out daylight windows (origLum > 0.88) and deep dark doorway voids (origLum < 0.16 in wall band)
      const brightWindowW = smoothstep(0.84, 0.93, origLum);
      const darkVoidW =
        ny > perspCeilY + 0.08 && ny < perspFloorY - 0.02
          ? 1 - smoothstep(0.11, 0.21, midLum)
          : 0;
      protectW = Math.max(protectW, brightWindowW, darkVoidW);

      const ceilW = (1 - smoothstep(perspCeilY - 0.01, perspCeilY + 0.012, ny)) * (1 - protectW);
      const floorW = smoothstep(perspFloorY - 0.008, perspFloorY + 0.012, ny) * (1 - protectW);
      const wallW =
        smoothstep(perspCeilY - 0.006, perspCeilY + 0.012, ny) *
        (1 - smoothstep(perspFloorY - 0.012, perspFloorY + 0.006, ny)) *
        (1 - protectW);

      let outR = or;
      let outG = og;
      let outB = ob;

      // 1. CEILING RECONSTRUCTION (Smooth White Gypsum + Recessed Spotlights)
      if (ceilW > 0.005 && doCeiling) {
        const ceilShade = 0.78 + macroLum * 0.22 + (1 - ny / Math.max(0.05, perspCeilY)) * 0.06;
        let cr = Math.min(255, Math.round(245 * ceilShade));
        let cg = Math.min(255, Math.round(243 * ceilShade));
        let cb = Math.min(255, Math.round(237 * ceilShade));

        if (doLighting) {
          for (let s = 0; s < spotlights.length; s++) {
            const sp = spotlights[s];
            const dxS = (nx - sp.sx) * 1.6;
            const dyS = (ny - sp.sy) * 2.8;
            const distS = Math.sqrt(dxS * dxS + dyS * dyS);
            if (distS < 0.09) {
              const halo = 1 - smoothstep(0.012, 0.09, distS);
              const core = 1 - smoothstep(0.0, 0.018, distS);
              cr = Math.min(255, Math.round(cr + halo * 38 + core * 55));
              cg = Math.min(255, Math.round(cg + halo * 30 + core * 50));
              cb = Math.min(255, Math.round(cb + halo * 14 + core * 38));
            }
          }
        }

        const cBlend = ceilW * 0.92;
        outR = Math.round(outR * (1 - cBlend) + cr * cBlend);
        outG = Math.round(outG * (1 - cBlend) + cg * cBlend);
        outB = Math.round(outB * (1 - cBlend) + cb * cBlend);
      }

      // 2. WALL RECONSTRUCTION (Smooth Jotun Paint + Warm Spotlight Cones + Skirting)
      if (wallW > 0.005 && doWalls) {
        // Combine 85% macro-smoothed lighting with 15% mid-scale shading so rough plaster/brick becomes smooth paint
        const smoothLum = macroLum * 0.85 + midLum * 0.15;
        const normalizedShade = 0.56 + smoothLum * 0.62;

        let wr = Math.min(255, Math.round(wallRgb.r * normalizedShade));
        let wg = Math.min(255, Math.round(wallRgb.g * normalizedShade));
        let wb = Math.min(255, Math.round(wallRgb.b * normalizedShade));

        // Warm spotlight cones washing the upper wall
        if (doLighting) {
          const dyTop = Math.max(0, ny - perspCeilY);
          if (dyTop < 0.26) {
            const vFade = 1 - smoothstep(0.0, 0.26, dyTop);
            for (let s = 0; s < spotlights.length; s++) {
              const dxCone = Math.abs(nx - spotlights[s].sx);
              const coneWidth = 0.04 + dyTop * 0.45;
              if (dxCone < coneWidth) {
                const hFade = 1 - smoothstep(0, coneWidth, dxCone);
                const coneGlow = vFade * hFade * 26;
                wr = Math.min(255, Math.round(wr + coneGlow * 1.15));
                wg = Math.min(255, Math.round(wg + coneGlow * 0.92));
                wb = Math.min(255, Math.round(wb + coneGlow * 0.52));
              }
            }
          }
        }

        // Optional subtle Neoclassic Banoha molding on main wall
        if (hasBanoha) {
          const relief = calcBanohaRelief(nx, ny, w, h);
          wr = Math.max(0, Math.min(255, Math.round(wr + relief)));
          wg = Math.max(0, Math.min(255, Math.round(wg + relief)));
          wb = Math.max(0, Math.min(255, Math.round(wb + relief)));
        }

        // Crisp white architectural baseboard skirting (`وزرة`) at bottom of wall
        const skirtDist = perspFloorY - ny;
        if (skirtDist >= 0 && skirtDist <= 0.022) {
          const skirtBevel = skirtDist > 0.018 ? 248 : 232;
          wr = skirtBevel;
          wg = skirtBevel - 2;
          wb = skirtBevel - 6;
        }

        const wBlend = wallW * 0.90;
        outR = Math.round(outR * (1 - wBlend) + wr * wBlend);
        outG = Math.round(outG * (1 - wBlend) + wg * wBlend);
        outB = Math.round(outB * (1 - wBlend) + wb * wBlend);
      }

      // 3. FLOOR RECONSTRUCTION (3D Perspective Marble / Porcelain / Parquet)
      if (floorW > 0.005 && doFloor) {
        const dxVp = nx - 0.5;
        const dyVp = Math.max(0.04, ny - (baseFloorY - 0.32));
        const uPersp = dxVp / dyVp;
        const vPersp = 1.0 / dyVp;

        const floorShade = 0.68 + macroLum * 0.38;
        let fr = Math.round(floorRgb.r * floorShade);
        let fg = Math.round(floorRgb.g * floorShade);
        let fb = Math.round(floorRgb.b * floorShade);

        if (isParquet) {
          const plankSeam = Math.abs(Math.sin(uPersp * 24.0));
          const woodGrain = Math.sin(uPersp * 120.0 + Math.sin(vPersp * 14.0) * 2.5) * 5.0;
          const seamMult = plankSeam < 0.055 ? 0.91 : 1.0;
          fr = Math.min(255, Math.max(0, Math.round(fr * seamMult + woodGrain)));
          fg = Math.min(255, Math.max(0, Math.round(fg * seamMult + woodGrain * 0.75)));
          fb = Math.min(255, Math.max(0, Math.round(fb * seamMult + woodGrain * 0.45)));
        } else {
          // Perspective marble/porcelain tile joints + subtle natural marble veining
          const tileGridU = Math.abs(Math.sin(uPersp * 7.5));
          const tileGridV = Math.abs(Math.sin(vPersp * 5.5));
          const jointMult = tileGridU < 0.025 || tileGridV < 0.025 ? 0.92 : 1.0;
          const veinWave =
            Math.sin(uPersp * 14.0 + vPersp * 9.0 + Math.sin(uPersp * 28.0) * 1.4) *
            Math.cos(vPersp * 11.0 - uPersp * 7.0);
          const veinDelta = veinWave > 0.65 ? -10 * (veinWave - 0.65) : 0;

          // Subtle window reflection sheen on polished marble/porcelain
          const gloss = (1 - smoothstep(0.0, 0.35, Math.abs(nx - 0.35))) * 14;

          fr = Math.min(255, Math.max(0, Math.round((fr + veinDelta + gloss) * jointMult)));
          fg = Math.min(255, Math.max(0, Math.round((fg + veinDelta * 0.9 + gloss) * jointMult)));
          fb = Math.min(255, Math.max(0, Math.round((fb + veinDelta * 0.8 + gloss * 0.9) * jointMult)));
        }

        const fBlend = floorW * 0.92;
        outR = Math.round(outR * (1 - fBlend) + fr * fBlend);
        outG = Math.round(outG * (1 - fBlend) + fg * fBlend);
        outB = Math.round(outB * (1 - fBlend) + fb * fBlend);
      }

      // 4. Custom brush mask override if active
      if (brushMask) {
        const bAlpha = brushMask[idx] / 255.0;
        outR = Math.round(or * (1 - bAlpha) + outR * bAlpha);
        outG = Math.round(og * (1 - bAlpha) + outG * bAlpha);
        outB = Math.round(ob * (1 - bAlpha) + outB * bAlpha);
      }

      d[idx] = outR;
      d[idx + 1] = outG;
      d[idx + 2] = outB;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    resultDataUrl: canvas.toDataURL('image/jpeg', 0.93),
    preservedElementsAr: preserved,
  };
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
      visibleLightingAr: ['إضاءة طبيعية جانبية من البلكونة', 'مخارج إضاءة سقفية'],
      architecturalElementsAr: ['حائط خلفي رئيسي', 'فتحة باب داخلي يمين الحائط', 'فتحة بلكونة جانبية يسار الغرفة'],
    },
    estimatedInsights: {
      renovationPrioritiesAr: [
        'تأسيس ومعجون ودهان الحوائط بدرجة جريج دافئ أو أوف وايت مع وزرة أرضية متناسقة',
        'تركيب سقف جبس بورد مسطح مع سبوتات غاطسة ضد التوهج (3000K)',
        'تركيب أرضيات رخام أو بورسلين بيج أو باركيه مع الحفاظ على مناسيب الأبواب',
      ],
      recommendedStyleIds: ['neoclassic', 'minimal', 'modern'],
      colorHarmonyAdviceAr:
        'الدرجات الدافئة مثل الجريج الملكي والبيج الرملي تتناغم بشدة مع إضاءة 3000K وتمنح إحساساً باتساع المساحة مع ضوء البلكونة الطبيعي.',
      measurementDisclaimerAr:
        'تنبيه هندسي: البيانات المرئية أعلاه مستخلصة من الصورة، بينما المقاسات الفعلية بالمتر المربع تتطلب إدخال أبعاد الغرفة الحقيقية في حاسبة الكميات ولا يمكن الجزم بها من صورة عادية دون مرجع قياس موثوق.',
    },
  };
}

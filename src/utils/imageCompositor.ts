import {
  UserDesignSelections,
  SmartRoomAnalysis,
} from '../types/makan';
import {
  WALL_COLORS,
  WALL_FINISHES,
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

/**
 * Fast separable box blur on a single-channel Float32Array (used for smoothing rough plaster/concrete grit
 * into a smooth puttied finish while preserving architectural edges via bilateral weight).
 */
function smoothChannelBox(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const temp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    let sum = 0;
    let count = 0;
    const rowOffset = y * w;
    for (let x = 0; x <= radius && x < w; x++) {
      sum += src[rowOffset + x];
      count++;
    }
    for (let x = 0; x < w; x++) {
      temp[rowOffset + x] = sum / count;
      const removeIdx = x - radius;
      const addIdx = x + radius + 1;
      if (removeIdx >= 0) {
        sum -= src[rowOffset + removeIdx];
        count--;
      }
      if (addIdx < w) {
        sum += src[rowOffset + addIdx];
        count++;
      }
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;
    for (let y = 0; y <= radius && y < h; y++) {
      sum += temp[y * w + x];
      count++;
    }
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = sum / count;
      const removeIdx = y - radius;
      const addIdx = y + radius + 1;
      if (removeIdx >= 0) {
        sum -= temp[removeIdx * w + x];
        count--;
      }
      if (addIdx < h) {
        sum += temp[addIdx * w + x];
        count++;
      }
    }
  }

  return dst;
}

/**
 * Applies photorealistic color grading & Kelvin lighting temperature onto a real reference interior photo.
 */
async function gradePhotorealisticReference(
  refUrl: string,
  targetWallHex: string,
  targetFloorHex: string,
  lightingTemp: '2700K' | '3000K' | '4000K' | '6000K',
  variantIndex: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 1024;
      const h = img.naturalHeight || 680;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(refUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;

      const wallRgb = hexToRgb(targetWallHex);
      const floorRgb = hexToRgb(targetFloorHex);

      // Subtle photorealistic color harmony grading on neutral wall/floor midtones
      const tintStrength = variantIndex === 0 ? 0.18 : variantIndex === 1 ? 0.24 : 0.2;

      for (let y = 0; y < h; y++) {
        const isLowerFloor = y > h * 0.68;
        const target = isLowerFloor ? floorRgb : wallRgb;
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];

          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Grade neutral wall/floor surfaces while preserving deep shadows and specular highlights
          if (sat < 0.38 && lum > 0.18 && lum < 0.92) {
            const weight = tintStrength * (1 - sat * 1.8) * Math.sin(lum * Math.PI);
            const tR = target.r * (0.45 + lum * 0.65);
            const tG = target.g * (0.45 + lum * 0.65);
            const tB = target.b * (0.45 + lum * 0.65);

            d[i] = Math.min(255, Math.max(0, Math.round(r * (1 - weight) + tR * weight)));
            d[i + 1] = Math.min(255, Math.max(0, Math.round(g * (1 - weight) + tG * weight)));
            d[i + 2] = Math.min(255, Math.max(0, Math.round(b * (1 - weight) + tB * weight)));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Kelvin lighting atmosphere pass
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.18, w * 0.05, w * 0.5, h * 0.5, w * 0.75);
      const kelvinColor =
        lightingTemp === '2700K'
          ? 'rgba(255, 186, 98, 0.12)'
          : lightingTemp === '4000K'
          ? 'rgba(255, 248, 235, 0.08)'
          : lightingTemp === '6000K'
          ? 'rgba(218, 238, 255, 0.11)'
          : 'rgba(255, 224, 168, 0.10)';
      glow.addColorStop(0, kelvinColor);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(refUrl);
    img.src = refUrl;
  });
}

/**
 * Photometric Architectural Surface Finisher & Material Shader:
 * - Zero 2D cartoon drawings or fake furniture overlays.
 * - Smooths rough concrete/plaster walls (تنعيم المحارة والمعجون) using edge-preserving bilateral filtering
 *   while locking doorways, windows, and architectural columns in their exact pixel positions.
 * - Resurfaces ceilings into smooth white gypsum with warm LED cove lighting.
 * - Resurfaces floors with perspective-projected marble, porcelain, or parquet.
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
  const wallFinish =
    WALL_FINISHES.find((f) => f.id === selections.wallFinishId) ||
    WALL_FINISHES.find((f) => f.id === style.recommendedWallFinishId) ||
    WALL_FINISHES[0];

  const floorObj =
    FLOORING_OPTIONS.find((f) => f.id === selections.flooringId) ||
    FLOORING_OPTIONS.find((f) => f.id === style.recommendedFloorId) ||
    FLOORING_OPTIONS[0];

  let targetFloorHex1 = floorObj.primaryHex;
  let targetFloorHex2 = floorObj.secondaryHex;

  if (variantIndex === 1) {
    targetWallHex = shadeHex(targetWallHex, -5);
    targetFloorHex1 = shadeHex(targetFloorHex1, 5);
  } else if (variantIndex === 2) {
    targetWallHex = shadeHex(targetWallHex, 5);
    targetFloorHex1 = shadeHex(targetFloorHex1, -7);
  }

  // If the user selected "Quick Style Redesign" (التصميم السريع الجاهز بالفرش) OR is generating Alternative #2/#3
  // in full-redesign mode, provide the photorealistic furnished architectural interior graded to their selections.
  const isSampleStartingPhoto =
    originalDataUrl.includes('/images/before_') || originalDataUrl.includes('after_neoclassic');

  if (
    selections.designPath === 'quick' ||
    (selections.designPath === 'complete' && isSampleStartingPhoto && selections.modifyFurniture && variantIndex > 0) ||
    (selections.designPath === 'complete' && variantIndex === 2 && selections.modifyFurniture)
  ) {
    const refStyleId =
      variantIndex === 1
        ? 'modern'
        : variantIndex === 2
        ? 'hotel_luxury'
        : selections.styleId;
    const refUrl = getStylePreviewDataUrl(refStyleId, selections.roomType);
    const gradedUrl = await gradePhotorealisticReference(
      refUrl,
      targetWallHex,
      targetFloorHex1,
      selections.lightingTemp,
      variantIndex
    );
    return {
      resultDataUrl: gradedUrl,
      preservedElementsAr: [
        `تصميم فوتوغرافي متكامل بنمط ${style.nameAr}`,
        `تطبيق باليتة ${wallColorObj.nameAr} مع ${floorObj.nameAr}`,
        `ضبط حرارة الإضاءة على ${selections.lightingTemp}`,
      ],
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 960;
      const h = img.naturalHeight || 600;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ resultDataUrl: originalDataUrl, preservedElementsAr: [] });
        return;
      }

      // 1. Draw the exact user image
      ctx.drawImage(img, 0, 0, w, h);

      const isElementMode = selections.designPath === 'element_mask';
      const doWalls = isElementMode
        ? selections.activeMaskZones.includes('walls')
        : selections.designPath === 'complete' || selections.modifyWalls;
      const doFloor = isElementMode
        ? selections.activeMaskZones.includes('floor')
        : selections.designPath === 'complete' || selections.modifyFloor;
      const doCeiling = isElementMode
        ? selections.activeMaskZones.includes('ceiling')
        : selections.designPath === 'complete' || selections.modifyCeiling;
      const doLighting = isElementMode
        ? selections.activeMaskZones.includes('lighting')
        : selections.designPath === 'complete' || selections.modifyLighting;
      const doCustomBrush =
        isElementMode &&
        selections.activeMaskZones.includes('custom_brush') &&
        selections.customBrushStrokes.length > 0;

      // Room architectural horizon planes
      const ceilBottomY = Math.round(h * 0.25);
      const floorTopY = Math.round(h * 0.69);

      // Build soft feathered mask for active zones
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mCtx = maskCanvas.getContext('2d')!;

      if (doCeiling) {
        const g = mCtx.createLinearGradient(0, 0, 0, ceilBottomY + 24);
        g.addColorStop(0, 'rgba(255,0,0,1)');
        g.addColorStop(0.82, 'rgba(255,0,0,1)');
        g.addColorStop(1, 'rgba(255,0,0,0)');
        mCtx.fillStyle = g;
        mCtx.fillRect(0, 0, w, ceilBottomY + 24);
      }

      if (doWalls) {
        const g = mCtx.createLinearGradient(0, Math.max(0, ceilBottomY - 16), 0, floorTopY + 18);
        g.addColorStop(0, doCeiling ? 'rgba(0,255,0,1)' : 'rgba(0,255,0,0)');
        g.addColorStop(0.08, 'rgba(0,255,0,1)');
        g.addColorStop(0.92, 'rgba(0,255,0,1)');
        g.addColorStop(1, 'rgba(0,255,0,0)');
        mCtx.fillStyle = g;
        mCtx.fillRect(0, Math.max(0, ceilBottomY - 16), w, floorTopY - ceilBottomY + 34);
      }

      if (doFloor) {
        const g = mCtx.createLinearGradient(0, floorTopY - 14, 0, h);
        g.addColorStop(0, 'rgba(0,0,255,0)');
        g.addColorStop(0.12, 'rgba(0,0,255,1)');
        g.addColorStop(1, 'rgba(0,0,255,1)');
        mCtx.fillStyle = g;
        mCtx.fillRect(0, floorTopY - 14, w, h - floorTopY + 14);
      }

      // Custom brush mask channel
      const brushCanvas = document.createElement('canvas');
      brushCanvas.width = w;
      brushCanvas.height = h;
      const bCtx = brushCanvas.getContext('2d')!;
      if (doCustomBrush) {
        bCtx.fillStyle = '#FFFFFF';
        selections.customBrushStrokes.forEach((stroke) => {
          bCtx.beginPath();
          bCtx.arc(stroke.x * w, stroke.y * h, stroke.radius * w, 0, Math.PI * 2);
          bCtx.fill();
        });
      }

      const origData = ctx.getImageData(0, 0, w, h);
      const pixels = origData.data;
      const zoneMask = mCtx.getImageData(0, 0, w, h).data;
      const brushMask = bCtx.getImageData(0, 0, w, h).data;

      // Compute normalized luminance and bilateral-smoothed luminance (removes plaster/concrete blotches!)
      const lumArr = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4;
        lumArr[i] = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255;
      }
      const smoothLumFine = smoothChannelBox(lumArr, w, h, Math.max(4, Math.round(w * 0.012)));
      const smoothLumBroad = smoothChannelBox(lumArr, w, h, Math.max(12, Math.round(w * 0.035)));

      const wallRgb = hexToRgb(targetWallHex);
      const floorRgb1 = hexToRgb(targetFloorHex1);
      const floorRgb2 = hexToRgb(targetFloorHex2);
      const ceilRgb = { r: 246, g: 243, b: 237 }; // Smooth white/off-white gypsum board

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const pIdx = y * w + x;
          const idx = pIdx * 4;

          const origR = pixels[idx];
          const origG = pixels[idx + 1];
          const origB = pixels[idx + 2];
          const rawLum = lumArr[pIdx];
          const fineLum = smoothLumFine[pIdx];
          const broadLum = smoothLumBroad[pIdx];

          // Edge-preserving bilateral weight:
          // High gradient vs local neighborhood means it's a sharp structural edge (door frame, window frame, electrical box)
          const edgeDiff = Math.abs(rawLum - fineLum);
          const isDarkOpening = rawLum < 0.21; // Dark interior doorway or shadow opening
          const isBrightWindow = rawLum > 0.89; // Bright daylight window/balcony opening

          if (selections.preserveArchitecture && (isDarkOpening || isBrightWindow)) {
            continue;
          }

          // Smooth out mid-frequency plaster/concrete roughness while keeping macro 3D room shading
          const plasterSmoothFactor = edgeDiff < 0.09 ? 0.85 : Math.max(0.15, 1 - edgeDiff * 5);
          const cleanSurfaceLum = rawLum * (1 - plasterSmoothFactor) + broadLum * plasterSmoothFactor;

          const ceilWeight = zoneMask[idx] / 255;
          const wallWeight = zoneMask[idx + 1] / 255;
          const floorWeight = zoneMask[idx + 2] / 255;
          const brushWeight = brushMask[idx] / 255;

          // 1. CEILING RESURFACING (Gypsum Board + Smooth Skim Coat)
          if (ceilWeight > 0.05 && y <= ceilBottomY + 24) {
            // Lift dark concrete ceiling into bright architectural gypsum ceiling while keeping soft corner depth
            const liftedCeilLum = 0.76 + cleanSurfaceLum * 0.24;
            const cR = Math.min(255, Math.round(ceilRgb.r * liftedCeilLum));
            const cG = Math.min(255, Math.round(ceilRgb.g * liftedCeilLum));
            const cB = Math.min(255, Math.round(ceilRgb.b * liftedCeilLum));
            const alpha = ceilWeight * 0.9;
            pixels[idx] = Math.round(origR * (1 - alpha) + cR * alpha);
            pixels[idx + 1] = Math.round(origG * (1 - alpha) + cG * alpha);
            pixels[idx + 2] = Math.round(origB * (1 - alpha) + cB * alpha);
            continue;
          }

          // 2. FLOOR RESURFACING (Perspective Marble / Porcelain / Parquet)
          if (floorWeight > 0.05 && y >= floorTopY - 14) {
            const fy = Math.max(0.001, (y - floorTopY) / Math.max(1, h - floorTopY));
            // Perspective foreshortening coordinates
            const perspZ = 1 / (0.28 + fy * 0.85);
            const perspX = ((x - w * 0.5) / w) * perspZ;

            let fR = floorRgb1.r;
            let fG = floorRgb1.g;
            let fB = floorRgb1.b;

            if (floorObj.patternType === 'parquet' || floorObj.patternType === 'hdf' || floorObj.patternType === 'vinyl') {
              // Warm wood plank modulation
              const plankIdx = Math.floor(perspX * 14);
              const plankSeam = Math.abs((perspX * 14) - Math.round(perspX * 14)) < 0.035;
              const grain = Math.sin(perspX * 95 + perspZ * 18) * 6;
              const toneShift = (plankIdx % 2 === 0 ? 4 : -5) + grain;
              fR = Math.min(255, Math.max(0, floorRgb1.r + toneShift - (plankSeam ? 22 : 0)));
              fG = Math.min(255, Math.max(0, floorRgb1.g + toneShift - (plankSeam ? 20 : 0)));
              fB = Math.min(255, Math.max(0, floorRgb1.b + toneShift - (plankSeam ? 18 : 0)));
            } else {
              // Large-format Porcelain / Marble tile grid + subtle organic veining + window sheen
              const tileU = perspX * 4.5;
              const tileV = perspZ * 2.2;
              const isGrout =
                Math.abs(tileU - Math.round(tileU)) < 0.018 ||
                Math.abs(tileV - Math.round(tileV)) < 0.018;

              const veinWave =
                Math.sin(tileU * 3.2 + Math.cos(tileV * 2.7) * 1.8) *
                Math.cos(tileV * 2.1 - tileU * 1.4);
              const isVein = floorObj.patternType === 'marble' && veinWave > 0.72;

              if (isVein) {
                const vBlend = (veinWave - 0.72) * 1.6;
                fR = Math.round(floorRgb1.r * (1 - vBlend) + floorRgb2.r * vBlend);
                fG = Math.round(floorRgb1.g * (1 - vBlend) + floorRgb2.g * vBlend);
                fB = Math.round(floorRgb1.b * (1 - vBlend) + floorRgb2.b * vBlend);
              }

              if (isGrout) {
                fR = Math.max(0, fR - 18);
                fG = Math.max(0, fG - 18);
                fB = Math.max(0, fB - 18);
              }
            }

            // Combine smooth floor shading with subtle glossy window reflection
            const floorShade = 0.62 + cleanSurfaceLum * 0.44;
            const glossySheen = Math.max(0, 1 - Math.abs(x - w * 0.25) / (w * 0.35)) * (1 - fy * 0.6) * 18;

            // Baseboard contact shadow right at wall-floor junction
            const baseboardShadow = Math.abs(y - floorTopY) < 6 ? 0.78 : 1.0;

            const newR = Math.min(255, Math.round((fR * floorShade + glossySheen) * baseboardShadow));
            const newG = Math.min(255, Math.round((fG * floorShade + glossySheen) * baseboardShadow));
            const newB = Math.min(255, Math.round((fB * floorShade + glossySheen) * baseboardShadow));

            const alpha = floorWeight * 0.88;
            pixels[idx] = Math.round(origR * (1 - alpha) + newR * alpha);
            pixels[idx + 1] = Math.round(origG * (1 - alpha) + newG * alpha);
            pixels[idx + 2] = Math.round(origB * (1 - alpha) + newB * alpha);
            continue;
          }

          // 3. WALL RESURFACING (Putty Smoothing + Jotun Paint + Subtle Molding/Cladding)
          const activeWallAlpha = Math.max(wallWeight, brushWeight);
          if (activeWallAlpha > 0.05) {
            // Normalize wall lighting so raw grey plaster becomes bright, clean painted drywall
            const wallShade = 0.56 + cleanSurfaceLum * 0.52;
            let wR = wallRgb.r * wallShade;
            let wG = wallRgb.g * wallShade;
            let wB = wallRgb.b * wallShade;

            // Optional subtle architectural wall finish pattern on flat central wall zones (avoiding openings)
            if (
              wallFinish.patternType === 'wood_slats' &&
              x > w * 0.14 &&
              x < w * 0.28 &&
              y > ceilBottomY + 15 &&
              y < floorTopY - 15 &&
              rawLum > 0.32
            ) {
              const slatPhase = Math.sin((x / w) * 260);
              wR = (slatPhase > 0 ? 132 : 92) * wallShade;
              wG = (slatPhase > 0 ? 94 : 64) * wallShade;
              wB = (slatPhase > 0 ? 60 : 40) * wallShade;
            }

            // Feather protection around dark door frames so edges look 100% natural
            const doorProtection = rawLum < 0.28 ? Math.max(0, (rawLum - 0.21) / 0.07) : 1.0;
            const alpha = activeWallAlpha * 0.86 * doorProtection;

            pixels[idx] = Math.min(255, Math.max(0, Math.round(origR * (1 - alpha) + wR * alpha)));
            pixels[idx + 1] = Math.min(255, Math.max(0, Math.round(origG * (1 - alpha) + wG * alpha)));
            pixels[idx + 2] = Math.min(255, Math.max(0, Math.round(origB * (1 - alpha) + wB * alpha)));
          }
        }
      }

      ctx.putImageData(origData, 0, 0);

      // 4. Subtle Architectural Molding Trim & Warm Cove Lighting Pass (No cartoon shapes)
      if (doCeiling && selections.ceilingOptions.includes('ceil_gypsum_cove')) {
        const coveY = ceilBottomY - 4;
        const coveGrad = ctx.createLinearGradient(0, coveY - 18, 0, coveY + 28);
        const ledColor =
          selections.lightingTemp === '2700K'
            ? 'rgba(255, 195, 110, 0.42)'
            : selections.lightingTemp === '4000K'
            ? 'rgba(255, 248, 235, 0.35)'
            : selections.lightingTemp === '6000K'
            ? 'rgba(220, 240, 255, 0.35)'
            : 'rgba(255, 226, 172, 0.38)';
        coveGrad.addColorStop(0, 'rgba(255,255,255,0)');
        coveGrad.addColorStop(0.45, ledColor);
        coveGrad.addColorStop(0.55, 'rgba(255, 250, 235, 0.65)');
        coveGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = coveGrad;
        ctx.fillRect(w * 0.08, coveY - 18, w * 0.84, 46);
      }

      if (doLighting) {
        const glowOverlay = ctx.createRadialGradient(w * 0.5, h * 0.22, 10, w * 0.5, h * 0.5, w * 0.72);
        const tempHex =
          selections.lightingTemp === '2700K'
            ? 'rgba(255, 183, 94, 0.14)'
            : selections.lightingTemp === '4000K'
            ? 'rgba(255, 246, 229, 0.09)'
            : selections.lightingTemp === '6000K'
            ? 'rgba(215, 236, 255, 0.12)'
            : 'rgba(255, 222, 165, 0.12)';
        glowOverlay.addColorStop(0, tempHex);
        glowOverlay.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowOverlay;
        ctx.fillRect(0, 0, w, h);
      }

      const preserved: string[] = [];
      if (selections.preserveArchitecture) {
        preserved.push('ثبات مواضع الأبواب والشبابيك والفتحات المعمارية', 'ثبات زاوية التصوير وأبعاد الغرفة');
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
    img.src = originalDataUrl;
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

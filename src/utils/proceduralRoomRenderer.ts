import {
  StyleId,
  RoomTypeId,
  QualityTier,
} from '../types/makan';
import {
  DESIGN_STYLES,
  WALL_COLORS,
  WALL_FINISHES,
  FLOORING_OPTIONS,
} from '../data/catalogData';

export interface ProceduralRoomSceneParams {
  width?: number;
  height?: number;
  state?: 'unfinished_brick' | 'semi_plaster' | 'old_room' | 'designed';
  roomType?: RoomTypeId;
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

export function renderProceduralRoomToDataUrl(params: ProceduralRoomSceneParams): string {
  const w = params.width || 960;
  const h = params.height || 580;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const state = params.state || 'designed';
  const roomType = params.roomType || 'living_room';
  const seed = params.variantSeed || 0;

  // Room perspective coordinates (guaranteed constant so doors/windows never shift!)
  const backLeftX = Math.round(w * 0.18);
  const backRightX = Math.round(w * 0.82);
  const backTopY = Math.round(h * 0.15);
  const backBottomY = Math.round(h * 0.68);

  // Determine colors based on state
  let wallColor = params.wallHex || '#EAE3D5';
  let floorCol1 = params.floorPrimaryHex || '#E2D9C8';
  let floorCol2 = params.floorSecondaryHex || '#C4B69E';
  let floorPattern = params.floorPattern || 'marble';
  let wallPattern = params.wallFinishPattern || 'neoclassic_molding';

  if (state === 'unfinished_brick') {
    wallColor = '#8F4734';
    floorCol1 = '#6E6E6B';
    floorCol2 = '#575754';
    floorPattern = 'concrete';
    wallPattern = 'raw_brick';
  } else if (state === 'semi_plaster') {
    wallColor = '#8E908E';
    floorCol1 = '#787976';
    floorCol2 = '#60615E';
    floorPattern = 'concrete';
    wallPattern = 'raw_plaster';
  } else if (state === 'old_room') {
    wallColor = '#D4C39A';
    floorCol1 = '#B09A78';
    floorCol2 = '#8C7656';
    floorPattern = 'ceramic';
    wallPattern = 'paint_matte';
  }

  // 1. Draw Ceiling
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(backRightX, backTopY);
  ctx.lineTo(backLeftX, backTopY);
  ctx.closePath();
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, backTopY);
  if (state === 'unfinished_brick' || state === 'semi_plaster') {
    ceilGrad.addColorStop(0, '#5A5B59');
    ceilGrad.addColorStop(1, '#727370');
  } else {
    ceilGrad.addColorStop(0, '#F7F5F0');
    ceilGrad.addColorStop(1, '#E6E2D8');
  }
  ctx.fillStyle = ceilGrad;
  ctx.fill();

  // Gypsum cove lighting on ceiling
  if (state === 'designed' && (params.hasGypsumCove ?? true)) {
    const glowHex =
      params.lightingTemp === '2700K'
        ? 'rgba(255, 183, 94, 0.55)'
        : params.lightingTemp === '4000K'
        ? 'rgba(255, 246, 229, 0.55)'
        : params.lightingTemp === '6000K'
        ? 'rgba(220, 238, 255, 0.55)'
        : 'rgba(255, 224, 163, 0.55)';

    ctx.strokeStyle = glowHex;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(w * 0.09, h * 0.05);
    ctx.lineTo(w * 0.91, h * 0.05);
    ctx.lineTo(backRightX - 18, backTopY - 8);
    ctx.lineTo(backLeftX + 18, backTopY - 8);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  // 2. Draw Back Wall
  ctx.save();
  ctx.beginPath();
  ctx.rect(backLeftX, backTopY, backRightX - backLeftX, backBottomY - backTopY);
  ctx.clip();

  const backWallGrad = ctx.createLinearGradient(backLeftX, backTopY, backRightX, backBottomY);
  backWallGrad.addColorStop(0, shadeHex(wallColor, 4));
  backWallGrad.addColorStop(1, shadeHex(wallColor, -8));
  ctx.fillStyle = backWallGrad;
  ctx.fillRect(backLeftX, backTopY, backRightX - backLeftX, backBottomY - backTopY);

  // Back wall textures/patterns
  drawWallFinishPattern(ctx, backLeftX, backTopY, backRightX - backLeftX, backBottomY - backTopY, wallPattern, wallColor, seed);
  ctx.restore();

  // 3. Draw Left Wall
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(backLeftX, backTopY);
  ctx.lineTo(backLeftX, backBottomY);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.clip();

  const leftWallGrad = ctx.createLinearGradient(0, 0, backLeftX, 0);
  leftWallGrad.addColorStop(0, shadeHex(wallColor, -14));
  leftWallGrad.addColorStop(1, shadeHex(wallColor, -6));
  ctx.fillStyle = leftWallGrad;
  ctx.fillRect(0, 0, backLeftX, h);

  if (state === 'unfinished_brick') {
    drawWallFinishPattern(ctx, 0, 0, backLeftX, h, 'raw_brick', wallColor, seed);
  }
  ctx.restore();

  // 4. Draw Right Wall
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(backRightX, backTopY);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(backRightX, backBottomY);
  ctx.closePath();
  ctx.clip();

  const rightWallGrad = ctx.createLinearGradient(backRightX, 0, w, 0);
  rightWallGrad.addColorStop(0, shadeHex(wallColor, -4));
  rightWallGrad.addColorStop(1, shadeHex(wallColor, -12));
  ctx.fillStyle = rightWallGrad;
  ctx.fillRect(backRightX, 0, w - backRightX, h);

  if (state === 'unfinished_brick') {
    drawWallFinishPattern(ctx, backRightX, 0, w - backRightX, h, 'raw_brick', wallColor, seed);
  }
  ctx.restore();

  // 5. Draw Floor in Perspective
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(backLeftX, backBottomY);
  ctx.lineTo(backRightX, backBottomY);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.clip();

  const floorGrad = ctx.createLinearGradient(0, backBottomY, 0, h);
  floorGrad.addColorStop(0, shadeHex(floorCol1, -6));
  floorGrad.addColorStop(0.5, floorCol1);
  floorGrad.addColorStop(1, shadeHex(floorCol2, -10));
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, backBottomY, w, h - backBottomY);

  drawPerspectiveFloorPattern(ctx, w, h, backLeftX, backRightX, backBottomY, floorPattern, floorCol1, floorCol2);
  ctx.restore();

  // 6. Architectural Constants: Left Door & Right Window (NEVER moved!)
  drawArchitecturalDoor(ctx, w, h, backLeftX, backTopY, backBottomY, state);
  drawArchitecturalWindow(ctx, w, h, backRightX, backTopY, backBottomY, state, params.showCurtains ?? (state === 'designed'));

  // 7. Wall Corner Lines & Baseboards (وزرات)
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(backLeftX, backTopY);
  ctx.moveTo(w, 0);
  ctx.lineTo(backRightX, backTopY);
  ctx.moveTo(backLeftX, backTopY);
  ctx.lineTo(backRightX, backTopY);
  ctx.lineTo(backRightX, backBottomY);
  ctx.lineTo(backLeftX, backBottomY);
  ctx.closePath();
  ctx.stroke();

  if (state === 'designed') {
    // Baseboard skirting
    ctx.strokeStyle = shadeHex(floorCol2, -25);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, h - 6);
    ctx.lineTo(backLeftX, backBottomY);
    ctx.lineTo(backRightX, backBottomY);
    ctx.lineTo(w, h - 6);
    ctx.stroke();
  }

  // 8. Spotlights & Chandelier
  if (state === 'designed') {
    drawLightingFixtures(
      ctx,
      w,
      h,
      backLeftX,
      backRightX,
      backTopY,
      params.lightingTemp || '3000K',
      params.hasSpotlights ?? true,
      params.hasChandelier ?? true,
      params.hasWallSconce ?? false
    );
  }

  // 9. Furniture & Accessories
  if ((state === 'designed' && (params.showFurniture ?? true)) || state === 'old_room') {
    drawRoomFurniture(
      ctx,
      w,
      h,
      backLeftX,
      backRightX,
      backTopY,
      backBottomY,
      roomType,
      state === 'old_room' ? '#7D6A56' : params.furniturePrimaryHex || '#E8E0D2',
      state === 'old_room' ? '#5A4A3A' : params.furnitureAccentHex || '#C6A355',
      seed
    );
  }

  // 10. Overall Ambient Lighting Warmth / Contrast Pass
  if (state === 'designed') {
    const ambientOverlay = ctx.createRadialGradient(w * 0.5, h * 0.35, w * 0.05, w * 0.5, h * 0.5, w * 0.75);
    const tint =
      params.lightingTemp === '2700K'
        ? 'rgba(255, 190, 105, 0.09)'
        : params.lightingTemp === '4000K'
        ? 'rgba(255, 250, 240, 0.05)'
        : params.lightingTemp === '6000K'
        ? 'rgba(215, 235, 255, 0.07)'
        : 'rgba(255, 222, 168, 0.07)';
    ambientOverlay.addColorStop(0, tint);
    ambientOverlay.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = ambientOverlay;
    ctx.fillRect(0, 0, w, h);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

function drawWallFinishPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pattern: string,
  baseHex: string,
  seed: number
) {
  if (pattern === 'raw_brick') {
    const rowH = 16;
    const brickW = 38;
    ctx.strokeStyle = '#6D6862';
    ctx.lineWidth = 2;
    for (let r = 0; r < h / rowH; r++) {
      const py = y + r * rowH;
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
      const offset = (r % 2) * (brickW / 2);
      for (let c = -1; c < w / brickW + 1; c++) {
        const px = x + c * brickW + offset;
        ctx.fillStyle = (r + c) % 3 === 0 ? '#7D3C2B' : (r + c) % 2 === 0 ? '#984D39' : '#864230';
        ctx.fillRect(px + 1, py + 1, brickW - 2, rowH - 2);
      }
    }
    // Cement plaster patch in center
    ctx.fillStyle = 'rgba(130, 132, 129, 0.65)';
    ctx.fillRect(x + w * 0.22, y + h * 0.18, w * 0.56, h * 0.62);
    return;
  }

  if (pattern === 'raw_plaster') {
    ctx.fillStyle = 'rgba(95, 97, 95, 0.18)';
    for (let i = 0; i < 45; i++) {
      const rx = x + ((i * 73) % w);
      const ry = y + ((i * 53) % h);
      ctx.fillRect(rx, ry, 45, 18);
    }
    return;
  }

  if (pattern === 'neoclassic_molding') {
    const panels = 3;
    const margin = 24;
    const panelW = (w - margin * (panels + 1)) / panels;
    const panelH = h - margin * 2.2;
    for (let i = 0; i < panels; i++) {
      const px = x + margin + i * (panelW + margin);
      const py = y + margin;
      // Outer molding frame
      ctx.strokeStyle = shadeHex(baseHex, -18);
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, panelW, panelH);
      ctx.strokeStyle = shadeHex(baseHex, 15);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2, py + 2, panelW - 4, panelH - 4);
      // Inner molding frame
      ctx.strokeStyle = 'rgba(198, 163, 85, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(px + 12, py + 12, panelW - 24, panelH - 24);
    }
    return;
  }

  if (pattern === 'wood_slats') {
    // Fluted wood accent zones on left & right of back wall, with marble/paint center
    const slatZoneW = w * 0.26;
    const slatCount = 18;
    const slatW = slatZoneW / slatCount;
    for (let side of [0, 1]) {
      const startX = side === 0 ? x : x + w - slatZoneW;
      for (let i = 0; i < slatCount; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#7D5636' : '#4E341E';
        ctx.fillRect(startX + i * slatW, y, slatW * 0.75, h);
      }
    }
    // Center marble/paint panel
    ctx.strokeStyle = '#C6A355';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + slatZoneW, y + 10, w - slatZoneW * 2, h - 20);
    return;
  }

  if (pattern === 'marble_alternative') {
    // Bookmatched marble veins on back wall
    ctx.strokeStyle = 'rgba(180, 155, 115, 0.38)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + i * (h / 6));
      ctx.bezierCurveTo(
        x + w * 0.3,
        y + (i + 0.5) * (h / 6),
        x + w * 0.15,
        y + (i + 0.2) * (h / 6),
        x + 10,
        y + (i + 0.9) * (h / 6)
      );
      ctx.moveTo(x + w * 0.5, y + i * (h / 6));
      ctx.bezierCurveTo(
        x + w * 0.7,
        y + (i + 0.5) * (h / 6),
        x + w * 0.85,
        y + (i + 0.2) * (h / 6),
        x + w - 10,
        y + (i + 0.9) * (h / 6)
      );
      ctx.stroke();
    }
    // Gold divider strips
    ctx.strokeStyle = 'rgba(198, 163, 85, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y);
    ctx.lineTo(x + w * 0.25, y + h);
    ctx.moveTo(x + w * 0.75, y);
    ctx.lineTo(x + w * 0.75, y + h);
    ctx.stroke();
    return;
  }

  if (pattern === '3d_panels') {
    const cols = 8;
    const rows = 4;
    const cw = w / cols;
    const ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = x + c * cw;
        const py = y + r * ch;
        ctx.fillStyle = (r + c + seed) % 2 === 0 ? shadeHex(baseHex, 6) : shadeHex(baseHex, -8);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + cw, py);
        ctx.lineTo(px + cw * 0.5, py + ch);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(198, 163, 85, 0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    return;
  }

  if (pattern === 'natural_stone') {
    const rows = 10;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      let cx = x;
      while (cx < x + w) {
        const sw = 45 + ((r * 19 + cx) % 45);
        ctx.fillStyle = (r + Math.floor(cx)) % 2 === 0 ? shadeHex(baseHex, -6) : shadeHex(baseHex, 6);
        ctx.fillRect(cx + 1, y + r * rowH + 1, sw - 2, rowH - 2);
        cx += sw;
      }
    }
  }
}

function drawPerspectiveFloorPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backLeftX: number,
  backRightX: number,
  backBottomY: number,
  pattern: string,
  col1: string,
  col2: string
) {
  const floorH = h - backBottomY;

  if (pattern === 'parquet' || pattern === 'hdf' || pattern === 'vinyl') {
    // Perspective wood planks + subtle grain
    const cols = 14;
    for (let i = 0; i <= cols; i++) {
      const t = i / cols;
      const topX = backLeftX + t * (backRightX - backLeftX);
      const botX = -w * 0.15 + t * (w * 1.3);
      ctx.strokeStyle = shadeHex(col2, -18);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(topX, backBottomY);
      ctx.lineTo(botX, h);
      ctx.stroke();
    }
    const rows = 9;
    for (let r = 1; r < rows; r++) {
      const rt = Math.pow(r / rows, 1.35);
      const ry = backBottomY + rt * floorH;
      ctx.strokeStyle = 'rgba(55, 35, 18, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(w, ry);
      ctx.stroke();
    }
    return;
  }

  if (pattern === 'marble' || pattern === 'ceramic' || pattern === 'granite') {
    // Perspective tile grid
    const cols = 8;
    ctx.strokeStyle = 'rgba(120, 110, 95, 0.28)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i <= cols; i++) {
      const t = i / cols;
      const topX = backLeftX + t * (backRightX - backLeftX);
      const botX = -w * 0.1 + t * (w * 1.2);
      ctx.beginPath();
      ctx.moveTo(topX, backBottomY);
      ctx.lineTo(botX, h);
      ctx.stroke();
    }
    const rows = 6;
    for (let r = 1; r <= rows; r++) {
      const rt = Math.pow(r / rows, 1.3);
      const ry = backBottomY + rt * floorH;
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(w, ry);
      ctx.stroke();
    }

    if (pattern === 'marble') {
      // Soft diagonal marble veining + glossy reflection
      ctx.strokeStyle = shadeHex(col2, -8);
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.35;
      for (let v = 0; v < 7; v++) {
        ctx.beginPath();
        ctx.moveTo(w * (0.1 + v * 0.12), backBottomY + 10);
        ctx.bezierCurveTo(
          w * (0.2 + v * 0.1),
          backBottomY + floorH * 0.4,
          w * (0.05 + v * 0.14),
          backBottomY + floorH * 0.7,
          w * (0.18 + v * 0.12),
          h
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Specular window reflection on polished marble
      const reflGrad = ctx.createLinearGradient(w * 0.65, backBottomY, w * 0.85, h);
      reflGrad.addColorStop(0, 'rgba(255, 252, 242, 0.22)');
      reflGrad.addColorStop(1, 'rgba(255, 252, 242, 0.0)');
      ctx.fillStyle = reflGrad;
      ctx.fillRect(w * 0.52, backBottomY, w * 0.42, floorH);
    }
  }
}

function drawArchitecturalDoor(
  ctx: CanvasRenderingContext2D,
  _w: number,
  h: number,
  backLeftX: number,
  backTopY: number,
  backBottomY: number,
  state: string
) {
  // Door placed on the left wall in perspective
  const dLeftX = Math.round(backLeftX * 0.28);
  const dRightX = Math.round(backLeftX * 0.76);
  const dTopLeftY = Math.round(backTopY + (h - backBottomY) * 0.12);
  const dTopRightY = Math.round(backTopY + (backBottomY - backTopY) * 0.18);
  const dBotLeftY = Math.round(backBottomY + (h - backBottomY) * 0.72);
  const dBotRightY = Math.round(backBottomY + (h - backBottomY) * 0.24);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dLeftX, dTopLeftY);
  ctx.lineTo(dRightX, dTopRightY);
  ctx.lineTo(dRightX, dBotRightY);
  ctx.lineTo(dLeftX, dBotLeftY);
  ctx.closePath();

  if (state === 'unfinished_brick' || state === 'semi_plaster') {
    ctx.fillStyle = '#252629';
    ctx.fill();
    ctx.strokeStyle = '#8B6947';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#5C432D';
    ctx.fill();
    ctx.strokeStyle = '#3E2B1B';
    ctx.lineWidth = 5;
    ctx.stroke();
    // Door handle
    ctx.fillStyle = '#C6A355';
    ctx.beginPath();
    ctx.arc(dRightX - 10, (dTopRightY + dBotRightY) * 0.52, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArchitecturalWindow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backRightX: number,
  backTopY: number,
  backBottomY: number,
  state: string,
  showCurtains: boolean
) {
  const rwWidth = w - backRightX;
  const winLeftX = Math.round(backRightX + rwWidth * 0.2);
  const winRightX = Math.round(backRightX + rwWidth * 0.78);
  const winTopLeftY = Math.round(backTopY + (backBottomY - backTopY) * 0.12);
  const winTopRightY = Math.round(backTopY - (backTopY * 0.15));
  const winBotLeftY = Math.round(backBottomY - (backBottomY - backTopY) * 0.14);
  const winBotRightY = Math.round(backBottomY + (h - backBottomY) * 0.16);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(winLeftX, winTopLeftY);
  ctx.lineTo(winRightX, winTopRightY);
  ctx.lineTo(winRightX, winBotRightY);
  ctx.lineTo(winLeftX, winBotLeftY);
  ctx.closePath();

  const skyGrad = ctx.createLinearGradient(winLeftX, winTopLeftY, winRightX, winBotRightY);
  skyGrad.addColorStop(0, '#DCEBFA');
  skyGrad.addColorStop(0.65, '#FFF5E0');
  skyGrad.addColorStop(1, '#E6D6BF');
  ctx.fillStyle = skyGrad;
  ctx.fill();

  // Window mullions
  ctx.strokeStyle = state === 'unfinished_brick' ? '#404245' : '#2C2E33';
  ctx.lineWidth = 4;
  ctx.stroke();

  const midX = (winLeftX + winRightX) / 2;
  ctx.beginPath();
  ctx.moveTo(midX, (winTopLeftY + winTopRightY) / 2);
  ctx.lineTo(midX, (winBotLeftY + winBotRightY) / 2);
  ctx.stroke();

  if (showCurtains && state === 'designed') {
    // Sheer elegant curtains framing the window
    ctx.fillStyle = 'rgba(246, 242, 234, 0.78)';
    ctx.fillRect(winLeftX - 10, winTopLeftY - 12, 20, winBotLeftY - winTopLeftY + 55);
    ctx.fillRect(winRightX - 14, winTopRightY - 12, 22, winBotRightY - winTopRightY + 65);
  }
  ctx.restore();
}

function drawLightingFixtures(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backLeftX: number,
  backRightX: number,
  backTopY: number,
  temp: string,
  hasSpots: boolean,
  hasChandelier: boolean,
  hasWallSconce: boolean
) {
  const glowColor =
    temp === '2700K'
      ? '#FFB75E'
      : temp === '4000K'
      ? '#FFF6E5'
      : temp === '6000K'
      ? '#E3F2FF'
      : '#FFE0A3';

  if (hasSpots) {
    const spots = [0.28, 0.42, 0.58, 0.72];
    spots.forEach((t) => {
      const sx = w * t;
      const sy = backTopY * 0.55;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const spotBeam = ctx.createRadialGradient(sx, sy + 18, 2, sx, sy + 55, 65);
      spotBeam.addColorStop(0, glowColor + '66');
      spotBeam.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spotBeam;
      ctx.beginPath();
      ctx.arc(sx, sy + 35, 65, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (hasChandelier) {
    const cx = w * 0.5;
    const cy = backTopY * 0.45;
    ctx.strokeStyle = '#C6A355';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + 48);
    ctx.stroke();

    // Modern ring chandelier
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 52, 54, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 54, 54, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (hasWallSconce) {
    const sconceXs = [backLeftX + (backRightX - backLeftX) * 0.18, backLeftX + (backRightX - backLeftX) * 0.82];
    const sy = backTopY + h * 0.18;
    sconceXs.forEach((sx) => {
      ctx.fillStyle = '#C6A355';
      ctx.fillRect(sx - 3, sy - 16, 6, 32);
      const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 38);
      sg.addColorStop(0, glowColor + '88');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, 38, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function drawRoomFurniture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backLeftX: number,
  backRightX: number,
  backTopY: number,
  backBottomY: number,
  roomType: RoomTypeId,
  primaryHex: string,
  accentHex: string,
  seed: number
) {
  const centerX = (backLeftX + backRightX) / 2;

  // Area Rug on floor
  ctx.save();
  ctx.fillStyle = shadeHex(primaryHex, -8);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(backLeftX + 55, backBottomY + 25);
  ctx.lineTo(backRightX - 55, backBottomY + 25);
  ctx.lineTo(w * 0.82, h - 32);
  ctx.lineTo(w * 0.18, h - 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (roomType === 'master_bedroom' || roomType === 'kids_room') {
    // Upholstered Bed in center against back wall
    const bedW = (backRightX - backLeftX) * 0.48;
    const bedX = centerX - bedW / 2;
    const headH = 85;
    const headY = backBottomY - headH;

    // Headboard
    ctx.fillStyle = shadeHex(primaryHex, -12);
    ctx.fillRect(bedX, headY, bedW, headH);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(bedX, headY, bedW, headH);

    // Mattress & duvet extending forward
    ctx.fillStyle = '#F7F4EE';
    ctx.beginPath();
    ctx.moveTo(bedX, backBottomY - 18);
    ctx.lineTo(bedX + bedW, backBottomY - 18);
    ctx.lineTo(bedX + bedW + 28, backBottomY + 95);
    ctx.lineTo(bedX - 28, backBottomY + 95);
    ctx.closePath();
    ctx.fill();

    // Accent throw blanket
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(bedX - 18, backBottomY + 55);
    ctx.lineTo(bedX + bedW + 18, backBottomY + 55);
    ctx.lineTo(bedX + bedW + 28, backBottomY + 95);
    ctx.lineTo(bedX - 28, backBottomY + 95);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (roomType === 'kitchen') {
    // Kitchen lower & upper cabinets along back wall
    const cabW = (backRightX - backLeftX) * 0.86;
    const cabX = centerX - cabW / 2;
    // Upper cabinets
    ctx.fillStyle = shadeHex(primaryHex, -10);
    ctx.fillRect(cabX, backTopY + 24, cabW, 72);
    // Lower cabinets
    ctx.fillStyle = shadeHex(primaryHex, -22);
    ctx.fillRect(cabX, backBottomY - 88, cabW, 88);
    // Countertop slab
    ctx.fillStyle = '#F5F2EB';
    ctx.fillRect(cabX - 4, backBottomY - 94, cabW + 8, 8);
    return;
  }

  // Default Living / Reception / Office / Apartment main seating
  const sofaW = (backRightX - backLeftX) * 0.58;
  const sofaX = centerX - sofaW / 2 + (seed === 1 ? -15 : seed === 2 ? 15 : 0);
  const sofaY = backBottomY - 58;

  // Wall Art Frame above sofa
  const artW = 120;
  const artH = 76;
  ctx.fillStyle = '#F4EFE6';
  ctx.fillRect(centerX - artW / 2, backTopY + 46, artW, artH);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(centerX - artW / 2, backTopY + 46, artW, artH);
  // Minimalist abstract arch inside frame
  ctx.fillStyle = shadeHex(accentHex, -15);
  ctx.beginPath();
  ctx.arc(centerX, backTopY + 95, 24, Math.PI, 0);
  ctx.fill();

  // Sofa shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(sofaX - 8, backBottomY + 14, sofaW + 16, 16);

  // Sofa Backrest
  ctx.fillStyle = shadeHex(primaryHex, -6);
  ctx.beginPath();
  ctx.roundRect(sofaX, sofaY, sofaW, 48, 8);
  ctx.fill();

  // Sofa Seat Cushions
  ctx.fillStyle = primaryHex;
  ctx.beginPath();
  ctx.roundRect(sofaX - 6, sofaY + 32, sofaW + 12, 42, 8);
  ctx.fill();

  // Sofa Armrests
  ctx.fillStyle = shadeHex(primaryHex, -10);
  ctx.beginPath();
  ctx.roundRect(sofaX - 18, sofaY + 14, 22, 60, 6);
  ctx.roundRect(sofaX + sofaW - 4, sofaY + 14, 22, 60, 6);
  ctx.fill();

  // Throw Pillows
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.roundRect(sofaX + 16, sofaY + 12, 28, 26, 5);
  ctx.roundRect(sofaX + sofaW - 44, sofaY + 12, 28, 26, 5);
  ctx.fill();

  // Coffee Table in front of sofa
  const tableW = 135;
  const tableY = backBottomY + 52;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(centerX, tableY + 24, tableW * 0.55, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F5F0E6';
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(centerX, tableY, tableW * 0.5, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Indoor Plant on Left of Back Wall
  const plantX = backLeftX + 38;
  const plantY = backBottomY - 10;
  ctx.fillStyle = '#C8B9A6';
  ctx.beginPath();
  ctx.roundRect(plantX - 14, plantY - 26, 28, 32, 4);
  ctx.fill();
  ctx.fillStyle = '#3E5E44';
  for (let a = -2; a <= 2; a++) {
    ctx.beginPath();
    ctx.ellipse(plantX + a * 8, plantY - 45 - Math.abs(a) * 4, 9, 22, a * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function shadeHex(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

// Helper to get quick preview image for a Style card
const stylePreviewCache: Record<string, string> = {};
export function getStylePreviewDataUrl(styleId: StyleId): string {
  if (stylePreviewCache[styleId]) return stylePreviewCache[styleId];
  const style = DESIGN_STYLES.find((s) => s.id === styleId) || DESIGN_STYLES[0];
  const wc = WALL_COLORS.find((w) => w.id === style.recommendedWallColorId) || WALL_COLORS[0];
  const wf = WALL_FINISHES.find((f) => f.id === style.recommendedWallFinishId) || WALL_FINISHES[0];
  const fl = FLOORING_OPTIONS.find((f) => f.id === style.recommendedFloorId) || FLOORING_OPTIONS[0];

  const url = renderProceduralRoomToDataUrl({
    width: 640,
    height: 420,
    state: 'designed',
    wallHex: wc.hex,
    wallFinishPattern: wf.patternType,
    floorPrimaryHex: fl.primaryHex,
    floorSecondaryHex: fl.secondaryHex,
    floorPattern: fl.patternType,
    lightingTemp: style.recommendedLightingTemp,
    furniturePrimaryHex: style.paletteHex[0],
    furnitureAccentHex: style.paletteHex[2],
  });
  stylePreviewCache[styleId] = url;
  return url;
}

export interface SampleRoomPreset {
  id: string;
  nameAr: string;
  subtitleAr: string;
  roomType: RoomTypeId;
  state: 'unfinished_brick' | 'semi_plaster' | 'old_room';
}

export const SAMPLE_STARTING_ROOMS: SampleRoomPreset[] = [
  {
    id: 'sample_brick',
    nameAr: 'غرفة على الطوب الأحمر (تحت الإنشاء)',
    subtitleAr: 'مثالية لتجربة التشطيب المتكامل من الصفر ورؤية النتيجة النهائية',
    roomType: 'living_room',
    state: 'unfinished_brick',
  },
  {
    id: 'sample_plaster',
    nameAr: 'شقة نصف تشطيب (محارة وحلوق)',
    subtitleAr: 'جاهزة لاختيار ألوان الدهانات، البانوهات، والبورسلين أو الرخام',
    roomType: 'living_room',
    state: 'semi_plaster',
  },
  {
    id: 'sample_old',
    nameAr: 'غرفة قديمة تحتاج إلى تجديد',
    subtitleAr: 'مفروشة حالياً لتجربة تغيير لون الحائط فقط أو الأرضية فقط أو الأثاث',
    roomType: 'living_room',
    state: 'old_room',
  },
];

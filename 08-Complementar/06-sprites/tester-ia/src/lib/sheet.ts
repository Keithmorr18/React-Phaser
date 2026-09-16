import type { AnimDef, AssetState, Bounds, FrameInfo } from '../types';

/* ------------------------------------------------------------------ *
 * Grid math (mirrors Phaser SpritesheetFile slicing)
 * ------------------------------------------------------------------ */

export interface GridInfo {
  cols: number;
  rows: number;
  frameCount: number;
  rects: Bounds[];
}

export function computeGrid(
  width: number,
  height: number,
  frameW: number,
  frameH: number,
  margin = 0,
  spacing = 0,
): GridInfo {
  const rects: Bounds[] = [];
  if (frameW > 0 && frameH > 0) {
    for (let y = margin; y < height; y += frameH + spacing) {
      for (let x = margin; x < width; x += frameW + spacing) {
        if (x + frameW <= width && y + frameH <= height) {
          rects.push({ x, y, w: frameW, h: frameH });
        }
      }
    }
  }
  const cols = Math.max(0, Math.min(rects.length, Math.floor((width - margin + spacing) / (frameW + spacing)) || 0));
  return {
    cols: Number.isFinite(cols) ? cols : 0,
    rows: rects.length ? Math.ceil(rects.length / (cols || 1)) : 0,
    frameCount: rects.length,
    rects,
  };
}

const COMMON = [16, 24, 32, 40, 48, 64, 96, 128, 192, 256, 384, 512];

/** Best-effort guess of the frame size of a sheet. */
export function guessFrameSize(width: number, height: number) {
  const fits = COMMON.filter((s) => width % s === 0 && height % s === 0 && width / s > 0 && height / s > 0);
  if (fits.length) {
    // prefer the largest square cell that yields at least 2 frames
    const s = [...fits].reverse().find((v) => (width / v) * (height / v) >= 2) ?? fits[0];
    return { frameW: s, frameH: s };
  }
  if (width === height) return { frameW: width, frameH: height };
  return { frameW: Math.round(width / 2), frameH: Math.round(height / 2) };
}

/* ------------------------------------------------------------------ *
 * Image helpers
 * ------------------------------------------------------------------ */

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = url;
  });
}

export function imageToCanvas(img: HTMLImageElement | HTMLCanvasElement) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  return c;
}

/* ------------------------------------------------------------------ *
 * Alpha analysis — detects the real content of every frame
 * ------------------------------------------------------------------ */

export function analyzeFrames(
  source: HTMLImageElement | HTMLCanvasElement,
  grid: GridInfo,
  threshold = 10,
): FrameInfo[] {
  const canvas = source instanceof HTMLCanvasElement ? source : imageToCanvas(source);
  const g = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  let full: Uint8ClampedArray | null = null;
  try {
    full = g.getImageData(0, 0, W, H).data;
  } catch {
    full = null;
  }
  const out: FrameInfo[] = [];
  for (const rect of grid.rects) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let opaque = 0;
    let total = 0;
    if (full) {
      for (let y = 0; y < rect.h; y++) {
        const rowStart = ((rect.y + y) * W + rect.x) * 4;
        for (let x = 0; x < rect.w; x++) {
          total++;
          if (full[rowStart + x * 4 + 3] > threshold) {
            opaque++;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
    }
    out.push({
      index: out.length,
      rect,
      bounds: maxX >= minX ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null,
      coverage: total ? opaque / total : 0,
    });
  }
  return out;
}

export function unionBounds(list: (Bounds | null)[]): Bounds | null {
  const valid = list.filter((b): b is Bounds => !!b);
  if (!valid.length) return null;
  const x = Math.min(...valid.map((b) => b.x));
  const y = Math.min(...valid.map((b) => b.y));
  const x2 = Math.max(...valid.map((b) => b.x + b.w));
  const y2 = Math.max(...valid.map((b) => b.y + b.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

/* ------------------------------------------------------------------ *
 * Many images -> single atlas
 * ------------------------------------------------------------------ */

export async function buildAssetFromFiles(files: File[]): Promise<AssetState> {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const imgs = await Promise.all(sorted.map((f) => loadImage(URL.createObjectURL(f))));
  const cellW = Math.max(...imgs.map((i) => i.width));
  const cellH = Math.max(...imgs.map((i) => i.height));
  const count = imgs.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  imgs.forEach((img, i) => {
    const cx = (i % cols) * cellW + Math.floor((cellW - img.width) / 2);
    const cy = Math.floor(i / cols) * cellH + Math.floor((cellH - img.height) / 2);
    g.drawImage(img, cx, cy);
  });
  return {
    name: sorted.length === 1 ? sorted[0].name : `${count}-frames-atlas.png`,
    url: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    frameW: cellW,
    frameH: cellH,
    margin: 0,
    spacing: 0,
    source: 'files',
    rev: 0,
  };
}

export async function buildAssetFromFile(file: File): Promise<AssetState> {
  const img = await loadImage(URL.createObjectURL(file));
  const guess = guessFrameSize(img.width, img.height);
  return {
    name: file.name,
    url: img.src,
    width: img.width,
    height: img.height,
    frameW: guess.frameW,
    frameH: guess.frameH,
    margin: 0,
    spacing: 0,
    source: 'sheet',
    rev: 0,
  };
}

/* ------------------------------------------------------------------ *
 * Built-in procedural demo sheet (pixel-art slime, 4x4 @ 64px)
 * ------------------------------------------------------------------ */

const U = 16;
const P = {
  line: '#0a2a22',
  body: '#3fd68f',
  shade: '#22a46c',
  shine: '#bdffe4',
  eye: '#f7fbff',
  pupil: '#0a1420',
  foot: '#0f5f43',
  dark: '#0a1420',
};

type Eyes = 'open' | 'blink' | 'x' | 'happy';
interface Slime {
  squash: number;
  lean: number;
  footL: number;
  footR: number;
  eyes: Eyes;
  mouth: 'smile' | 'o' | 'flat';
}

function dome(g: CanvasRenderingContext2D, cx: number, baseY: number, hw: number, h: number, color: string) {
  g.fillStyle = color;
  for (let yy = 0; yy <= h; yy++) {
    const t = yy / h;
    const w = hw * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
    if (w < 0.5) continue;
    const x0 = Math.round(cx - w);
    const x1 = Math.round(cx + w);
    g.fillRect(x0, Math.round(baseY - yy), x1 - x0 + 1, 1);
  }
}

function drawSlime(g: CanvasRenderingContext2D, p: Slime) {
  const baseY = 14;
  const h = Math.max(4, Math.round(10 * p.squash));
  const hw = Math.max(3, 6 * (1 + (1 - p.squash) * 1.15));
  const cx = 8 + p.lean;
  g.clearRect(0, 0, U, U);
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(Math.round(cx - hw), baseY + 1, Math.round(hw * 2) + 1, 1);
  // feet
  g.fillStyle = P.foot;
  g.fillRect(Math.round(cx - 4 + p.footL), baseY, 2, 2);
  g.fillRect(Math.round(cx + 2 + p.footR), baseY, 2, 2);
  // body + outline
  dome(g, cx, baseY, hw + 1, h + 1, P.line);
  dome(g, cx, baseY, hw, h, P.body);
  // bottom shading
  g.fillStyle = P.shade;
  for (let yy = 0; yy < 2; yy++) {
    const t = (h - yy) / h;
    const w = hw * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
    if (w < 0.5) continue;
    g.fillRect(Math.round(cx - w), baseY - yy, Math.round(w * 2) + 1, 1);
  }
  // shine
  g.fillStyle = P.shine;
  g.fillRect(Math.round(cx - hw + 2), baseY - h + 2, 2, 2);
  // eyes
  const eyeY = baseY - Math.round(h * 0.5);
  const exL = Math.round(cx - 4);
  const exR = Math.round(cx + 2);
  if (p.eyes === 'open') {
    g.fillStyle = P.eye;
    g.fillRect(exL, eyeY, 2, 3);
    g.fillRect(exR, eyeY, 2, 3);
    g.fillStyle = P.pupil;
    g.fillRect(exL + 1, eyeY + 1, 1, 2);
    g.fillRect(exR + 1, eyeY + 1, 1, 2);
  } else if (p.eyes === 'blink') {
    g.fillStyle = P.dark;
    g.fillRect(exL, eyeY + 1, 2, 1);
    g.fillRect(exR, eyeY + 1, 2, 1);
  } else if (p.eyes === 'x') {
    g.fillStyle = P.dark;
    for (const ex of [exL, exR]) {
      g.fillRect(ex, eyeY, 1, 1);
      g.fillRect(ex + 1, eyeY + 1, 1, 1);
      g.fillRect(ex + 1, eyeY - 1, 1, 1);
      g.fillRect(ex + 2, eyeY, 1, 1);
    }
  } else {
    g.fillStyle = P.dark;
    for (const ex of [exL, exR]) {
      g.fillRect(ex, eyeY + 2, 1, 1);
      g.fillRect(ex + 1, eyeY + 1, 1, 1);
      g.fillRect(ex + 2, eyeY + 2, 1, 1);
    }
  }
  // mouth
  g.fillStyle = P.dark;
  const my = eyeY + 4;
  if (p.mouth === 'smile') {
    g.fillRect(cx - 1, my, 3, 1);
    g.fillRect(cx - 2, my - 1, 1, 1);
    g.fillRect(cx + 2, my - 1, 1, 1);
  } else if (p.mouth === 'o') {
    g.fillRect(cx - 1, my, 2, 2);
  } else {
    g.fillRect(cx - 1, my, 3, 1);
  }
}

const DEMO_FRAMES: Slime[] = [
  // idle
  { squash: 1, lean: 0, footL: 0, footR: 0, eyes: 'open', mouth: 'smile' },
  { squash: 0.94, lean: 0, footL: 0, footR: 0, eyes: 'open', mouth: 'smile' },
  { squash: 0.87, lean: 0, footL: 0, footR: 0, eyes: 'open', mouth: 'smile' },
  { squash: 0.94, lean: 0, footL: 0, footR: 0, eyes: 'blink', mouth: 'smile' },
  // run
  { squash: 1.04, lean: 1, footL: -1, footR: 1, eyes: 'open', mouth: 'smile' },
  { squash: 0.9, lean: 1, footL: 2, footR: -2, eyes: 'open', mouth: 'smile' },
  { squash: 1.02, lean: 1, footL: 0, footR: 0, eyes: 'open', mouth: 'smile' },
  { squash: 0.87, lean: 1, footL: -2, footR: 2, eyes: 'open', mouth: 'smile' },
  { squash: 1.0, lean: 1, footL: 2, footR: -2, eyes: 'open', mouth: 'smile' },
  { squash: 0.92, lean: 1, footL: 0, footR: 0, eyes: 'open', mouth: 'smile' },
  // jump
  { squash: 0.72, lean: 0, footL: 1, footR: -1, eyes: 'open', mouth: 'flat' },
  { squash: 1.26, lean: 0, footL: 2, footR: 2, eyes: 'happy', mouth: 'o' },
  { squash: 1.1, lean: 0, footL: 1, footR: -1, eyes: 'open', mouth: 'o' },
  // hurt
  { squash: 0.82, lean: -1, footL: 0, footR: 0, eyes: 'x', mouth: 'o' },
  { squash: 1.16, lean: 1, footL: 0, footR: 0, eyes: 'x', mouth: 'o' },
  { squash: 0.6, lean: 0, footL: 3, footR: 3, eyes: 'x', mouth: 'flat' },
];

export interface DemoAsset {
  asset: AssetState;
  anims: Omit<AnimDef, 'id'>[];
}

export function makeDemoAsset(): DemoAsset {
  const cell = 64;
  const cols = 4;
  const rows = Math.ceil(DEMO_FRAMES.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const small = document.createElement('canvas');
  small.width = U;
  small.height = U;
  const sg = small.getContext('2d')!;
  DEMO_FRAMES.forEach((p, i) => {
    drawSlime(sg, p);
    g.drawImage(small, (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
  });
  return {
    asset: {
      name: 'demo-slime.png',
      url: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      frameW: cell,
      frameH: cell,
      margin: 0,
      spacing: 0,
      source: 'demo',
      rev: 0,
    },
    anims: [
      { key: 'idle', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1, yoyo: false, hideOnComplete: false },
      { key: 'run', frames: [4, 5, 6, 7, 8, 9], frameRate: 12, repeat: -1, yoyo: false, hideOnComplete: false },
      { key: 'jump', frames: [10, 11, 12], frameRate: 8, repeat: -1, yoyo: true, hideOnComplete: false },
      { key: 'hurt', frames: [13, 14, 15], frameRate: 10, repeat: -1, yoyo: false, hideOnComplete: false },
    ],
  };
}

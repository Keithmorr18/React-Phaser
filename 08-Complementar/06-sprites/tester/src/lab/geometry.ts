import type { FrameAnalysis, FrameRect, SizeSuggestion, SliceConfig } from "./types";

export function computeFrames(
  imageW: number,
  imageH: number,
  slice: SliceConfig,
): FrameRect[] {
  const fw = Math.max(1, Math.floor(slice.frameWidth));
  const fh = Math.max(1, Math.floor(slice.frameHeight));
  const margin = Math.max(0, slice.margin);
  const spacing = Math.max(0, slice.spacing);
  const ox = slice.offsetX;
  const oy = slice.offsetY;
  const frames: FrameRect[] = [];
  let index = 0;
  let row = 0;
  for (let y = margin + oy; y + fh <= imageH - margin + 0.0001; y += fh + spacing) {
    let col = 0;
    for (let x = margin + ox; x + fw <= imageW - margin + 0.0001; x += fw + spacing) {
      frames.push({
        index,
        x: Math.round(x),
        y: Math.round(y),
        w: fw,
        h: fh,
        col,
        row,
      });
      index += 1;
      col += 1;
    }
    row += 1;
  }
  return frames;
}

export function leftover(imageW: number, imageH: number, slice: SliceConfig) {
  const fw = Math.max(1, slice.frameWidth);
  const fh = Math.max(1, slice.frameHeight);
  const usableW = imageW - slice.margin * 2 - slice.offsetX;
  const usableH = imageH - slice.margin * 2 - slice.offsetY;
  const strideW = fw + slice.spacing;
  const strideH = fh + slice.spacing;
  const cols = Math.max(0, Math.floor((usableW + slice.spacing) / strideW));
  const rows = Math.max(0, Math.floor((usableH + slice.spacing) / strideH));
  const usedW = cols * fw + Math.max(0, cols - 1) * slice.spacing;
  const usedH = rows * fh + Math.max(0, rows - 1) * slice.spacing;
  return {
    cols,
    rows,
    remX: Math.max(0, usableW - usedW),
    remY: Math.max(0, usableH - usedH),
  };
}

export function suggestFrameSizes(w: number, h: number): SizeSuggestion[] {
  const common = [8, 12, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128, 160, 192, 256];
  const out: SizeSuggestion[] = [];
  const seen = new Set<string>();
  for (const fw of common) {
    if (w % fw !== 0) continue;
    for (const fh of common) {
      if (h % fh !== 0) continue;
      const cols = w / fw;
      const rows = h / fh;
      const frames = cols * rows;
      if (frames < 1 || frames > 512 || cols > 64 || rows > 64) continue;
      const key = `${fw}x${fh}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ w: fw, h: fh, cols, rows, frames });
    }
  }
  return out.sort((a, b) => {
    const aSq = Math.abs(a.w - a.h) + (a.w === a.h ? 0 : 8);
    const bSq = Math.abs(b.w - b.h) + (b.w === b.h ? 0 : 8);
    if (aSq !== bSq) return aSq - bSq;
    const prefer = (s: SizeSuggestion) =>
      Math.abs(s.w - 32) + Math.abs(s.h - 32) + (s.frames > 64 ? 20 : 0);
    return prefer(a) - prefer(b);
  });
}

export function guessSlice(w: number, h: number): SliceConfig {
  const suggestions = suggestFrameSizes(w, h);
  const pick =
    suggestions.find((s) => s.w === 32 && s.h === 32) ||
    suggestions.find((s) => s.w === 48 && s.h === 48) ||
    suggestions.find((s) => s.w === 16 && s.h === 16) ||
    suggestions.find((s) => s.w === 64 && s.h === 64) ||
    suggestions.find((s) => s.w === s.h && s.frames >= 4 && s.frames <= 64) ||
    suggestions[0];
  if (!pick) {
    return {
      frameWidth: w,
      frameHeight: h,
      margin: 0,
      spacing: 0,
      offsetX: 0,
      offsetY: 0,
      lockAspect: true,
    };
  }
  return {
    frameWidth: pick.w,
    frameHeight: pick.h,
    margin: 0,
    spacing: 0,
    offsetX: 0,
    offsetY: 0,
    lockAspect: pick.w === pick.h,
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export async function fileToAssetMeta(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  return { dataUrl, width: img.width, height: img.height, name: file.name, img };
}

export async function packImages(files: File[]) {
  const metas = await Promise.all(files.map(fileToAssetMeta));
  const fw = Math.max(...metas.map((m) => m.width));
  const fh = Math.max(...metas.map((m) => m.height));
  const count = metas.length;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const canvas = document.createElement("canvas");
  canvas.width = cols * fw;
  canvas.height = rows * fh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  metas.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * fw + Math.floor((fw - m.width) / 2);
    const y = row * fh + Math.floor((fh - m.height) / 2);
    ctx.drawImage(m.img, x, y);
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    frameWidth: fw,
    frameHeight: fh,
    count,
    names: metas.map((m) => m.name.replace(/\.[^.]+$/, "")),
  };
}

export function getSheetImageData(img: HTMLImageElement): ImageData {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

function alphaAt(data: ImageData, x: number, y: number) {
  if (x < 0 || y < 0 || x >= data.width || y >= data.height) return 0;
  return data.data[(y * data.width + x) * 4 + 3];
}

export function analyzeFrames(img: HTMLImageElement, frames: FrameRect[]): FrameAnalysis[] {
  if (!frames.length) return [];
  const data = getSheetImageData(img);
  return frames.map((f) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -1;
    let maxY = -1;
    let opaque = 0;
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const a = alphaAt(data, f.x + x, f.y + y);
        if (a > 8) {
          opaque += 1;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (opaque === 0) {
      return { index: f.index, empty: true, bbox: null, opaque: 0 };
    }
    return {
      index: f.index,
      empty: false,
      bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      opaque,
    };
  });
}

export function suggestOriginFromFeet(analysis: FrameAnalysis[], frameW: number, frameH: number) {
  const feet = analysis
    .filter((a) => a.bbox)
    .map((a) => {
      const b = a.bbox!;
      return { x: (b.x + b.w / 2) / frameW, y: (b.y + b.h) / frameH };
    });
  if (!feet.length) return { x: 0.5, y: 1 };
  const x = feet.reduce((s, f) => s + f.x, 0) / feet.length;
  const y = feet.reduce((s, f) => s + f.y, 0) / feet.length;
  return { x: round4(x), y: round4(Math.min(1, y)) };
}

export function suggestHitbox(analysis: FrameAnalysis[], frameW: number, frameH: number) {
  const boxes = analysis.filter((a) => a.bbox).map((a) => a.bbox!);
  if (!boxes.length) {
    return { x: Math.round(frameW * 0.25), y: Math.round(frameH * 0.2), w: Math.round(frameW * 0.5), h: Math.round(frameH * 0.75) };
  }
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  const pad = 1;
  return {
    x: Math.max(0, minX + pad),
    y: Math.max(0, minY + pad),
    w: Math.min(frameW, maxX - minX - pad * 2),
    h: Math.min(frameH, maxY - minY - pad * 2),
  };
}

export function bboxVariance(analysis: FrameAnalysis[]) {
  const boxes = analysis.filter((a) => a.bbox).map((a) => a.bbox!);
  if (boxes.length < 2) return { w: 0, h: 0, inconsistent: false };
  const widths = boxes.map((b) => b.w);
  const heights = boxes.map((b) => b.h);
  const wMin = Math.min(...widths);
  const wMax = Math.max(...widths);
  const hMin = Math.min(...heights);
  const hMax = Math.max(...heights);
  return {
    w: wMax - wMin,
    h: hMax - hMin,
    inconsistent: wMax - wMin > 4 || hMax - hMin > 4,
  };
}

function round4(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function downloadBlob(filename: string, text: string, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

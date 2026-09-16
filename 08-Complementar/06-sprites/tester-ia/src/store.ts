import { create } from 'zustand';
import type {
  AnimDef,
  AssetState,
  ExportOpts,
  FrameInfo,
  Hitbox,
  Motion,
  Playback,
  Transform,
  View,
  Bounds,
} from './types';
import { computeGrid, unionBounds } from './lib/sheet';

const uid = () => Math.random().toString(36).slice(2, 9);

export interface LabState {
  asset: AssetState;
  frames: FrameInfo[];
  anims: AnimDef[];
  selectedAnimId: string;
  transform: Transform;
  view: View;
  playback: Playback;
  motion: Motion;
  hitbox: Hitbox;
  exportOpts: ExportOpts;
  /** bumped whenever anim definitions must be rebuilt inside Phaser */
  animRev: number;
  /** bumped on manual frame navigation while paused */
  frameToken: number;

  loadAsset: (asset: AssetState, anims?: Omit<AnimDef, 'id'>[]) => void;
  setSlicing: (p: Partial<Pick<AssetState, 'frameW' | 'frameH' | 'margin' | 'spacing'>>) => void;
  setFrames: (frames: FrameInfo[]) => void;

  addAnim: (anim?: Partial<AnimDef>) => void;
  updateAnim: (id: string, patch: Partial<AnimDef>) => void;
  removeAnim: (id: string) => void;
  duplicateAnim: (id: string) => void;
  selectAnim: (id: string) => void;

  setTransform: (p: Partial<Transform>) => void;
  setView: (p: Partial<View>) => void;
  setPlayback: (p: Partial<Playback>) => void;
  setMotion: (p: Partial<Motion>) => void;
  setHitbox: (p: Partial<Hitbox>) => void;
  setExportOpts: (p: Partial<ExportOpts>) => void;

  togglePlay: () => void;
  setFrame: (index: number) => void;
  stepFrame: (dir: number) => void;
}

export const useLab = create<LabState>((set, get) => ({
  asset: {
    name: '',
    url: '',
    width: 0,
    height: 0,
    frameW: 32,
    frameH: 32,
    margin: 0,
    spacing: 0,
    source: 'demo',
    rev: 0,
  },
  frames: [],
  anims: [],
  selectedAnimId: '',
  transform: {
    originX: 0.5,
    originY: 0.5,
    scaleX: 3,
    scaleY: 3,
    lockScale: true,
    angle: 0,
    alpha: 1,
    tint: '#ffffff',
    tintFill: false,
    blend: 'NORMAL',
    flipX: false,
    flipY: false,
    depth: 0,
    roundPixels: false,
  },
  view: {
    zoom: 1,
    showStates: false,
    showGrid: true,
    gridSize: 64,
    showStage: true,
    showNatural: true,
    showBounds: true,
    showHitbox: true,
    showPivot: true,
    onion: false,
    onionCount: 3,
    onionOffset: 26,
    trail: false,
    bg: 'checker',
    bgColor: '#0d1220',
  },
  playback: { playing: true, speed: 1, animId: '' },
  motion: { mode: 'static', speed: 2, distance: 220, gravity: 1200, bounce: 0.45, autoFlip: true },
  hitbox: { auto: true, x: 0, y: 0, w: 32, h: 32 },
  exportOpts: { embedImage: false, includeFrames: true, includeMotion: true, generateCode: true },
  animRev: 0,
  frameToken: 0,

  loadAsset: (asset, anims) =>
    set((s) => {
      const list: AnimDef[] = (anims ?? s.anims).map((a) => ({ ...a, id: uid() }));
      // keep frame indices valid for the new sheet
      const grid = computeGrid(
        asset.width,
        asset.height,
        asset.frameW,
        asset.frameH,
        asset.margin,
        asset.spacing,
      );
      const total = grid.frameCount;
      const safe = list.map((a) => ({
        ...a,
        frames: total && a.frames.filter((f) => f < total).length ? a.frames.filter((f) => f < total) : [0],
      }));
      return {
        asset: { ...asset, rev: s.asset.rev + 1 },
        anims: safe,
        selectedAnimId: safe[0]?.id ?? '',
        playback: { ...s.playback, animId: safe[0]?.id ?? '' },
      };
    }),

  setSlicing: (p) =>
    set((s) => ({
      asset: { ...s.asset, ...p, rev: s.asset.rev + 1 },
    })),

  setFrames: (frames) => set({ frames }),

  addAnim: (anim) =>
    set((s) => {
      const n = s.anims.length + 1;
      const def: AnimDef = {
        id: uid(),
        key: anim?.key ?? `anim-${n}`,
        frames: anim?.frames ?? (s.frames.length ? [0] : []),
        frameRate: anim?.frameRate ?? 10,
        repeat: anim?.repeat ?? -1,
        yoyo: anim?.yoyo ?? false,
        hideOnComplete: anim?.hideOnComplete ?? false,
      };
      return {
        anims: [...s.anims, def],
        selectedAnimId: def.id,
        playback: { ...s.playback, animId: def.id },
        animRev: s.animRev + 1,
      };
    }),

  updateAnim: (id, patch) =>
    set((s) => ({
      anims: s.anims.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      animRev: s.animRev + 1,
    })),

  removeAnim: (id) =>
    set((s) => {
      const anims = s.anims.filter((a) => a.id !== id);
      const nextSel = s.selectedAnimId === id ? anims[0]?.id ?? '' : s.selectedAnimId;
      return {
        anims,
        selectedAnimId: nextSel,
        playback: { ...s.playback, animId: nextSel },
        animRev: s.animRev + 1,
      };
    }),

  duplicateAnim: (id) =>
    set((s) => {
      const src = s.anims.find((a) => a.id === id);
      if (!src) return {};
      const copy: AnimDef = { ...src, id: uid(), key: `${src.key}-copy` };
      return {
        anims: [...s.anims, copy],
        selectedAnimId: copy.id,
        playback: { ...s.playback, animId: copy.id },
        animRev: s.animRev + 1,
      };
    }),

  selectAnim: (id) =>
    set((s) => ({
      selectedAnimId: id,
      playback: { ...s.playback, animId: id, playing: true },
      frameToken: s.frameToken + 1,
    })),

  setTransform: (p) => set((s) => ({ transform: { ...s.transform, ...p } })),
  setView: (p) => set((s) => ({ view: { ...s.view, ...p } })),
  setPlayback: (p) => set((s) => ({ playback: { ...s.playback, ...p } })),
  setMotion: (p) => set((s) => ({ motion: { ...s.motion, ...p } })),
  setHitbox: (p) => set((s) => ({ hitbox: { ...s.hitbox, ...p } })),
  setExportOpts: (p) => set((s) => ({ exportOpts: { ...s.exportOpts, ...p } })),

  togglePlay: () =>
    set((s) => ({ playback: { ...s.playback, playing: !s.playback.playing } })),

  setFrame: (index) => {
    set((s) => ({
      playback: { ...s.playback, playing: false },
      frameToken: s.frameToken + 1,
    }));
    useEngine.setState({ frame: Math.max(0, index) });
  },

  stepFrame: (dir) => {
    const s = get();
    const total = useEngine.getState().frameCount || 1;
    const cur = useEngine.getState().frame;
    const anim = s.anims.find((a) => a.id === s.playback.animId);
    let next: number;
    if (anim && anim.frames.length > 1) {
      const i = Math.max(0, anim.frames.indexOf(cur));
      next = anim.frames[(i + dir + anim.frames.length) % anim.frames.length];
    } else {
      next = (cur + dir + total) % total;
    }
    set({ playback: { ...s.playback, playing: false }, frameToken: s.frameToken + 1 });
    useEngine.setState({ frame: next });
  },
}));

/* ------------------------------------------------------------------ *
 * Runtime read-outs written by the Phaser scene
 * ------------------------------------------------------------------ */

interface EngineState {
  frame: number;
  animKey: string;
  fps: number;
  displayW: number;
  displayH: number;
  x: number;
  y: number;
  frameCount: number;
  ready: boolean;
  panning: boolean;
}

export const useEngine = create<EngineState>(() => ({
  frame: 0,
  animKey: '',
  fps: 0,
  displayW: 0,
  displayH: 0,
  x: 0,
  y: 0,
  frameCount: 0,
  ready: false,
  panning: false,
}));

/* ------------------------------------------------------------------ *
 * Derived helpers
 * ------------------------------------------------------------------ */

export function selectedAnim(s: LabState): AnimDef | undefined {
  return s.anims.find((a) => a.id === s.selectedAnimId);
}

export function resolveHitbox(s: LabState): Bounds {
  if (!s.hitbox.auto) {
    const { x, y, w, h } = s.hitbox;
    return { x, y, w, h };
  }
  const anim = s.anims.find((a) => a.id === s.playback.animId);
  const idx = anim?.frames.length ? anim.frames : s.frames.map((f) => f.index);
  const b = unionBounds(idx.map((i) => s.frames[i]?.bounds ?? null));
  if (!b) return { x: 0, y: 0, w: s.asset.frameW, h: s.asset.frameH };
  return b;
}

export function jitterReport(frames: FrameInfo[]) {
  const list = frames.filter((f) => f.bounds);
  if (list.length < 2) return { varying: false, width: 0, height: 0, spreadX: 0, spreadY: 0 };
  const w = list.map((f) => f.bounds!.w);
  const h = list.map((f) => f.bounds!.h);
  const x = list.map((f) => f.bounds!.x);
  const y = list.map((f) => f.bounds!.y);
  const spread = (a: number[]) => Math.max(...a) - Math.min(...a);
  return {
    varying: spread(w) > 0 || spread(h) > 0,
    width: spread(w),
    height: spread(h),
    spreadX: spread(x),
    spreadY: spread(y),
  };
}

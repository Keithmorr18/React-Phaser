import type { AnimationDef, Asset, FrameRect, HitboxConfig, MovementConfig, PlaybackConfig, PreviewConfig, SliceConfig } from "../lab/types";

export interface LabSnapshot {
  asset: Asset | null;
  slice: SliceConfig;
  frames: FrameRect[];
  animations: AnimationDef[];
  activeAnimId: string | null;
  selectedFrames: number[];
  preview: PreviewConfig;
  hitbox: HitboxConfig;
  movement: MovementConfig;
  playback: PlaybackConfig;
  image: HTMLImageElement | null;
  onLive: (state: string, frame: number) => void;
}

const empty: LabSnapshot = {
  asset: null,
  slice: {
    frameWidth: 48,
    frameHeight: 48,
    margin: 0,
    spacing: 0,
    offsetX: 0,
    offsetY: 0,
    lockAspect: true,
  },
  frames: [],
  animations: [],
  activeAnimId: null,
  selectedFrames: [],
  preview: {
    scale: 3,
    originX: 0.5,
    originY: 1,
    flipX: false,
    flipY: false,
    rotation: 0,
    tint: "#ffffff",
    alpha: 1,
    pixelArt: true,
    showGrid: true,
    showOrigin: true,
    showHitbox: true,
    showBounds: false,
    showRulers: true,
    showOnion: false,
    showScaleCompare: false,
    showShadow: true,
    background: "dungeon",
    cameraZoom: 1,
    studioMode: true,
    tileSize: 16,
  },
  hitbox: { x: 14, y: 10, w: 20, h: 34 },
  movement: { speed: 140, runMultiplier: 1.7, jumpForce: 360, gravity: 900, airControl: 0.7 },
  playback: { playing: true, speed: 1, currentFrame: 0 },
  image: null,
  onLive: () => {},
};

let snapshot: LabSnapshot = empty;

export const labBridge = {
  set(next: LabSnapshot) {
    snapshot = next;
  },
  get() {
    return snapshot;
  },
};

export function isTypingTarget() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

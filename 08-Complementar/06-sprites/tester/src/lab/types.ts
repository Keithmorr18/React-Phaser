export interface Asset {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  source: "demo" | "upload" | "packed";
}

export interface SliceConfig {
  frameWidth: number;
  frameHeight: number;
  margin: number;
  spacing: number;
  offsetX: number;
  offsetY: number;
  lockAspect: boolean;
}

export interface FrameRect {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  col: number;
  row: number;
}

export interface AnimationDef {
  id: string;
  name: string;
  key: string;
  frames: number[];
  frameRate: number;
  repeat: number;
  yoyo: boolean;
  delay: number;
  color: string;
}

export interface PreviewConfig {
  scale: number;
  originX: number;
  originY: number;
  flipX: boolean;
  flipY: boolean;
  rotation: number;
  tint: string;
  alpha: number;
  pixelArt: boolean;
  showGrid: boolean;
  showOrigin: boolean;
  showHitbox: boolean;
  showBounds: boolean;
  showRulers: boolean;
  showOnion: boolean;
  showScaleCompare: boolean;
  showShadow: boolean;
  background: "checkers" | "dark" | "magenta" | "green" | "dungeon" | "sky" | "dojo";
  cameraZoom: number;
  studioMode: boolean;
  tileSize: number;
}

export interface HitboxConfig {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MovementConfig {
  speed: number;
  runMultiplier: number;
  jumpForce: number;
  gravity: number;
  airControl: number;
}

export interface PlaybackConfig {
  playing: boolean;
  speed: number;
  currentFrame: number;
}

export interface UiState {
  rightTab: "slice" | "transform" | "collision" | "move" | "diag";
  exportOpen: boolean;
  helpOpen: boolean;
  sliceZoom: number;
  slicePanX: number;
  slicePanY: number;
}

export interface LabState {
  asset: Asset | null;
  slice: SliceConfig;
  animations: AnimationDef[];
  activeAnimId: string | null;
  selectedFrames: number[];
  preview: PreviewConfig;
  hitbox: HitboxConfig;
  movement: MovementConfig;
  playback: PlaybackConfig;
  ui: UiState;
  liveState: string;
  liveFrame: number;
}

export interface SizeSuggestion {
  w: number;
  h: number;
  cols: number;
  rows: number;
  frames: number;
}

export interface FrameAnalysis {
  index: number;
  empty: boolean;
  bbox: { x: number; y: number; w: number; h: number } | null;
  opaque: number;
}

export interface ProjectJSON {
  labVersion: 1;
  app: string;
  name: string;
  image: string;
  imageSize: { w: number; h: number };
  slice: SliceConfig;
  animations: AnimationDef[];
  origin: { x: number; y: number };
  hitbox: HitboxConfig;
  movement: MovementConfig;
  preview: Partial<PreviewConfig>;
  imageDataUrl?: string;
}

export const ANIM_COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
  "#fb7185",
  "#c084fc",
  "#2dd4bf",
  "#f59e0b",
];

export const PRESET_STATES = [
  { key: "idle", name: "Parado", rate: 6, repeat: -1 },
  { key: "walk", name: "Andar", rate: 10, repeat: -1 },
  { key: "run", name: "Correr", rate: 14, repeat: -1 },
  { key: "jump", name: "Pular", rate: 10, repeat: 0 },
  { key: "fall", name: "Queda", rate: 8, repeat: -1 },
  { key: "attack", name: "Ataque", rate: 14, repeat: 0 },
  { key: "hurt", name: "Ferido", rate: 8, repeat: 0 },
  { key: "death", name: "Morte", rate: 8, repeat: 0 },
  { key: "cast", name: "Magia", rate: 10, repeat: 0 },
  { key: "crouch", name: "Agachar", rate: 6, repeat: -1 },
  { key: "dash", name: "Dash", rate: 16, repeat: 0 },
  { key: "climb", name: "Escalar", rate: 8, repeat: -1 },
  { key: "sleep", name: "Dormir", rate: 4, repeat: -1 },
  { key: "shoot", name: "Atirar", rate: 12, repeat: 0 },
  { key: "block", name: "Bloquear", rate: 8, repeat: 0 },
  { key: "swim", name: "Nadar", rate: 8, repeat: -1 },
] as const;

export const DEFAULT_SLICE: SliceConfig = {
  frameWidth: 48,
  frameHeight: 48,
  margin: 0,
  spacing: 0,
  offsetX: 0,
  offsetY: 0,
  lockAspect: true,
};

export const DEFAULT_PREVIEW: PreviewConfig = {
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
};

export const DEFAULT_HITBOX: HitboxConfig = {
  x: 14,
  y: 10,
  w: 20,
  h: 34,
};

export const DEFAULT_MOVEMENT: MovementConfig = {
  speed: 140,
  runMultiplier: 1.7,
  jumpForce: 360,
  gravity: 900,
  airControl: 0.7,
};

export const DEFAULT_PLAYBACK: PlaybackConfig = {
  playing: true,
  speed: 1,
  currentFrame: 0,
};

export const DEFAULT_UI: UiState = {
  rightTab: "slice",
  exportOpen: false,
  helpOpen: false,
  sliceZoom: 2,
  slicePanX: 24,
  slicePanY: 24,
};

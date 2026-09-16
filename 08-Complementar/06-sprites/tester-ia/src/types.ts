export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameInfo {
  index: number;
  /** alpha bounds inside the frame, in source pixels */
  bounds: Bounds | null;
  /** 0..1 opaque pixel ratio */
  coverage: number;
  /** frame rect inside the sheet */
  rect: Bounds;
}

export type AssetSource = 'demo' | 'sheet' | 'files' | 'json';

export interface AssetState {
  name: string;
  url: string;
  width: number;
  height: number;
  frameW: number;
  frameH: number;
  margin: number;
  spacing: number;
  source: AssetSource;
  /** bumps every time the image or slicing params change */
  rev: number;
}

export interface AnimDef {
  id: string;
  key: string;
  frames: number[];
  frameRate: number;
  repeat: number;
  yoyo: boolean;
  hideOnComplete: boolean;
}

export type BgMode = 'checker' | 'solid' | 'blueprint' | 'dark';
export type MotionMode =
  | 'static'
  | 'patrol'
  | 'bob'
  | 'jump'
  | 'orbit'
  | 'keys'
  | 'physics';
export type BlendName =
  | 'NORMAL'
  | 'ADD'
  | 'MULTIPLY'
  | 'SCREEN'
  | 'SUBTRACT'
  | 'ERASE';

export interface Transform {
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
  lockScale: boolean;
  angle: number;
  alpha: number;
  tint: string;
  tintFill: boolean;
  blend: BlendName;
  flipX: boolean;
  flipY: boolean;
  depth: number;
  roundPixels: boolean;
}

export interface View {
  zoom: number;
  showStates: boolean;
  showGrid: boolean;
  gridSize: number;
  showStage: boolean;
  showNatural: boolean;
  showBounds: boolean;
  showHitbox: boolean;
  showPivot: boolean;
  onion: boolean;
  onionCount: number;
  onionOffset: number;
  trail: boolean;
  bg: BgMode;
  bgColor: string;
}

export interface Playback {
  playing: boolean;
  speed: number;
  animId: string;
}

export interface Motion {
  mode: MotionMode;
  speed: number;
  distance: number;
  gravity: number;
  bounce: number;
  autoFlip: boolean;
}

export interface Hitbox {
  auto: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExportOpts {
  embedImage: boolean;
  includeFrames: boolean;
  includeMotion: boolean;
  generateCode: boolean;
}

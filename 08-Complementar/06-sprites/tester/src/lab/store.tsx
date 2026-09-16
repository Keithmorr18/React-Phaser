import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  ANIM_COLORS,
  DEFAULT_HITBOX,
  DEFAULT_MOVEMENT,
  DEFAULT_PLAYBACK,
  DEFAULT_PREVIEW,
  DEFAULT_SLICE,
  DEFAULT_UI,
  type AnimationDef,
  type Asset,
  type FrameRect,
  type HitboxConfig,
  type LabState,
  type MovementConfig,
  type PlaybackConfig,
  type PreviewConfig,
  type ProjectJSON,
  type SliceConfig,
  type UiState,
} from "./types";
import { computeFrames, fileToAssetMeta, guessSlice, packImages, uid } from "./geometry";
import { DEMO_BUILDERS, type DemoId } from "./demos";
import { labBridge } from "../phaser/bridge";

type Action =
  | { type: "LOAD_ASSET"; asset: Asset; slice?: SliceConfig; animations?: AnimationDef[]; extras?: Partial<LabState> }
  | { type: "SET_SLICE"; slice: Partial<SliceConfig> }
  | { type: "ADD_ANIM"; preset?: { key: string; name: string; rate: number; repeat: number } }
  | { type: "UPDATE_ANIM"; id: string; patch: Partial<AnimationDef> }
  | { type: "DELETE_ANIM"; id: string }
  | { type: "DUPLICATE_ANIM"; id: string }
  | { type: "SET_ACTIVE_ANIM"; id: string | null }
  | { type: "SET_SELECTED_FRAMES"; frames: number[] }
  | { type: "TOGGLE_FRAME"; frame: number; additive?: boolean }
  | { type: "SELECT_RANGE"; from: number; to: number }
  | { type: "ADD_SELECTION_TO_ANIM" }
  | { type: "REMOVE_FRAME_FROM_ANIM"; indexInAnim: number }
  | { type: "MOVE_FRAME_IN_ANIM"; from: number; to: number }
  | { type: "SET_PREVIEW"; patch: Partial<PreviewConfig> }
  | { type: "SET_HITBOX"; patch: Partial<HitboxConfig> }
  | { type: "SET_MOVEMENT"; patch: Partial<MovementConfig> }
  | { type: "SET_PLAYBACK"; patch: Partial<PlaybackConfig> }
  | { type: "SET_UI"; patch: Partial<UiState> }
  | { type: "SET_LIVE"; state: string; frame: number }
  | { type: "IMPORT_PROJECT"; project: ProjectJSON }
  | { type: "RESET_PREVIEW" };

const initial: LabState = {
  asset: null,
  slice: DEFAULT_SLICE,
  animations: [],
  activeAnimId: null,
  selectedFrames: [],
  preview: DEFAULT_PREVIEW,
  hitbox: DEFAULT_HITBOX,
  movement: DEFAULT_MOVEMENT,
  playback: DEFAULT_PLAYBACK,
  ui: DEFAULT_UI,
  liveState: "idle",
  liveFrame: 0,
};

function nextColor(anims: AnimationDef[]) {
  return ANIM_COLORS[anims.length % ANIM_COLORS.length];
}

function reducer(state: LabState, action: Action): LabState {
  switch (action.type) {
    case "LOAD_ASSET": {
      const animations = action.animations ?? [];
      const slice = action.slice ?? guessSlice(action.asset.width, action.asset.height);
      const extras = action.extras ?? {};
      const autoScale = slice.frameWidth <= 16 ? 6 : slice.frameWidth <= 32 ? 4 : 3;
      return {
        ...state,
        asset: action.asset,
        slice,
        animations,
        activeAnimId: animations[0]?.id ?? null,
        selectedFrames: [],
        playback: { ...state.playback, currentFrame: 0, playing: true },
        hitbox: extras.hitbox ?? {
          x: Math.round(slice.frameWidth * 0.22),
          y: Math.round(slice.frameHeight * 0.18),
          w: Math.round(slice.frameWidth * 0.56),
          h: Math.round(slice.frameHeight * 0.78),
        },
        preview: extras.preview ?? {
          ...state.preview,
          originX: 0.5,
          originY: 1,
          scale: autoScale,
        },
        ...extras,
      };
    }
    case "SET_SLICE":
      return { ...state, slice: { ...state.slice, ...action.slice }, selectedFrames: [] };
    case "ADD_ANIM": {
      const preset = action.preset;
      const anim: AnimationDef = {
        id: uid(),
        name: preset?.name ?? `Anim ${state.animations.length + 1}`,
        key: uniqueKey(state.animations, preset?.key ?? `anim_${state.animations.length + 1}`),
        frames: [...state.selectedFrames],
        frameRate: preset?.rate ?? 10,
        repeat: preset?.repeat ?? -1,
        yoyo: false,
        delay: 0,
        color: nextColor(state.animations),
      };
      return { ...state, animations: [...state.animations, anim], activeAnimId: anim.id };
    }
    case "UPDATE_ANIM":
      return {
        ...state,
        animations: state.animations.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };
    case "DELETE_ANIM": {
      const animations = state.animations.filter((a) => a.id !== action.id);
      return {
        ...state,
        animations,
        activeAnimId: state.activeAnimId === action.id ? animations[0]?.id ?? null : state.activeAnimId,
      };
    }
    case "DUPLICATE_ANIM": {
      const src = state.animations.find((a) => a.id === action.id);
      if (!src) return state;
      const copy: AnimationDef = {
        ...src,
        id: uid(),
        name: `${src.name} copia`,
        key: uniqueKey(state.animations, `${src.key}_copy`),
        color: nextColor(state.animations),
      };
      return { ...state, animations: [...state.animations, copy], activeAnimId: copy.id };
    }
    case "SET_ACTIVE_ANIM":
      return { ...state, activeAnimId: action.id, playback: { ...state.playback, currentFrame: 0 } };
    case "SET_SELECTED_FRAMES":
      return { ...state, selectedFrames: action.frames };
    case "TOGGLE_FRAME": {
      const has = state.selectedFrames.includes(action.frame);
      const selectedFrames = action.additive
        ? has
          ? state.selectedFrames.filter((f) => f !== action.frame)
          : [...state.selectedFrames, action.frame].sort((a, b) => a - b)
        : has && state.selectedFrames.length === 1
          ? []
          : [action.frame];
      return { ...state, selectedFrames };
    }
    case "SELECT_RANGE": {
      const a = Math.min(action.from, action.to);
      const b = Math.max(action.from, action.to);
      const range: number[] = [];
      for (let i = a; i <= b; i++) range.push(i);
      return { ...state, selectedFrames: range };
    }
    case "ADD_SELECTION_TO_ANIM": {
      if (!state.activeAnimId) return state;
      return {
        ...state,
        animations: state.animations.map((a) =>
          a.id === state.activeAnimId ? { ...a, frames: [...a.frames, ...state.selectedFrames] } : a,
        ),
      };
    }
    case "REMOVE_FRAME_FROM_ANIM": {
      if (!state.activeAnimId) return state;
      return {
        ...state,
        animations: state.animations.map((a) => {
          if (a.id !== state.activeAnimId) return a;
          const frames = a.frames.slice();
          frames.splice(action.indexInAnim, 1);
          return { ...a, frames };
        }),
      };
    }
    case "MOVE_FRAME_IN_ANIM": {
      if (!state.activeAnimId) return state;
      return {
        ...state,
        animations: state.animations.map((a) => {
          if (a.id !== state.activeAnimId) return a;
          const frames = a.frames.slice();
          const [item] = frames.splice(action.from, 1);
          frames.splice(action.to, 0, item);
          return { ...a, frames };
        }),
      };
    }
    case "SET_PREVIEW":
      return { ...state, preview: { ...state.preview, ...action.patch } };
    case "SET_HITBOX":
      return { ...state, hitbox: { ...state.hitbox, ...action.patch } };
    case "SET_MOVEMENT":
      return { ...state, movement: { ...state.movement, ...action.patch } };
    case "SET_PLAYBACK":
      return { ...state, playback: { ...state.playback, ...action.patch } };
    case "SET_UI":
      return { ...state, ui: { ...state.ui, ...action.patch } };
    case "SET_LIVE":
      return { ...state, liveState: action.state, liveFrame: action.frame };
    case "IMPORT_PROJECT": {
      const p = action.project;
      const asset: Asset | null = p.imageDataUrl
        ? {
            id: uid(),
            name: p.name,
            dataUrl: p.imageDataUrl,
            width: p.imageSize.w,
            height: p.imageSize.h,
            source: "upload",
          }
        : state.asset;
      return {
        ...state,
        asset,
        slice: p.slice,
        animations: p.animations.map((a) => ({ ...a, id: a.id || uid() })),
        activeAnimId: p.animations[0]?.id ?? null,
        hitbox: p.hitbox,
        movement: p.movement,
        preview: {
          ...state.preview,
          ...p.preview,
          originX: p.origin.x,
          originY: p.origin.y,
        },
      };
    }
    case "RESET_PREVIEW":
      return {
        ...state,
        preview: { ...DEFAULT_PREVIEW, originX: state.preview.originX, originY: state.preview.originY },
        playback: { ...DEFAULT_PLAYBACK },
      };
    default:
      return state;
  }
}

function uniqueKey(anims: AnimationDef[], key: string) {
  let k = key;
  let n = 2;
  const used = new Set(anims.map((a) => a.key));
  while (used.has(k)) {
    k = `${key}_${n++}`;
  }
  return k;
}

interface LabContextValue {
  state: LabState;
  dispatch: Dispatch<Action>;
  frames: FrameRect[];
  activeAnim: AnimationDef | null;
  image: HTMLImageElement | null;
  loadFiles: (files: FileList | File[]) => Promise<void>;
  loadDemo: (id: DemoId) => void;
  importProjectFile: (file: File) => Promise<void>;
}

const LabContext = createContext<LabContextValue | null>(null);

export function LabProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useStateReducer();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageTick, setImageTick] = useState(0);

  const frames = useMemo(() => {
    if (!state.asset) return [];
    return computeFrames(state.asset.width, state.asset.height, state.slice);
  }, [state.asset, state.slice]);

  const activeAnim = state.animations.find((a) => a.id === state.activeAnimId) ?? null;

  useEffect(() => {
    if (!state.asset) {
      imageRef.current = null;
      setImageTick((n) => n + 1);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageTick((n) => n + 1);
    };
    img.src = state.asset.dataUrl;
  }, [state.asset?.dataUrl]);

  useEffect(() => {
    labBridge.set({
      asset: state.asset,
      slice: state.slice,
      frames,
      animations: state.animations,
      activeAnimId: state.activeAnimId,
      selectedFrames: state.selectedFrames,
      preview: state.preview,
      hitbox: state.hitbox,
      movement: state.movement,
      playback: state.playback,
      image: imageRef.current,
      onLive: (liveState, frame) => dispatch({ type: "SET_LIVE", state: liveState, frame }),
    });
  }, [state, frames, imageTick]);

  const loadFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || f.name.endsWith(".json"));
    const images = files.filter((f) => f.type.startsWith("image/"));
    const jsons = files.filter((f) => f.name.endsWith(".json"));
    if (jsons[0] && images.length === 0) {
      await importProjectFile(jsons[0]);
      return;
    }
    if (images.length === 1) {
      const meta = await fileToAssetMeta(images[0]);
      dispatch({
        type: "LOAD_ASSET",
        asset: {
          id: uid(),
          name: meta.name,
          dataUrl: meta.dataUrl,
          width: meta.width,
          height: meta.height,
          source: "upload",
        },
      });
      return;
    }
    if (images.length > 1) {
      const packed = await packImages(images);
      const anim: AnimationDef = {
        id: uid(),
        name: "Sequencia",
        key: "idle",
        frames: Array.from({ length: packed.count }, (_, i) => i),
        frameRate: 10,
        repeat: -1,
        yoyo: false,
        delay: 0,
        color: ANIM_COLORS[0],
      };
      dispatch({
        type: "LOAD_ASSET",
        asset: {
          id: uid(),
          name: packed.names[0] || "sheet.png",
          dataUrl: packed.dataUrl,
          width: packed.width,
          height: packed.height,
          source: "packed",
        },
        slice: {
          frameWidth: packed.frameWidth,
          frameHeight: packed.frameHeight,
          margin: 0,
          spacing: 0,
          offsetX: 0,
          offsetY: 0,
          lockAspect: packed.frameWidth === packed.frameHeight,
        },
        animations: [anim],
      });
    }
  }, []);

  const loadDemo = useCallback((id: DemoId) => {
    const pack = DEMO_BUILDERS[id]();
    dispatch({
      type: "LOAD_ASSET",
      asset: {
        id: uid(),
        name: pack.name,
        dataUrl: pack.dataUrl,
        width: pack.width,
        height: pack.height,
        source: "demo",
      },
      slice: pack.slice,
      animations: pack.animations,
      extras: {
        hitbox: pack.hitbox,
        preview: {
          ...DEFAULT_PREVIEW,
          originX: pack.origin.x,
          originY: pack.origin.y,
          scale: pack.scale,
        },
      },
    });
  }, []);

  const importProjectFile = useCallback(async (file: File) => {
    const text = await file.text();
    const project = JSON.parse(text) as ProjectJSON;
    dispatch({ type: "IMPORT_PROJECT", project });
  }, []);

  useEffect(() => {
    loadDemo("astra");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      frames,
      activeAnim,
      image: imageRef.current,
      loadFiles,
      loadDemo,
      importProjectFile,
    }),
    [state, frames, activeAnim, loadFiles, loadDemo, importProjectFile, imageTick],
  );

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

function useStateReducer(): [LabState, Dispatch<Action>] {
  const [state, setState] = useState<LabState>(initial);
  const dispatch: Dispatch<Action> = useCallback((action) => {
    setState((prev) => reducer(prev, action));
  }, []);
  return [state, dispatch];
}

export function useLab() {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error("useLab precisa estar dentro de LabProvider");
  return ctx;
}

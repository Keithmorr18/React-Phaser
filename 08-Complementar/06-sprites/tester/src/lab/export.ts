import type { AnimationDef, FrameRect, HitboxConfig, LabState, MovementConfig, ProjectJSON, SliceConfig } from "./types";

export interface ExportBundle {
  project: ProjectJSON;
  phaserAnims: unknown;
  atlasHash: unknown;
  atlasArray: unknown;
  snippet: string;
  godotLike: unknown;
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/\s+/g, "_").toLowerCase() || "sprite";
}

export function buildExports(
  state: LabState,
  frames: FrameRect[],
  includeImage = false,
): ExportBundle {
  const asset = state.asset;
  const name = baseName(asset?.name ?? "sprite");
  const image = `${name}.png`;
  const slice = state.slice;
  const origin = { x: state.preview.originX, y: state.preview.originY };

  const project: ProjectJSON = {
    labVersion: 1,
    app: "Sprite Lab",
    name,
    image,
    imageSize: { w: asset?.width ?? 0, h: asset?.height ?? 0 },
    slice,
    animations: state.animations,
    origin,
    hitbox: state.hitbox,
    movement: state.movement,
    preview: {
      scale: state.preview.scale,
      tint: state.preview.tint,
      pixelArt: state.preview.pixelArt,
      tileSize: state.preview.tileSize,
    },
    ...(includeImage && asset ? { imageDataUrl: asset.dataUrl } : {}),
  };

  const phaserAnims = {
    anims: state.animations.map((a) => ({
      key: a.key,
      type: "frame",
      frames: a.frames.map((f) => ({ key: name, frame: f })),
      frameRate: a.frameRate,
      repeat: a.repeat,
      yoyo: a.yoyo,
      delay: a.delay,
    })),
    globalTimeScale: 1,
  };

  const atlasFrames: Record<string, unknown> = {};
  frames.forEach((f) => {
    const fname = `${name}_${f.index}.png`;
    atlasFrames[fname] = {
      frame: { x: f.x, y: f.y, w: f.w, h: f.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
      sourceSize: { w: f.w, h: f.h },
      pivot: origin,
      duration: 100,
    };
  });

  const atlasHash = {
    frames: atlasFrames,
    animations: Object.fromEntries(
      state.animations.map((a) => [a.key, a.frames.map((i) => `${name}_${i}.png`)]),
    ),
    meta: {
      app: "Sprite Lab",
      version: "1.0",
      image,
      format: "RGBA8888",
      size: { w: asset?.width ?? 0, h: asset?.height ?? 0 },
      scale: "1",
    },
  };

  const atlasArray = {
    frames: frames.map((f) => ({
      filename: `${name}_${f.index}.png`,
      frame: { x: f.x, y: f.y, w: f.w, h: f.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
      sourceSize: { w: f.w, h: f.h },
      pivot: origin,
    })),
    meta: (atlasHash as { meta: unknown }).meta,
  };

  const godotLike = {
    textures: { image, region: { w: slice.frameWidth, h: slice.frameHeight } },
    animations: state.animations.map((a) => ({
      name: a.key,
      speed: a.frameRate,
      loop: a.repeat === -1,
      frames: a.frames,
    })),
    offset: origin,
    collision: state.hitbox,
  };

  const snippet = buildSnippet(name, slice, state.animations, origin, state.hitbox, state.movement, state.preview.scale);

  return { project, phaserAnims, atlasHash, atlasArray, snippet, godotLike };
}

function buildSnippet(
  name: string,
  slice: SliceConfig,
  animations: AnimationDef[],
  origin: { x: number; y: number },
  hitbox: HitboxConfig,
  movement: MovementConfig,
  scale: number,
) {
  const animLines = animations
    .map((a) => {
      const frames =
        isContiguous(a.frames)
          ? `this.anims.generateFrameNumbers('${name}', { start: ${a.frames[0]}, end: ${a.frames[a.frames.length - 1]} })`
          : `[${a.frames.map((f) => `{ key: '${name}', frame: ${f} }`).join(", ")}]`;
      return `    this.anims.create({
      key: '${a.key}',
      frames: ${frames},
      frameRate: ${a.frameRate},
      repeat: ${a.repeat},${a.yoyo ? "\n      yoyo: true," : ""}
    });`;
    })
    .join("\n\n");

  return `// Sprite Lab → Phaser 3
// 1) Preload
this.load.spritesheet('${name}', '${name}.png', {
  frameWidth: ${slice.frameWidth},
  frameHeight: ${slice.frameHeight},
  margin: ${slice.margin},
  spacing: ${slice.spacing},
});

// 2) Create animations
${animLines || "    // nenhuma animação definida"}

// 3) Sprite + corpo
const sprite = this.physics.add.sprite(120, 180, '${name}');
sprite.setOrigin(${origin.x}, ${origin.y});
sprite.setScale(${scale});
sprite.body.setSize(${hitbox.w}, ${hitbox.h});
sprite.body.setOffset(${hitbox.x}, ${hitbox.y});
sprite.anims.play('${animations[0]?.key ?? "idle"}');

// 4) Movimento sugerido
// speed: ${movement.speed} | run: x${movement.runMultiplier} | jump: ${movement.jumpForce} | gravity: ${movement.gravity}
`;
}

function isContiguous(frames: number[]) {
  if (frames.length < 2) return true;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i] !== frames[i - 1] + 1) return false;
  }
  return true;
}

export function pretty(data: unknown) {
  return JSON.stringify(data, null, 2);
}

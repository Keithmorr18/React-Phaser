import { ANIM_COLORS, DEFAULT_HITBOX, type AnimationDef, type SliceConfig } from "./types";
import { uid } from "./geometry";

export interface DemoPack {
  id: string;
  name: string;
  blurb: string;
  dataUrl: string;
  width: number;
  height: number;
  slice: SliceConfig;
  animations: AnimationDef[];
  hitbox: { x: number; y: number; w: number; h: number };
  origin: { x: number; y: number };
  scale: number;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function anim(
  name: string,
  key: string,
  frames: number[],
  frameRate: number,
  repeat: number,
  color: string,
  yoyo = false,
): AnimationDef {
  return { id: uid(), name, key, frames, frameRate, repeat, yoyo, delay: 0, color };
}

const C = {
  out: "#140c1c",
  skin: "#f0c4a0",
  skinD: "#c88868",
  helm: "#c8d2e4",
  helmD: "#6a788c",
  helmL: "#eef3f8",
  gold: "#f0c14a",
  goldD: "#b07818",
  cape: "#7b45c0",
  capeD: "#3c1d68",
  capeL: "#b07af0",
  mail: "#4a5580",
  mailL: "#7380b0",
  mailD: "#2c3458",
  boot: "#3a2428",
  bootL: "#6a4440",
  blade: "#e8f8ff",
  glow: "#5ee6ff",
  glowD: "#2a88c8",
  eye: "#121018",
  plume: "#e84870",
  plumeL: "#ff8aa8",
  shadow: "rgba(10,8,20,0.35)",
};

interface Pose {
  bob: number;
  lean: number;
  headY: number;
  lLegX: number;
  lLegY: number;
  rLegX: number;
  rLegY: number;
  lArmX: number;
  lArmY: number;
  lArmUp: number;
  rArmX: number;
  rArmY: number;
  rArmUp: number;
  sword: number;
  blink: boolean;
  duck: number;
  glow: number;
  cape: number;
  squash: number;
  fallen: number;
  flash: boolean;
}

const BASE: Pose = {
  bob: 0,
  lean: 0,
  headY: 0,
  lLegX: 0,
  lLegY: 0,
  rLegX: 0,
  rLegY: 0,
  lArmX: 0,
  lArmY: 0,
  lArmUp: 0,
  rArmX: 0,
  rArmY: 0,
  rArmUp: 0,
  sword: 0,
  blink: false,
  duck: 0,
  glow: 0,
  cape: 0,
  squash: 0,
  fallen: 0,
  flash: false,
};

function drawSword(ctx: CanvasRenderingContext2D, hx: number, hy: number, mode: number, glow: number) {
  const blade = glow > 0 ? C.glow : C.blade;
  const core = glow > 0 ? "#ffffff" : C.helmL;
  switch (mode) {
    case 0:
      px(ctx, hx + 2, hy + 1, 3, 17, C.out);
      px(ctx, hx + 3, hy + 2, 1, 15, blade);
      px(ctx, hx + 2, hy + 1, 3, 3, C.goldD);
      px(ctx, hx + 2, hy + 2, 3, 1, C.gold);
      break;
    case 1:
      px(ctx, hx + 3, hy - 2, 3, 16, C.out);
      px(ctx, hx + 4, hy - 1, 1, 14, blade);
      px(ctx, hx + 3, hy + 10, 3, 3, C.gold);
      break;
    case 2:
      px(ctx, hx + 1, hy - 12, 3, 16, C.out);
      px(ctx, hx + 2, hy - 11, 1, 14, blade);
      px(ctx, hx + 1, hy + 1, 3, 3, C.gold);
      break;
    case 3:
      px(ctx, hx - 2, hy - 16, 4, 14, C.out);
      px(ctx, hx - 1, hy - 15, 2, 12, blade);
      px(ctx, hx - 1, hy - 10, 1, 6, core);
      px(ctx, hx - 2, hy - 4, 4, 3, C.gold);
      break;
    case 4:
      px(ctx, hx + 1, hy - 2, 14, 4, C.out);
      px(ctx, hx + 2, hy - 1, 12, 2, blade);
      px(ctx, hx + 6, hy, 8, 1, core);
      px(ctx, hx + 1, hy - 2, 4, 4, C.goldD);
      px(ctx, hx + 1, hy - 1, 4, 2, C.gold);
      if (glow > 0) px(ctx, hx + 14, hy - 3, 3, 6, C.glow);
      break;
    case 5:
      px(ctx, hx + 2, hy + 1, 12, 5, C.out);
      px(ctx, hx + 3, hy + 2, 10, 3, blade);
      px(ctx, hx + 2, hy + 1, 4, 5, C.gold);
      if (glow > 0) {
        px(ctx, hx + 12, hy, 5, 7, C.glow);
        px(ctx, hx + 14, hy + 2, 4, 3, "#fff");
      }
      break;
    case 6:
      px(ctx, hx + 1, hy + 4, 12, 4, C.out);
      px(ctx, hx + 2, hy + 5, 10, 2, blade);
      px(ctx, hx + 1, hy + 4, 3, 4, C.gold);
      break;
    case 7:
      px(ctx, hx, hy - 8, 4, 14, C.out);
      px(ctx, hx + 1, hy - 7, 2, 12, blade);
      px(ctx, hx, hy + 3, 4, 3, C.gold);
      break;
    default:
      break;
  }
}

function drawAstra(ctx: CanvasRenderingContext2D, ox: number, oy: number, p: Pose) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, 48, 48);
  ctx.clip();
  const squash = p.squash;
  const bx = ox + 18 + p.lean;
  const by = oy + 18 + p.bob + p.duck + squash + Math.round(p.fallen * 10);

  if (p.fallen >= 0.85) {
    const fy = oy + 36;
    px(ctx, ox + 8, fy + 4, 30, 4, C.capeD);
    px(ctx, ox + 10, fy + 3, 24, 4, C.mail);
    px(ctx, ox + 28, fy + 1, 12, 8, C.helmD);
    px(ctx, ox + 30, fy + 2, 9, 6, C.helm);
    px(ctx, ox + 32, fy + 4, 5, 2, C.eye);
    px(ctx, ox + 6, fy + 4, 6, 4, C.boot);
    px(ctx, ox + 38, fy, 3, 5, C.plume);
    ctx.restore();
    return;
  }

  px(ctx, bx - 7, by + 22, 16, 3, C.shadow);

  const capeSwing = p.cape;
  px(ctx, bx - 12 + capeSwing, by - 1, 9, 20 - squash, C.out);
  px(ctx, bx - 11 + capeSwing, by, 7, 18 - squash, C.capeD);
  px(ctx, bx - 10 + capeSwing, by + 1, 5, 14 - squash, C.cape);
  px(ctx, bx - 9 + capeSwing, by + 2, 2, 7, C.capeL);

  const lax = bx - 9 + p.lArmX;
  const lay = by + 2 + p.lArmY;
  px(ctx, lax, lay, 4, 9 - p.lArmUp, C.out);
  px(ctx, lax + 1, lay + 1, 2, 7 - p.lArmUp, C.mailD);
  px(ctx, lax + 1, lay + 7 - p.lArmUp, 2, 3, C.skin);

  px(ctx, bx - 6 + p.lLegX, by + 11 + p.lLegY, 5, 10 - squash, C.out);
  px(ctx, bx - 5 + p.lLegX, by + 12 + p.lLegY, 3, 8 - squash, C.mailD);
  px(ctx, bx - 6 + p.lLegX, by + 19 + p.lLegY - squash, 6, 5, C.out);
  px(ctx, bx - 5 + p.lLegX, by + 20 + p.lLegY - squash, 5, 3, C.boot);
  px(ctx, bx - 5 + p.lLegX, by + 20 + p.lLegY - squash, 5, 1, C.bootL);

  px(ctx, bx + 1 + p.rLegX, by + 11 + p.rLegY, 5, 10 - squash, C.out);
  px(ctx, bx + 2 + p.rLegX, by + 12 + p.rLegY, 3, 8 - squash, C.mail);
  px(ctx, bx + 1 + p.rLegX, by + 19 + p.rLegY - squash, 6, 5, C.out);
  px(ctx, bx + 2 + p.rLegX, by + 20 + p.rLegY - squash, 5, 3, C.boot);
  px(ctx, bx + 2 + p.rLegX, by + 20 + p.rLegY - squash, 5, 1, C.bootL);

  px(ctx, bx - 7, by, 15, 13 - squash, C.out);
  px(ctx, bx - 6, by + 1, 13, 11 - squash, C.mail);
  px(ctx, bx - 5, by + 2, 11, 4, C.mailL);
  px(ctx, bx - 4, by + 7 - squash, 9, 3, C.goldD);
  px(ctx, bx - 3, by + 8 - squash, 7, 1, C.gold);
  px(ctx, bx - 1, by + 3, 3, 3, C.helmL);

  const hy = by - 12 + p.headY;
  px(ctx, bx - 8, hy - 1, 16, 14, C.out);
  px(ctx, bx - 7, hy, 14, 12, C.helmD);
  px(ctx, bx - 6, hy + 1, 12, 10, C.helm);
  px(ctx, bx - 5, hy + 1, 10, 3, C.helmL);
  px(ctx, bx - 5, hy + 4, 10, 5, C.eye);
  if (!p.blink) {
    px(ctx, bx - 4, hy + 5, 3, 3, C.glowD);
    px(ctx, bx - 3, hy + 6, 2, 2, C.glow);
    px(ctx, bx + 2, hy + 5, 3, 3, C.glowD);
    px(ctx, bx + 3, hy + 6, 2, 2, C.glow);
  }
  px(ctx, bx - 5, hy + 3, 10, 1, C.gold);
  px(ctx, bx - 5, hy + 9, 10, 1, C.gold);
  px(ctx, bx - 6, hy + 10, 12, 1, C.goldD);
  px(ctx, bx + 3, hy - 6, 4, 7, C.out);
  px(ctx, bx + 4, hy - 5, 3, 6, C.plume);
  px(ctx, bx + 5, hy - 6, 2, 3, C.plumeL);

  const rax = bx + 6 + p.rArmX;
  const ray = by + 2 + p.rArmY;
  px(ctx, rax, ray, 4, 9 - p.rArmUp, C.out);
  px(ctx, rax + 1, ray + 1, 2, 7 - p.rArmUp, C.mailL);
  px(ctx, rax + 1, ray + 7 - p.rArmUp, 2, 3, C.skin);

  drawSword(ctx, rax + 1, ray + 2 - p.rArmUp, p.sword, p.glow);

  if (p.glow > 0 && p.sword === -1) {
    px(ctx, lax - 2, lay + 6, 6, 6, C.glowD);
    px(ctx, lax, lay + 8, 3, 3, C.glow);
    px(ctx, rax - 1, ray + 6, 6, 6, C.glowD);
    px(ctx, rax + 1, ray + 8, 3, 3, "#fff");
    px(ctx, bx - 2, hy - 8, 2, 2, C.glow);
    px(ctx, bx + 6, hy - 4, 2, 2, C.glow);
  }

  if (p.flash) {
    px(ctx, bx - 6, hy + 1, 12, 2, "#ffffff");
    px(ctx, bx - 4, by + 2, 8, 2, "#ffffffaa");
  }
  ctx.restore();
}

function poseIdle(i: number): Pose {
  return {
    ...BASE,
    bob: i % 2 === 0 ? 0 : 1,
    cape: i === 1 || i === 2 ? 1 : 0,
    blink: i === 3,
    sword: 0,
  };
}

function poseWalk(i: number, n: number, run: boolean): Pose {
  const t = (i / n) * Math.PI * 2;
  const amp = run ? 5 : 3;
  const bob = run ? (i % 2 === 0 ? 0 : 2) : i % 2;
  return {
    ...BASE,
    bob,
    lean: run ? 2 : 0,
    cape: Math.round(Math.sin(t) * (run ? 2 : 1)),
    lLegX: Math.round(Math.sin(t) * amp),
    lLegY: Math.round(-Math.max(0, Math.cos(t)) * (run ? 4 : 2)),
    rLegX: Math.round(-Math.sin(t) * amp),
    rLegY: Math.round(-Math.max(0, -Math.cos(t)) * (run ? 4 : 2)),
    lArmY: Math.round(-Math.sin(t) * (run ? 2 : 1)),
    rArmY: Math.round(Math.sin(t) * (run ? 2 : 1)),
    sword: run ? 1 : 0,
    rArmX: run ? 1 : 0,
  };
}

function poseJump(i: number): Pose {
  if (i === 0) return { ...BASE, squash: 3, duck: 2, rArmUp: 2, lArmUp: 2, sword: 7 };
  if (i === 1) return { ...BASE, bob: -4, lLegY: -3, rLegY: -1, rArmUp: 6, lArmUp: 4, sword: 2, cape: -2 };
  return { ...BASE, bob: -6, lLegY: -2, rLegY: -3, rArmUp: 7, lArmX: -1, sword: 3, cape: -3, lean: 1 };
}

function poseFall(i: number): Pose {
  return {
    ...BASE,
    bob: -2,
    cape: 2 + i,
    lLegX: -1,
    rLegX: 2,
    rArmUp: i === 2 ? 1 : 3,
    lArmUp: 2,
    sword: 1,
    lean: 1,
  };
}

function poseAttack(i: number): Pose {
  const table: Partial<Pose>[] = [
    { lean: -3, rArmUp: 4, sword: 2, cape: -1, rArmX: -1 },
    { lean: -4, rArmUp: 8, sword: 3, cape: -2, rArmX: -2, glow: 1 },
    { lean: -2, rArmUp: 7, sword: 3, glow: 1 },
    { lean: 3, rArmX: 4, rArmUp: 2, sword: 4, glow: 1, cape: 2 },
    { lean: 4, rArmX: 5, sword: 5, glow: 1, cape: 3 },
    { lean: 3, rArmX: 3, sword: 5, glow: 1, cape: 2 },
    { lean: 1, rArmX: 1, sword: 6, cape: 1 },
    { lean: 0, sword: 0, cape: 0 },
  ];
  return { ...BASE, ...table[i] };
}

function poseHurt(i: number): Pose {
  return {
    ...BASE,
    lean: i === 0 ? -4 : -2,
    flash: i === 0,
    cape: 2,
    rArmUp: 2,
    sword: 6,
    bob: 1,
  };
}

function poseDeath(i: number): Pose {
  const t = i / 5;
  return {
    ...BASE,
    lean: Math.round(t * 10),
    bob: Math.round(t * 4),
    fallen: t,
    cape: Math.round(t * 3),
    sword: 6,
    blink: i > 2,
    rArmY: Math.round(t * 4),
    lArmY: Math.round(t * 3),
  };
}

function poseCast(i: number): Pose {
  const glow = i >= 1 ? 1 : 0;
  return {
    ...BASE,
    bob: i % 2,
    lArmUp: 4 + (i > 2 ? 2 : 0),
    rArmUp: 4 + (i > 2 ? 2 : 0),
    sword: -1,
    glow,
    cape: i % 2 === 0 ? 1 : -1,
    headY: i > 3 ? -1 : 0,
  };
}

function poseCrouch(i: number): Pose {
  return {
    ...BASE,
    duck: 6,
    squash: 2,
    bob: i,
    cape: i,
    sword: 0,
    blink: i === 1,
  };
}

export function generateAstra(): DemoPack {
  const fw = 48;
  const fh = 48;
  const cols = 10;
  const rows = 5;
  const canvas = document.createElement("canvas");
  canvas.width = cols * fw;
  canvas.height = rows * fh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const map: { pose: Pose }[] = [];
  for (let i = 0; i < 4; i++) map.push({ pose: poseIdle(i) });
  for (let i = 0; i < 8; i++) map.push({ pose: poseWalk(i, 8, false) });
  for (let i = 0; i < 8; i++) map.push({ pose: poseWalk(i, 8, true) });
  for (let i = 0; i < 3; i++) map.push({ pose: poseJump(i) });
  for (let i = 0; i < 3; i++) map.push({ pose: poseFall(i) });
  for (let i = 0; i < 8; i++) map.push({ pose: poseAttack(i) });
  for (let i = 0; i < 2; i++) map.push({ pose: poseHurt(i) });
  for (let i = 0; i < 6; i++) map.push({ pose: poseDeath(i) });
  for (let i = 0; i < 6; i++) map.push({ pose: poseCast(i) });
  for (let i = 0; i < 2; i++) map.push({ pose: poseCrouch(i) });

  map.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawAstra(ctx, col * fw, row * fh, m.pose);
  });

  return {
    id: "astra",
    name: "Astra, a Cavaleira",
    blurb: "48×48 · 10 estados · folha 480×240",
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    slice: {
      frameWidth: fw,
      frameHeight: fh,
      margin: 0,
      spacing: 0,
      offsetX: 0,
      offsetY: 0,
      lockAspect: true,
    },
    animations: [
      anim("Parado", "idle", [0, 1, 2, 3], 6, -1, ANIM_COLORS[0]),
      anim("Andar", "walk", [4, 5, 6, 7, 8, 9, 10, 11], 10, -1, ANIM_COLORS[1]),
      anim("Correr", "run", [12, 13, 14, 15, 16, 17, 18, 19], 14, -1, ANIM_COLORS[2]),
      anim("Pular", "jump", [20, 21, 22], 10, 0, ANIM_COLORS[3]),
      anim("Queda", "fall", [23, 24, 25], 8, -1, ANIM_COLORS[4]),
      anim("Ataque", "attack", [26, 27, 28, 29, 30, 31, 32, 33], 14, 0, ANIM_COLORS[5]),
      anim("Ferido", "hurt", [34, 35], 8, 0, ANIM_COLORS[6]),
      anim("Morte", "death", [36, 37, 38, 39, 40, 41], 8, 0, ANIM_COLORS[7]),
      anim("Magia", "cast", [42, 43, 44, 45, 46, 47], 10, 0, ANIM_COLORS[8]),
      anim("Agachar", "crouch", [48, 49], 5, -1, ANIM_COLORS[9], true),
    ],
    hitbox: { x: 8, y: 8, w: 22, h: 36 },
    origin: { x: 0.4, y: 0.96 },
    scale: 3,
  };
}

function drawSlime(ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number, mode: string) {
  const S = {
    out: "#14301c",
    body: "#46d46a",
    bodyD: "#2a9a48",
    bodyL: "#b8ffc8",
    eye: "#141018",
    shine: "#e8ffe8",
    blush: "#e07090",
    belly: "#7aee98",
  };
  let squash = 0;
  let stretch = 0;
  let oxb = 0;
  let hurt = false;
  let dead = false;
  let glow = false;
  if (mode === "idle") {
    squash = t % 2 === 0 ? 0 : 1;
    stretch = t % 2 === 0 ? 1 : 0;
  } else if (mode === "walk") {
    oxb = t % 2 === 0 ? -1 : 1;
    squash = t % 2;
  } else if (mode === "jump") {
    if (t === 0) squash = 3;
    if (t === 1) stretch = 4;
    if (t === 2) stretch = 2;
    if (t === 3) squash = 2;
  } else if (mode === "hurt") {
    hurt = true;
    oxb = t === 0 ? -2 : 1;
  } else if (mode === "death") {
    dead = true;
    squash = 4 + t;
  } else if (mode === "attack") {
    stretch = t === 1 ? 3 : 0;
    squash = t === 0 ? 2 : 0;
    glow = t === 1;
    oxb = t === 1 ? 2 : 0;
  }

  const w = 12 + stretch - squash;
  const h = 11 - stretch + squash;
  const x = ox + 8 - Math.floor(w / 2) + oxb;
  const y = oy + 15 - h;

  px(ctx, x + 1, y + h, w - 2, 1, "rgba(0,0,0,0.25)");
  px(ctx, x, y, w, h, S.out);
  px(ctx, x + 1, y + 1, w - 2, h - 2, hurt ? "#d0f0d0" : S.body);
  px(ctx, x + 2, y + h - 4, w - 4, 2, S.bodyD);
  px(ctx, x + 2, y + 3, w - 5, 3, S.belly);
  if (!dead) {
    px(ctx, x + 3, y + 3, 2, 3, S.eye);
    px(ctx, x + w - 6, y + 3, 2, 3, S.eye);
    px(ctx, x + 3, y + 3, 1, 1, "#fff");
    px(ctx, x + 2, y + 6, 2, 1, S.blush);
    px(ctx, x + w - 5, y + 6, 2, 1, S.blush);
  } else {
    px(ctx, x + 3, y + 4, 2, 1, S.eye);
    px(ctx, x + w - 6, y + 4, 2, 1, S.eye);
  }
  px(ctx, x + 2, y + 2, 2, 2, S.shine);
  if (glow) px(ctx, x + w - 1, y + 2, 3, 3, "#c8ff70");
}

export function generateBlobu(): DemoPack {
  const fw = 16;
  const fh = 16;
  const cols = 8;
  const rows = 3;
  const canvas = document.createElement("canvas");
  canvas.width = cols * fw;
  canvas.height = rows * fh;
  const ctx = canvas.getContext("2d")!;
  const seq: { mode: string; t: number }[] = [];
  for (let i = 0; i < 4; i++) seq.push({ mode: "idle", t: i });
  for (let i = 0; i < 4; i++) seq.push({ mode: "walk", t: i });
  for (let i = 0; i < 4; i++) seq.push({ mode: "jump", t: i });
  for (let i = 0; i < 2; i++) seq.push({ mode: "hurt", t: i });
  for (let i = 0; i < 3; i++) seq.push({ mode: "death", t: i });
  for (let i = 0; i < 3; i++) seq.push({ mode: "attack", t: i });
  while (seq.length < cols * rows) seq.push({ mode: "idle", t: 0 });
  seq.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawSlime(ctx, col * fw, row * fh, s.t, s.mode);
  });
  return {
    id: "blobu",
    name: "Blobu, o Slime",
    blurb: "16×16 · 6 estados · folha 128×48",
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    slice: {
      frameWidth: fw,
      frameHeight: fh,
      margin: 0,
      spacing: 0,
      offsetX: 0,
      offsetY: 0,
      lockAspect: true,
    },
    animations: [
      anim("Parado", "idle", [0, 1, 2, 3], 6, -1, ANIM_COLORS[0], true),
      anim("Andar", "walk", [4, 5, 6, 7], 8, -1, ANIM_COLORS[1]),
      anim("Pular", "jump", [8, 9, 10, 11], 10, 0, ANIM_COLORS[3]),
      anim("Ferido", "hurt", [12, 13], 8, 0, ANIM_COLORS[6]),
      anim("Morte", "death", [14, 15, 16], 7, 0, ANIM_COLORS[7]),
      anim("Ataque", "attack", [17, 18, 19], 10, 0, ANIM_COLORS[5]),
    ],
    hitbox: { x: 2, y: 5, w: 12, h: 10 },
    origin: { x: 0.5, y: 1 },
    scale: 5,
  };
}

function drawBurst(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number) {
  const colors = ["#ffffff", "#fff4a8", "#ffc14a", "#ff7a22", "#e03818", "#801018", "#401018", "#201010"];
  const cx = ox + 16;
  const cy = oy + 16;
  const r = 2 + frame * 2;
  const col = colors[Math.min(frame, colors.length - 1)];
  const col2 = colors[Math.min(frame + 1, colors.length - 1)];
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + frame * 0.2;
    const d = r + (a % 2);
    const x = Math.round(cx + Math.cos(ang) * d);
    const y = Math.round(cy + Math.sin(ang) * d);
    const s = Math.max(1, 5 - Math.floor(frame / 2));
    px(ctx, x - Math.floor(s / 2), y - Math.floor(s / 2), s, s, col);
    if (frame < 6) px(ctx, x, y, 2, 2, col2);
  }
  if (frame < 3) px(ctx, cx - 2, cy - 2, 4, 4, "#ffffff");
  if (frame >= 3 && frame < 6) {
    px(ctx, cx - 1, cy - 1, 2, 2, col);
    for (let k = 0; k < 6; k++) {
      const ang = k * 1.1 + frame;
      px(
        ctx,
        Math.round(cx + Math.cos(ang) * (r + 4)),
        Math.round(cy + Math.sin(ang) * (r + 4)),
        2,
        2,
        col2,
      );
    }
  }
}

export function generateBurst(): DemoPack {
  const fw = 32;
  const fh = 32;
  const cols = 8;
  const rows = 1;
  const canvas = document.createElement("canvas");
  canvas.width = cols * fw;
  canvas.height = rows * fh;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 8; i++) drawBurst(ctx, i * fw, 0, i);
  return {
    id: "burst",
    name: "Burst FX",
    blurb: "32×32 · explosão de 8 quadros",
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    slice: {
      frameWidth: fw,
      frameHeight: fh,
      margin: 0,
      spacing: 0,
      offsetX: 0,
      offsetY: 0,
      lockAspect: true,
    },
    animations: [anim("Explosão", "explode", [0, 1, 2, 3, 4, 5, 6, 7], 12, 0, ANIM_COLORS[3])],
    hitbox: { x: 8, y: 8, w: 16, h: 16 },
    origin: { x: 0.5, y: 0.5 },
    scale: 3,
  };
}

export const DEMO_BUILDERS = {
  astra: generateAstra,
  blobu: generateBlobu,
  burst: generateBurst,
} as const;

export type DemoId = keyof typeof DEMO_BUILDERS;

export const DEFAULT_HITBOX_FALLBACK = DEFAULT_HITBOX;

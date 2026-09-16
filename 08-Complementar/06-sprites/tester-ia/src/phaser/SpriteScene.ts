import Phaser from 'phaser';
import { resolveHitbox, useEngine, useLab, type LabState } from '../store';
import type { AssetState } from '../types';
import { sceneApi } from './api';

export const STAGE = { w: 1280, h: 760 };
const BASE_RATE = 100;

const BLENDS: Record<string, number> = {
  NORMAL: Phaser.BlendModes.NORMAL,
  ADD: Phaser.BlendModes.ADD,
  MULTIPLY: Phaser.BlendModes.MULTIPLY,
  SCREEN: Phaser.BlendModes.SCREEN,
  ERASE: Phaser.BlendModes.ERASE,
};

const C = {
  display: 0xf59e0b,
  natural: 0x38bdf8,
  content: 0xf472b6,
  hit: 0x22d3ee,
  pivot: 0xffffff,
  grid: 0x1e293b,
  gridMajor: 0x2f3f5c,
  stage: 0x475569,
  floor: 0x22d3ee,
};

export class SpriteScene extends Phaser.Scene {
  private sprite!: Phaser.GameObjects.Sprite;
  private ghosts: Phaser.GameObjects.Sprite[] = [];
  private grid!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private trails!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private handle!: Phaser.GameObjects.Rectangle;
  private clones: Phaser.GameObjects.Sprite[] = [];
  private cloneLabels: Phaser.GameObjects.Text[] = [];
  private statesGfx!: Phaser.GameObjects.Graphics;

  private texKey = '';
  private texRev = -1;
  private animRev = -1;
  private pendingKey = '';
  private createdKeys = new Set<string>();
  private last: Record<string, Record<string, unknown>> = {};

  private base = { x: 0, y: 0 };
  private focus = { x: 0, y: 0 };
  private fitZoom = 1;
  private t = 0;
  private dynX = 1;
  private dynY = 1;
  private dynTX = 1;
  private dynTY = 1;
  private trailPts: { x: number; y: number }[] = [];
  private trailTimer = 0;
  private fpsAcc = 0;
  private fpsCount = 0;
  private fpsClock = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('spritelab');
  }

  create() {
    sceneApi.current = this;
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.grid = this.add.graphics().setDepth(-50);
    this.trails = this.add.graphics().setDepth(-20);
    this.statesGfx = this.add.graphics().setDepth(-30);
    this.overlay = this.add.graphics().setDepth(40);

    this.sprite = this.add.sprite(0, 0, '__DEFAULT').setDepth(0);
    for (let i = 0; i < 4; i++) {
      this.ghosts.push(
        this.add
          .sprite(0, 0, '__DEFAULT')
          .setDepth(-5 + i)
          .setAlpha(0.3)
          .setTint(0x38bdf8)
          .setVisible(false),
      );
    }

    this.label = this.add
      .text(0, 0, '', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#94a3b8',
        backgroundColor: 'rgba(2,6,23,0.72)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setResolution(2);

    this.handle = this.add
      .rectangle(0, 0, 72, 72, 0x38bdf8, 0)
      .setStrokeStyle(1, 0x38bdf8, 0)
      .setDepth(100);
    this.handle.setInteractive({ useHandCursor: true });
    this.input.setDraggable(this.handle);
    this.handle.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
      this.base.x = x;
      this.base.y = y;
      this.trailPts = [];
      const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
      if (body?.enable) {
        body.reset(x, y);
        body.setVelocity(0, 0);
      }
      this.sprite.setPosition(x, y);
    });
    this.handle.on('pointerover', () => this.handle.setStrokeStyle(1, 0x38bdf8, 0.5));
    this.handle.on('pointerout', () => this.handle.setStrokeStyle(1, 0x38bdf8, 0));

    this.physics.add.existing(this.sprite, false);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.physics.world.setBounds(-STAGE.w / 2, -STAGE.h / 2, STAGE.w, STAGE.h);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.input.mouse?.disableContextMenu();
    this.setupInput();
    this.drawGrid(useLab.getState());

    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.onFrameChange());
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      const anim = this.sprite.anims.currentAnim;
      if (anim && anim.repeat !== -1) useLab.getState().setPlayback({ playing: false });
    });

    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      if (this.pendingKey && this.textures.exists(this.pendingKey)) {
        this.applyTexture(this.pendingKey, useLab.getState().asset);
      }
    });

    useEngine.subscribe((st, prev) => {
      if (st.frame !== prev.frame && !useLab.getState().playback.playing) this.applyManualFrame();
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.computeFit();
      this.applyView(useLab.getState());
    });
    this.computeFit();
    this.cameras.main.centerOn(0, 0);
    this.sync(useLab.getState());
  }

  /* ------------------------------------------------------------------ *
   * Input
   * ------------------------------------------------------------------ */

  private setupInput() {
    const cam = this.cameras.main;
    let panning = false;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => {
      if (p.rightButtonDown() || p.middleButtonDown()) {
        panning = true;
        useEngine.setState({ panning: true });
      } else if (!over?.length && useLab.getState().motion.mode === 'physics') {
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        const m = useLab.getState().motion;
        if (body.enable) body.setVelocity(-m.speed * 60, -Math.abs(m.gravity) * 0.62);
      }
    });
    this.input.on('pointerup', () => {
      panning = false;
      useEngine.setState({ panning: false });
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!panning) return;
      this.focus.x -= (p.x - p.prevPosition.x) / cam.zoom;
      this.focus.y -= (p.y - p.prevPosition.y) / cam.zoom;
      cam.centerOn(this.focus.x, this.focus.y);
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      const z = useLab.getState().view.zoom;
      const next = Phaser.Math.Clamp(+(z * (dy > 0 ? 0.9 : 1.1)).toFixed(3), 0.15, 8);
      useLab.getState().setView({ zoom: next });
    });
  }

  resetView() {
    this.focus = { x: 0, y: 0 };
    useLab.getState().setView({ zoom: 1 });
    this.cameras.main.centerOn(0, 0);
  }

  focusSprite() {
    this.focus = { x: this.sprite.x, y: this.sprite.y };
    this.cameras.main.centerOn(this.focus.x, this.focus.y);
  }

  private computeFit() {
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;
    this.fitZoom = Math.max(0.05, Math.min((w - 80) / STAGE.w, (h - 70) / STAGE.h));
  }

  /* ------------------------------------------------------------------ *
   * Sync from React
   * ------------------------------------------------------------------ */

  sync(s: LabState) {
    if (s.asset.rev !== this.texRev) {
      this.texRev = s.asset.rev;
      this.loadTexture(s.asset);
    }
    if (s.animRev !== this.animRev) {
      this.animRev = s.animRev;
      this.rebuildAnims(s);
      this.applyPlayback(s);
    }
    const animKey = s.anims.find((a) => a.id === s.playback.animId)?.key ?? '';
    if (
      this.changed('playback', {
        playing: s.playback.playing,
        speed: s.playback.speed,
        animId: s.playback.animId,
        animKey,
        token: s.frameToken,
        frame: useEngine.getState().frame,
      })
    ) {
      this.applyPlayback(s);
    }
    if (this.changed('transform', s.transform as unknown as Record<string, unknown>)) this.applyTransform(s);
    if (this.changed('view', s.view as unknown as Record<string, unknown>)) this.applyView(s);
    if (this.changed('motion', s.motion as unknown as Record<string, unknown>)) this.applyMotion(s);
    if (
      this.changed('hitbox', {
        ...s.hitbox,
        ...resolveHitbox(s),
        animId: s.playback.animId,
        frames: s.frames.length,
      })
    ) {
      this.applyHitbox(s);
    }
    if (this.changed('grid', { gridSize: s.view.gridSize, bg: s.view.bg, showGrid: s.view.showGrid, showStage: s.view.showStage, mode: s.motion.mode })) {
      this.drawGrid(s);
    }
    if (
      this.changed('states', {
        on: s.view.showStates,
        animRev: s.animRev,
        tex: this.texKey,
        playing: s.playback.playing,
        speed: s.playback.speed,
        ox: s.transform.originX,
        oy: s.transform.originY,
        sx: s.transform.scaleX,
        sy: s.transform.scaleY,
        fw: s.asset.frameW,
        fh: s.asset.frameH,
        n: s.anims.length,
        alpha: s.transform.alpha,
        tint: s.transform.tint,
        flip: `${s.transform.flipX}${s.transform.flipY}`,
      })
    ) {
      this.syncStates(s);
    }
  }

  private changed(slot: string, obj: Record<string, unknown>) {
    const prev = this.last[slot];
    if (prev && Object.keys(prev).length === Object.keys(obj).length) {
      let same = true;
      for (const k in obj) {
        if (prev[k] !== obj[k]) {
          same = false;
          break;
        }
      }
      if (same) return false;
    }
    this.last[slot] = { ...obj };
    return true;
  }

  /* ------------------------------------------------------------------ *
   * Texture + anims
   * ------------------------------------------------------------------ */

  private loadTexture(asset: AssetState) {
    const key = `sheet_${asset.rev}_${asset.frameW}x${asset.frameH}`;
    this.pendingKey = key;
    if (this.textures.exists(key)) {
      this.applyTexture(key, asset);
      return;
    }
    this.load.spritesheet(key, asset.url, {
      frameWidth: asset.frameW,
      frameHeight: asset.frameH,
      margin: asset.margin,
      spacing: asset.spacing,
    });
    this.load.start();
  }

  private frameCount() {
    if (!this.texKey) return 0;
    const tex = this.textures.get(this.texKey);
    return Object.keys(tex.frames).filter((n) => n !== '__BASE').length;
  }

  private validFrame(i: number) {
    const total = this.frameCount();
    if (!total) return 0;
    return Phaser.Math.Clamp(Math.round(i), 0, total - 1);
  }

  private applyTexture(key: string, asset: AssetState) {
    this.texKey = key;
    this.sprite.anims.stop();
    this.sprite.setTexture(key, 0);
    for (const k of this.textures.getTextureKeys()) {
      if (k.startsWith('sheet_') && k !== key) this.textures.remove(k);
    }
    this.handle.setSize(Math.max(48, asset.frameW * 0.9), Math.max(48, asset.frameH * 0.9));
    const s = useLab.getState();
    this.last.anims = {};
    this.rebuildAnims(s);
    this.applyTransform(s);
    this.applyView(s);
    this.applyHitbox(s);
    this.applyMotion(s);
    this.applyPlayback(s);
    useEngine.setState({ frame: 0, frameCount: this.frameCount(), ready: true, animKey: '' });
    this.drawGrid(s);
    this.syncStates(s);
  }

  private rebuildAnims(s: LabState) {
    if (!this.texKey) return;
    this.sprite.anims.stop();
    for (const key of [...this.createdKeys]) {
      if (this.anims.exists(key)) this.anims.remove(key);
      this.createdKeys.delete(key);
    }
    for (const a of s.anims) {
      if (this.createdKeys.has(a.key)) continue; // avoid duplicated keys
      const frames = a.frames.filter((i) => this.textures.get(this.texKey).has(String(i)));
      if (!frames.length) continue;
      this.anims.create({
        key: a.key,
        frames: frames.map((i) => ({ key: this.texKey, frame: i })),
        frameRate: BASE_RATE,
        repeat: a.repeat,
        yoyo: a.yoyo,
        hideOnComplete: a.hideOnComplete,
      });
      this.createdKeys.add(a.key);
    }
  }

  private applyPlayback(s: LabState) {
    const anim = s.anims.find((a) => a.id === s.playback.animId);
    if (!this.texKey || !anim || !this.anims.exists(anim.key)) {
      if (this.texKey) this.sprite.anims.stop();
      return;
    }
    const engine = useEngine.getState();
    const scale = (anim.frameRate / BASE_RATE) * s.playback.speed;
    if (s.playback.playing) {
      if (!s.view.showStates && !this.sprite.visible) this.sprite.setVisible(true);
      const cur = this.sprite.anims.currentAnim?.key;
      if (cur !== anim.key || this.sprite.anims.isPaused || !this.sprite.anims.isPlaying) {
        const startIdx = Math.max(0, anim.frames.indexOf(engine.frame));
        this.sprite.play({ key: anim.key, startFrame: startIdx } as Phaser.Types.Animations.PlayAnimationConfig, true);
      }
      this.sprite.anims.timeScale = scale;
    } else {
      this.sprite.anims.stop();
      this.sprite.setTexture(this.texKey, this.validFrame(engine.frame));
    }
    useEngine.setState({ animKey: anim.key });
  }

  private applyManualFrame() {
    if (!this.texKey) return;
    this.sprite.anims.stop();
    this.sprite.setTexture(this.texKey, this.validFrame(useEngine.getState().frame));
  }

  private onFrameChange() {
    const idx = Number(this.sprite.frame.name);
    const anim = this.sprite.anims.currentAnim?.key ?? '';
    if (!Number.isNaN(idx)) useEngine.setState({ frame: idx, animKey: anim });
  }

  private applyTransform(s: LabState) {
    const t = s.transform;
    this.sprite.setOrigin(t.originX, t.originY);
    this.sprite.setScale(t.scaleX * this.dynX, t.scaleY * this.dynY);
    this.sprite.setAngle(t.angle);
    this.sprite.setAlpha(t.alpha);
    this.sprite.setFlip(t.flipX, t.flipY);
    this.sprite.setDepth(t.depth);
    this.sprite.setBlendMode(BLENDS[t.blend] ?? Phaser.BlendModes.NORMAL);
    if (t.tint && t.tint !== '#ffffff') {
      const color = parseInt(t.tint.replace('#', ''), 16);
      if (t.tintFill) this.sprite.setTintFill(color);
      else this.sprite.setTint(color);
    } else {
      this.sprite.clearTint();
    }
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (body) this.syncBody(s);
  }

  private syncBody(s: LabState) {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const hit = resolveHitbox(s);
    body.setSize(Math.max(1, hit.w), Math.max(1, hit.h), false);
    body.setOffset(hit.x, hit.y);
  }

  private applyHitbox(s: LabState) {
    this.syncBody(s);
  }

  private applyView(s: LabState) {
    const cam = this.cameras.main;
    cam.setZoom(this.fitZoom * s.view.zoom);
    cam.centerOn(this.focus.x, this.focus.y);
  }

  private applyMotion(s: LabState) {
    const m = s.motion;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (m.mode === 'physics') {
      body.enable = true;
      body.setBounce(m.bounce);
      body.setCollideWorldBounds(true);
      body.setGravityY(m.gravity);
      body.setVelocity(m.speed * 90, -Math.abs(m.gravity) * 0.5);
      this.trailPts = [];
    } else {
      body.enable = false;
      body.setGravityY(0);
      this.base = { x: 0, y: m.mode === 'keys' ? STAGE.h / 2 - 120 : 0 };
      this.sprite.setPosition(this.base.x, this.base.y);
      this.t = 0;
      this.trailPts = [];
    }
  }

  /* ------------------------------------------------------------------ *
   * State grid — every animation playing at once
   * ------------------------------------------------------------------ */

  private syncStates(s: LabState) {
    const on = s.view.showStates && !!this.texKey;
    this.sprite.setVisible(!on);
    this.handle.setVisible(!on);
    this.label.setVisible(!on);
    if (!on) {
      this.clones.forEach((c) => c.setVisible(false));
      this.cloneLabels.forEach((l) => l.setVisible(false));
      this.statesGfx.clear();
      return;
    }

    const anims = s.anims.slice(0, 12);
    while (this.clones.length < anims.length) {
      this.clones.push(this.add.sprite(0, 0, '__DEFAULT').setDepth(1));
      this.cloneLabels.push(
        this.add
          .text(0, 0, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '12px',
            color: '#a5f3fc',
            backgroundColor: 'rgba(2,6,23,0.75)',
            padding: { x: 5, y: 2 },
          })
          .setOrigin(0.5)
          .setDepth(3)
          .setResolution(2),
      );
    }

    const t = s.transform;
    const dw = s.asset.frameW * t.scaleX;
    const dh = s.asset.frameH * t.scaleY;
    const cols = Math.max(1, Math.ceil(Math.sqrt(anims.length)));
    const rows = Math.ceil(anims.length / cols);
    const cw = Math.max(150, dw + 70);
    const ch = Math.max(120, dh + 62);

    const gfx = this.statesGfx;
    gfx.clear();

    anims.forEach((a, i) => {
      const c = this.clones[i];
      const l = this.cloneLabels[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * cw;
      const y = (row - (rows - 1) / 2) * ch;
      const bg = Math.abs(x - cw / 2);
      const by = Math.abs(y - ch / 2);

      c.setVisible(true)
        .setTexture(this.texKey, this.validFrame(a.frames[0] ?? 0))
        .setOrigin(t.originX, t.originY)
        .setScale(t.scaleX, t.scaleY)
        .setAngle(t.angle)
        .setAlpha(t.alpha)
        .setFlip(t.flipX, t.flipY)
        .setDepth(t.depth)
        .setPosition(x, y);
      if (t.tint && t.tint !== '#ffffff') {
        const color = parseInt(t.tint.replace('#', ''), 16);
        if (t.tintFill) c.setTintFill(color);
        else c.setTint(color);
      } else c.clearTint();

      if (this.anims.exists(a.key)) {
        if (s.playback.playing) {
          c.play({ key: a.key } as Phaser.Types.Animations.PlayAnimationConfig, true);
          c.anims.timeScale = (a.frameRate / BASE_RATE) * s.playback.speed;
        } else {
          c.anims.stop();
          c.setTexture(this.texKey, this.validFrame(a.frames[0] ?? 0));
        }
      }

      l.setVisible(true)
        .setPosition(x, y + dh / 2 + 18)
        .setText(`${a.key}  ${a.frames.length}f @ ${a.frameRate}fps`)
        .setScale(1 / this.cameras.main.zoom);

      // cell frame + baseline
      gfx.lineStyle(1, 0x334155, 0.9);
      gfx.strokeRect(bg + 6, by + 6, cw - 12, ch - 12);
      gfx.lineStyle(1, 0x22d3ee, 0.35);
      gfx.lineBetween(bg + 14, y + dh / 2 + 4, bg + cw - 14, y + dh / 2 + 4);
    });

    for (let i = anims.length; i < this.clones.length; i++) {
      this.clones[i].setVisible(false);
      this.cloneLabels[i].setVisible(false);
    }
  }

  /* ------------------------------------------------------------------ *
   * Drawing
   * ------------------------------------------------------------------ */

  private drawGrid(s: LabState) {
    const g = this.grid;
    g.clear();
    if (s.view.showStage) {
      g.lineStyle(1, C.stage, 0.5);
      g.strokeRect(-STAGE.w / 2, -STAGE.h / 2, STAGE.w, STAGE.h);
    }
    if (s.view.bg === 'blueprint') {
      g.fillStyle(0x0b1a33, 1);
      g.fillRect(-STAGE.w / 2, -STAGE.h / 2, STAGE.w, STAGE.h);
    }
    if (s.view.showGrid) {
      const step = s.view.gridSize;
      const major = step * 4;
      for (let x = -STAGE.w / 2; x <= STAGE.w / 2 + 0.1; x += step) {
        const isMajor = Math.abs(x % major) < 0.001;
        g.lineStyle(1, isMajor ? C.gridMajor : C.grid, isMajor ? 0.9 : 0.5);
        g.lineBetween(x, -STAGE.h / 2, x, STAGE.h / 2);
      }
      for (let y = -STAGE.h / 2; y <= STAGE.h / 2 + 0.1; y += step) {
        const isMajor = Math.abs(y % major) < 0.001;
        g.lineStyle(1, isMajor ? C.gridMajor : C.grid, isMajor ? 0.9 : 0.5);
        g.lineBetween(-STAGE.w / 2, y, STAGE.w / 2, y);
      }
    }
    if (s.motion.mode === 'physics') {
      g.lineStyle(2, C.floor, 0.55);
      g.lineBetween(-STAGE.w / 2, STAGE.h / 2, STAGE.w / 2, STAGE.h / 2);
    }
    g.setDepth(-50);
  }

  private dashedRect(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    alpha: number,
    dash = 8,
    gap = 6,
  ) {
    g.lineStyle(1, color, alpha);
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      const len = Phaser.Math.Distance.Between(x0, y0, x1, y1);
      if (len < 1) return;
      const n = Math.max(1, Math.round(len / (dash + gap)));
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 0.55) / n;
        g.lineBetween(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1);
      }
    };
    seg(x, y, x + w, y);
    seg(x + w, y, x + w, y + h);
    seg(x + w, y + h, x, y + h);
    seg(x, y + h, x, y);
  }

  private drawOverlay(s: LabState) {
    const g = this.overlay;
    g.clear();
    if (!this.texKey) return;
    const t = s.transform;
    const fw = s.asset.frameW;
    const fh = s.asset.frameH;
    const sx = t.scaleX * this.dynX;
    const sy = t.scaleY * this.dynY;
    const x = this.sprite.x;
    const y = this.sprite.y;
    const hit = resolveHitbox(s);

    const toWorld = (u: number, v: number, scale = 1) => {
      const uu = t.flipX ? fw - u : u;
      const vv = t.flipY ? fh - v : v;
      return {
        x: x + (uu - t.originX * fw) * sx * scale,
        y: y + (vv - t.originY * fh) * sy * scale,
      };
    };
    const box = (p0: { x: number; y: number }, p1: { x: number; y: number }) => ({
      x: Math.min(p0.x, p1.x),
      y: Math.min(p0.y, p1.y),
      w: Math.abs(p1.x - p0.x),
      h: Math.abs(p1.y - p0.y),
    });

    // rendered size
    const disp = box(toWorld(0, 0), toWorld(fw, fh));
    // unscaled / natural size
    const nat = box(toWorld(0, 0, 1 / (sx || 1)), toWorld(fw, fh, 1 / (sy || 1)));

    if (s.view.showNatural) this.dashedRect(g, nat.x, nat.y, nat.w, nat.h, C.natural, 0.75, 7, 5);
    if (s.view.showBounds) this.dashedRect(g, disp.x, disp.y, disp.w, disp.h, C.display, 0.85, 10, 6);

    // alpha content bounds of the current frame
    const info = s.frames[this.validFrame(useEngine.getState().frame)];
    if (info?.bounds && (s.view.showBounds || s.view.onion)) {
      const b = info.bounds;
      const cb = box(toWorld(b.x, b.y), toWorld(b.x + b.w, b.y + b.h));
      this.dashedRect(g, cb.x, cb.y, cb.w, cb.h, C.content, 0.7, 5, 4);
    }

    // hitbox
    if (s.view.showHitbox) {
      const hb = box(toWorld(hit.x, hit.y), toWorld(hit.x + hit.w, hit.y + hit.h));
      g.fillStyle(C.hit, 0.12);
      g.fillRect(hb.x, hb.y, hb.w, hb.h);
      g.lineStyle(2, C.hit, 0.9);
      g.strokeRect(hb.x, hb.y, hb.w, hb.h);
      g.fillStyle(C.hit, 0.9);
      g.fillRect(hb.x - 1, hb.y - 1, 3, 3);
      g.fillRect(hb.x + hb.w - 1, hb.y - 1, 3, 3);
      g.fillRect(hb.x - 1, hb.y + hb.h - 1, 3, 3);
      g.fillRect(hb.x + hb.w - 1, hb.y + hb.h - 1, 3, 3);
    }

    // pivot
    if (s.view.showPivot) {
      const r = 9 / this.cameras.main.zoom;
      g.lineStyle(1.5, C.pivot, 0.9);
      g.lineBetween(x - r, y, x + r, y);
      g.lineBetween(x, y - r, x, y + r);
      g.strokeCircle(x, y, 3 / this.cameras.main.zoom);
      g.fillStyle(0xef4444, 1);
      g.fillRect(x - 1, y - 1, 2, 2);
    }

    this.label.setPosition(disp.x + disp.w / 2, disp.y - 10 / this.cameras.main.zoom);
    this.label.setText(
      `frame ${this.validFrame(useEngine.getState().frame)}/${this.frameCount()}  ·  ${fw}×${fh} → ${Math.round(
        disp.w,
      )}×${Math.round(disp.h)}px  ·  ${(disp.w / Math.max(1, disp.h)).toFixed(2)}:1`,
    );
    this.label.setScale(1 / this.cameras.main.zoom);
    this.label.setVisible(s.view.showNatural || s.view.showBounds);
  }

  private updateGhosts(s: LabState) {
    const anim = s.anims.find((a) => a.id === s.playback.animId);
    const list = anim?.frames ?? [];
    const cur = this.validFrame(useEngine.getState().frame);
    this.ghosts.forEach((gh, i) => {
      const back = i + 1;
      let idx = -1;
      if (list.length) {
        const pos = list.indexOf(cur);
        idx = list[(pos - back + list.length * 2) % list.length];
      } else {
        idx = this.validFrame(cur - back);
      }
      const show = s.view.onion && back <= s.view.onionCount && idx >= 0;
      gh.setVisible(show);
      if (!show) return;
      gh.setTexture(this.texKey, idx);
      gh.setOrigin(s.transform.originX, s.transform.originY);
      gh.setScale(this.sprite.scaleX, this.sprite.scaleY);
      gh.setFlip(s.transform.flipX, s.transform.flipY);
      gh.setAngle(s.transform.angle);
      gh.setDepth(this.sprite.depth - 1);
      const dir = s.transform.flipX ? -1 : 1;
      gh.setPosition(this.sprite.x - s.view.onionOffset * back * dir, this.sprite.y);
      gh.setAlpha(0.34 / back);
      gh.setTint(back % 2 === 0 ? 0xf472b6 : 0x38bdf8);
    });
  }

  private updateTrails(s: LabState) {
    const g = this.trails;
    g.clear();
    if (!s.view.trail || !this.trailPts.length) return;
    const n = this.trailPts.length;
    this.trailPts.forEach((p, i) => {
      const a = (i + 1) / n;
      g.fillStyle(0x22d3ee, a * 0.5);
      g.fillCircle(p.x, p.y, 2 + a * 3);
    });
  }

  /* ------------------------------------------------------------------ *
   * Main loop
   * ------------------------------------------------------------------ */

  update(_time: number, delta: number) {
    const s = useLab.getState();
    const dt = Math.min(delta, 50) / 1000;

    // fps meter
    this.fpsAcc += delta;
    this.fpsCount++;
    this.fpsClock += delta;
    if (this.fpsClock > 400) {
      useEngine.setState({ fps: Math.round(1000 / (this.fpsAcc / this.fpsCount)) });
      this.fpsAcc = 0;
      this.fpsCount = 0;
      this.fpsClock = 0;
    }

    if (s.asset.url) {
      this.stepMotion(s, dt);
      if (!s.view.showStates) {
        this.updateGhosts(s);
        this.drawOverlay(s);
        this.updateTrails(s);
        this.handle.setPosition(this.sprite.x, this.sprite.y);
      }
    }

    const eng = useEngine.getState();
    if (
      Math.abs(eng.displayW - this.sprite.displayWidth) > 0.5 ||
      Math.abs(eng.displayH - this.sprite.displayHeight) > 0.5 ||
      Math.abs(eng.x - this.sprite.x) > 0.5 ||
      Math.abs(eng.y - this.sprite.y) > 0.5
    ) {
      useEngine.setState({
        displayW: this.sprite.displayWidth,
        displayH: this.sprite.displayHeight,
        x: this.sprite.x,
        y: this.sprite.y,
      });
    }
  }

  private stepMotion(s: LabState, dt: number) {
    const m = s.motion;
    this.t += dt * m.speed;
    // squash easing
    this.dynX += (this.dynTX - this.dynX) * Math.min(1, dt * 16);
    this.dynY += (this.dynTY - this.dynY) * Math.min(1, dt * 16);
    if (Math.abs(this.dynX - this.dynTX) < 0.001) {
      this.dynTX = 1;
      this.dynTY = 1;
    }

    let flipX = s.transform.flipX;
    const sp = m.speed * 150;
    let x = this.base.x;
    let y = this.base.y;

    switch (m.mode) {
      case 'patrol': {
        x += Math.sin(this.t) * m.distance;
        if (m.autoFlip) flipX = Math.cos(this.t) < 0;
        break;
      }
      case 'bob': {
        y -= Math.abs(Math.sin(this.t)) * m.distance * 0.35;
        this.dynTY = 1 - Math.abs(Math.cos(this.t)) * 0.06;
        this.dynTX = 1 + Math.abs(Math.cos(this.t)) * 0.06;
        break;
      }
      case 'jump': {
        const p = this.t % 1;
        y -= Math.sin(Math.PI * p) * m.distance;
        this.dynTX = 1 + Math.sin(Math.PI * p) * 0.12;
        this.dynTY = 1 - Math.sin(Math.PI * p) * 0.14;
        break;
      }
      case 'orbit': {
        x += Math.cos(this.t) * m.distance * 0.6;
        y += Math.sin(this.t * 2) * m.distance * 0.18;
        flipX = m.autoFlip ? Math.sin(this.t) < 0 : flipX;
        break;
      }
      case 'keys': {
        if (this.keys.A?.isDown || this.keys.LEFT?.isDown) x -= sp * dt;
        if (this.keys.D?.isDown || this.keys.RIGHT?.isDown) x += sp * dt;
        if (this.keys.W?.isDown || this.keys.UP?.isDown) y -= sp * dt;
        if (this.keys.S?.isDown || this.keys.DOWN?.isDown) y += sp * dt;
        x = Phaser.Math.Clamp(x, -STAGE.w / 2 + 40, STAGE.w / 2 - 40);
        y = Phaser.Math.Clamp(y, -STAGE.h / 2 + 40, STAGE.h / 2 - 40);
        if (m.autoFlip) {
          const lastX = this.sprite.x;
          if (Math.abs(x - lastX) > 0.1) flipX = x < lastX;
        }
        break;
      }
      case 'physics': {
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        if (this.keys.A?.isDown || this.keys.LEFT?.isDown) body.setVelocityX(-sp);
        if (this.keys.D?.isDown || this.keys.RIGHT?.isDown) body.setVelocityX(sp);
        if (this.keys.W?.isDown || this.keys.UP?.isDown) y -= 0;
        if (m.autoFlip && Math.abs(body.velocity.x) > 5) flipX = body.velocity.x < 0;
        break;
      }
      default:
        break;
    }

    if (flipX !== this.sprite.flipX) this.sprite.setFlipX(flipX);
    if (m.mode !== 'physics') this.sprite.setPosition(x, y);

    // keep scale in sync with squash dynamics
    const t = s.transform;
    this.sprite.setScale(t.scaleX * this.dynX, t.scaleY * this.dynY);

    // trails
    this.trailTimer += dt;
    if (s.view.trail && this.trailTimer > 0.05) {
      this.trailTimer = 0;
      this.trailPts.push({ x: this.sprite.x, y: this.sprite.y });
      if (this.trailPts.length > 36) this.trailPts.shift();
    }
  }
}

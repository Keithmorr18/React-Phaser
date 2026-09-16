import Phaser from "phaser";
import { isTypingTarget, labBridge } from "./bridge";
import type { AnimationDef, FrameRect, PreviewConfig } from "../lab/types";

const TEX = "lab-sheet";

export class LabScene extends Phaser.Scene {
  private sprite?: Phaser.GameObjects.Sprite;
  private ghosts: Phaser.GameObjects.Sprite[] = [];
  private compares: Phaser.GameObjects.Sprite[] = [];
  private overlay!: Phaser.GameObjects.Graphics;
  private uiGfx!: Phaser.GameObjects.Graphics;
  private checkers?: Phaser.GameObjects.TileSprite;
  private ground?: Phaser.GameObjects.Rectangle;
  private platforms?: Phaser.Physics.Arcade.StaticGroup;
  private platformRects: Phaser.GameObjects.Rectangle[] = [];
  private createdAnimKeys: string[] = [];
  private shadow?: Phaser.GameObjects.Ellipse;
  private hint?: Phaser.GameObjects.Text;
  private appliedKey = "";
  private appliedSlice = "";
  private appliedAnims = "";
  private appliedBg = "";
  private busy = false;
  private busyUntil = 0;
  private lastLive = "";
  private wasStudio = true;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private worldW = 1600;
  private worldH = 720;

  constructor() {
    super({ key: "LabScene" });
  }

  create() {
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.makeCheckers();
    this.platforms = this.physics.add.staticGroup();
    this.ground = this.add.rectangle(this.worldW / 2, this.worldH - 36, this.worldW, 72, 0x1b2230, 1);
    this.physics.add.existing(this.ground, true);
    this.platforms.add(this.ground);
    const p1 = this.add.rectangle(520, 520, 220, 18, 0x243044);
    const p2 = this.add.rectangle(860, 410, 180, 18, 0x243044);
    const p3 = this.add.rectangle(1180, 470, 200, 18, 0x243044);
    this.platformRects = [p1, p2, p3];
    this.platformRects.forEach((p) => {
      this.physics.add.existing(p, true);
      this.platforms!.add(p);
    });

    this.overlay = this.add.graphics().setDepth(20);
    this.uiGfx = this.add.graphics().setDepth(25);
    this.shadow = this.add.ellipse(0, 0, 28, 8, 0x000000, 0.35).setDepth(1);
    this.hint = this.add
      .text(16, 16, "", {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "11px",
        color: "#9aa6b8",
      })
      .setScrollFactor(0)
      .setDepth(40);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("W,A,S,D,SHIFT,SPACE,J,K,F,R") as Record<
        string,
        Phaser.Input.Keyboard.Key
      >;
    }

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const s = labBridge.get();
      if (!s.preview.studioMode || !this.sprite) return;
      if (pointer.rightButtonDown()) return;
    });
  }

  update(time: number) {
    const s = labBridge.get();
    this.applyBackground(s.preview);
    this.rebuildIfNeeded(s.asset?.id ?? "", s.slice, s.frames, s.image);
    this.rebuildAnims(s.animations);
    this.syncSprite(s);
    this.runMode(s, time);
    this.drawOverlays(s);
    this.syncLive(s);
  }

  private makeCheckers() {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x12151d, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x191d28, 1);
    g.fillRect(0, 0, 16, 16);
    g.fillRect(16, 16, 16, 16);
    g.generateTexture("checkers", 32, 32);
    g.destroy();
    this.checkers = this.add.tileSprite(0, 0, this.worldW, this.worldH, "checkers").setOrigin(0).setDepth(0);
  }

  private applyBackground(preview: PreviewConfig) {
    if (this.appliedBg === preview.background) {
      this.checkers && (this.checkers.visible = preview.background === "checkers");
      return;
    }
    this.appliedBg = preview.background;
    const cam = this.cameras.main;
    const map: Record<PreviewConfig["background"], number> = {
      checkers: 0x12151d,
      dark: 0x0b0d12,
      magenta: 0xff00ff,
      green: 0x00ff00,
      dungeon: 0x10141c,
      sky: 0x87b6d9,
      dojo: 0x1a1410,
    };
    cam.setBackgroundColor(map[preview.background]);
    if (this.checkers) this.checkers.visible = preview.background === "checkers";
    if (this.ground) {
      const gcol: Record<string, number> = {
        dungeon: 0x1b2230,
        sky: 0x6d9a58,
        dojo: 0x3a2a1c,
        magenta: 0x990099,
        green: 0x009900,
        dark: 0x151820,
        checkers: 0x1b2230,
      };
      this.ground.fillColor = gcol[preview.background] ?? 0x1b2230;
    }
  }

  private rebuildIfNeeded(
    assetId: string,
    slice: LabSnapshotSlice,
    frames: FrameRect[],
    image: HTMLImageElement | null,
  ) {
    const sliceKey = JSON.stringify(slice);
    const ready = Boolean(image && image.complete && image.naturalWidth > 0 && frames.length);
    if (this.appliedKey === assetId && this.appliedSlice === sliceKey && ready === Boolean(this.sprite)) return;
    this.appliedKey = assetId;
    this.appliedSlice = sliceKey;
    this.appliedAnims = "";

    this.sprite?.destroy();
    this.sprite = undefined;
    this.ghosts.forEach((g) => g.destroy());
    this.ghosts = [];
    this.compares.forEach((g) => g.destroy());
    this.compares = [];

    if (this.textures.exists(TEX)) this.textures.remove(TEX);
    if (!ready || !image) return;

    const tex = this.textures.addImage(TEX, image);
    if (!tex) return;
    frames.forEach((f) => {
      if (!tex.has(String(f.index))) tex.add(String(f.index), 0, f.x, f.y, f.w, f.h);
    });

    const cx = this.worldW / 2;
    const cy = this.worldH / 2 + 40;
    this.sprite = this.physics.add.sprite(cx, cy, TEX, "0");
    this.sprite.setDepth(10);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    if (this.platforms) this.physics.add.collider(this.sprite, this.platforms);

    for (let i = 0; i < 4; i++) {
      const g = this.add.sprite(cx, cy, TEX, "0").setDepth(8).setAlpha(0.28);
      this.ghosts.push(g);
    }
    [1, 2, 4].forEach((sc) => {
      const c = this.add.sprite(cx, cy, TEX, "0").setDepth(9).setVisible(false);
      c.setData("mul", sc);
      this.compares.push(c);
    });
  }

  private rebuildAnims(anims: AnimationDef[]) {
    const key = JSON.stringify(
      anims.map((a) => ({ k: a.key, f: a.frames, r: a.frameRate, p: a.repeat, y: a.yoyo, d: a.delay })),
    );
    if (key === this.appliedAnims) return;
    this.appliedAnims = key;
    this.createdAnimKeys.forEach((k) => {
      if (this.anims.exists(k)) this.anims.remove(k);
    });
    this.createdAnimKeys = [];
    anims.forEach((a) => {
      if (!a.frames.length) return;
      this.anims.create({
        key: a.key,
        frames: a.frames.map((f) => ({ key: TEX, frame: String(f) })),
        frameRate: Math.max(1, a.frameRate),
        repeat: a.repeat,
        yoyo: a.yoyo,
        delay: a.delay,
      });
      this.createdAnimKeys.push(a.key);
    });
  }

  private syncSprite(s: ReturnType<typeof labBridge.get>) {
    const sprite = this.sprite;
    if (!sprite) return;
    const p = s.preview;
    sprite.setOrigin(p.originX, p.originY);
    sprite.setScale(p.scale);
    sprite.setFlip(p.flipX, p.flipY);
    sprite.setAngle(p.rotation);
    sprite.setAlpha(p.alpha);
    sprite.setTint(Number.parseInt(p.tint.replace("#", ""), 16) || 0xffffff);
    const body = sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setSize(Math.max(2, s.hitbox.w), Math.max(2, s.hitbox.h));
      body.setOffset(s.hitbox.x, s.hitbox.y);
    }
    this.ghosts.forEach((g) => {
      g.setOrigin(p.originX, p.originY);
      g.setScale(p.scale);
      g.setVisible(Boolean(p.showOnion && p.studioMode));
    });
    this.compares.forEach((c) => {
      c.setOrigin(p.originX, p.originY);
      c.setVisible(Boolean(p.showScaleCompare && p.studioMode));
    });
    if (this.shadow) this.shadow.setVisible(p.showShadow);
  }

  private runMode(s: ReturnType<typeof labBridge.get>, time: number) {
    const sprite = this.sprite;
    if (!sprite) return;
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    const p = s.preview;
    this.cameras.main.setZoom(p.cameraZoom);

    if (p.studioMode) {
      this.wasStudio = true;
      body.allowGravity = false;
      body.setVelocity(0, 0);
      const cx = this.worldW / 2;
      const cy = this.worldH / 2 + 80;
      sprite.setPosition(cx, cy);
      this.cameras.main.stopFollow();
      this.cameras.main.centerOn(cx, cy - 20);
      this.playStudio(s);
      this.layoutCompare(s, cx, cy);
      this.layoutOnion(s);
      if (this.ground) this.ground.setVisible(false);
      this.platformRects.forEach((ch) => ch.setVisible(false));
      if (this.hint) {
        this.hint.setText("ESTUDIO  ·  linha do tempo controla a animacao");
      }
      if (this.shadow) {
        this.shadow.setPosition(sprite.x, sprite.y + 4);
        this.shadow.setDisplaySize(Math.max(12, sprite.displayWidth * 0.55), 8);
      }
      return;
    }

    if (this.ground) this.ground.setVisible(true);
    this.platformRects.forEach((ch) => ch.setVisible(true));
    if (this.wasStudio) {
      sprite.setPosition(180, this.worldH - 140);
      body.setVelocity(0, 0);
    }
    this.wasStudio = false;
    body.allowGravity = true;
    this.physics.world.gravity.y = s.movement.gravity;
    this.cameras.main.startFollow(sprite, true, 0.12, 0.12);
    this.handlePlayground(s, time);
    if (this.hint) {
      this.hint.setText("ARENA  ·  WASD / setas  ·  Shift correr  ·  Espaco pular  ·  J atacar  ·  K magia  ·  S agachar");
    }
    if (this.shadow) {
      this.shadow.setPosition(sprite.x, sprite.y + 2);
      this.shadow.setDisplaySize(Math.max(12, sprite.displayWidth * 0.5), 7);
    }
  }

  private playStudio(s: ReturnType<typeof labBridge.get>) {
    const sprite = this.sprite;
    if (!sprite) return;
    const anim = s.animations.find((a) => a.id === s.activeAnimId);
    if (!anim || !anim.frames.length) {
      if (s.selectedFrames.length) sprite.setFrame(String(s.selectedFrames[0]));
      else if (s.frames[0]) sprite.setFrame("0");
      sprite.anims.stop();
      return;
    }
    if (!s.playback.playing) {
      sprite.anims.stop();
      const f = anim.frames[Math.min(s.playback.currentFrame, anim.frames.length - 1)];
      sprite.setFrame(String(f));
      this.anims.globalTimeScale = 1;
      return;
    }
    this.anims.globalTimeScale = s.playback.speed;
    if (sprite.anims.currentAnim?.key !== anim.key || !sprite.anims.isPlaying) {
      sprite.play(anim.key, true);
    }
  }

  private layoutOnion(s: ReturnType<typeof labBridge.get>) {
    if (!s.preview.showOnion || !this.sprite) return;
    const anim = s.animations.find((a) => a.id === s.activeAnimId);
    if (!anim || anim.frames.length < 2) return;
    const idx = anim.frames.indexOf(Number(this.sprite.frame.name));
    const cur = idx >= 0 ? idx : 0;
    const prev = anim.frames[(cur - 1 + anim.frames.length) % anim.frames.length];
    const next = anim.frames[(cur + 1) % anim.frames.length];
    const prev2 = anim.frames[(cur - 2 + anim.frames.length) % anim.frames.length];
    const next2 = anim.frames[(cur + 2) % anim.frames.length];
    const seq = [prev2, prev, next, next2];
    this.ghosts.forEach((g, i) => {
      g.setPosition(this.sprite!.x, this.sprite!.y);
      g.setFrame(String(seq[i] ?? anim.frames[0]));
      g.setTint(i < 2 ? 0x22d3ee : 0xf472b6);
      g.setAlpha(i === 1 || i === 2 ? 0.32 : 0.14);
      g.setFlip(s.preview.flipX, s.preview.flipY);
    });
  }

  private layoutCompare(s: ReturnType<typeof labBridge.get>, cx: number, cy: number) {
    if (!s.preview.showScaleCompare || !this.sprite) return;
    const frame = this.sprite.frame.name;
    const offsets = [-180, 0, 200];
    this.compares.forEach((c, i) => {
      const mul = c.getData("mul") as number;
      c.setFrame(frame);
      c.setScale(mul);
      c.setPosition(cx + offsets[i], cy);
      c.setFlip(s.preview.flipX, s.preview.flipY);
      c.setAlpha(i === 1 ? 0 : 0.95);
      c.setVisible(i !== 1);
    });
  }

  private handlePlayground(s: ReturnType<typeof labBridge.get>, time: number) {
    const sprite = this.sprite!;
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    if (isTypingTarget() || !this.cursors || !this.keys) return;

    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    const run = this.keys.SHIFT.isDown;
    const attack = Phaser.Input.Keyboard.JustDown(this.keys.J);
    const cast = Phaser.Input.Keyboard.JustDown(this.keys.K);

    const onFloor = body.blocked.down || body.touching.down;
    let vx = 0;
    const spd = s.movement.speed * (run ? s.movement.runMultiplier : 1);
    if (left) vx -= spd;
    if (right) vx += spd;
    if (!onFloor) vx *= s.movement.airControl;
    if (down && onFloor) vx *= 0.35;
    body.setVelocityX(vx);
    if (vx < -8) sprite.setFlipX(true);
    if (vx > 8) sprite.setFlipX(false);

    if (jump && onFloor && !this.busy) body.setVelocityY(-s.movement.jumpForce);

    if (attack && !this.busy) this.trigger("attack", s, time);
    if (cast && !this.busy) this.trigger("cast", s, time);

    if (this.busy) {
      if (time > this.busyUntil) this.busy = false;
      return;
    }

    const keys = s.animations.map((a) => a.key);
    const play = (k: string) => {
      if (!keys.includes(k) || sprite.anims.currentAnim?.key === k) return;
      sprite.play(k, true);
    };

    if (!onFloor && body.velocity.y < -40) play("jump");
    else if (!onFloor) play("fall");
    else if (down) play("crouch");
    else if (Math.abs(body.velocity.x) > s.movement.speed * 1.15) play("run");
    else if (Math.abs(body.velocity.x) > 12) play("walk");
    else play("idle");
  }

  private trigger(kind: string, s: ReturnType<typeof labBridge.get>, time: number) {
    const anim = s.animations.find((a) => a.key === kind);
    if (!anim || !this.sprite) return;
    this.busy = true;
    const dur = (anim.frames.length / Math.max(1, anim.frameRate)) * 1000 + 40;
    this.busyUntil = time + dur;
    this.sprite.play(kind, true);
  }

  private drawOverlays(s: ReturnType<typeof labBridge.get>) {
    const g = this.overlay;
    g.clear();
    const sprite = this.sprite;
    if (!sprite) return;
    const p = s.preview;
    const cam = this.cameras.main;

    if (p.showGrid && p.studioMode) {
      const tile = Math.max(4, p.tileSize);
      g.lineStyle(1, 0xffffff, 0.07);
      const x0 = Math.floor((cam.scrollX - 40) / tile) * tile;
      const y0 = Math.floor((cam.scrollY - 40) / tile) * tile;
      for (let x = x0; x < cam.scrollX + this.scale.width / cam.zoom + 80; x += tile) {
        g.lineBetween(x, cam.scrollY - 40, x, cam.scrollY + this.scale.height / cam.zoom + 40);
      }
      for (let y = y0; y < cam.scrollY + this.scale.height / cam.zoom + 80; y += tile) {
        g.lineBetween(cam.scrollX - 40, y, cam.scrollX + this.scale.width / cam.zoom + 40, y);
      }
    }

    if (p.showBounds) {
      g.lineStyle(1, 0xfbbf24, 0.9);
      g.strokeRect(sprite.getBounds().x, sprite.getBounds().y, sprite.displayWidth, sprite.displayHeight);
    }

    if (p.showHitbox) {
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      g.lineStyle(1, 0x22d3ee, 1);
      g.fillStyle(0x22d3ee, 0.12);
      g.fillRect(body.x, body.y, body.width, body.height);
      g.strokeRect(body.x, body.y, body.width, body.height);
    }

    if (p.studioMode) {
      g.lineStyle(1, 0xffffff, 0.12);
      g.lineBetween(sprite.x - 90, sprite.y, sprite.x + 90, sprite.y);
    }

    if (p.showOrigin) {
      const ox = sprite.x;
      const oy = sprite.y;
      g.lineStyle(1, 0xf472b6, 1);
      g.lineBetween(ox - 12, oy, ox + 12, oy);
      g.lineBetween(ox, oy - 12, ox, oy + 12);
      g.fillStyle(0xf472b6, 1);
      g.fillCircle(ox, oy, 2);
    }

    this.uiGfx.clear();
    if (p.showRulers && p.studioMode) {
      const b = sprite.getBounds();
      this.uiGfx.lineStyle(1, 0xa78bfa, 0.8);
      this.uiGfx.lineBetween(b.x, b.y - 18, b.x + b.width, b.y - 18);
      this.uiGfx.fillStyle(0xa78bfa, 1);
      this.uiGfx.fillRect(b.x, b.y - 20, 2, 4);
      this.uiGfx.fillRect(b.x + b.width - 2, b.y - 20, 2, 4);
      this.uiGfx.lineBetween(b.x - 18, b.y, b.x - 18, b.y + b.height);
    }
  }

  private syncLive(s: ReturnType<typeof labBridge.get>) {
    const sprite = this.sprite;
    const key = sprite?.anims.currentAnim?.key ?? (s.animations.find((a) => a.id === s.activeAnimId)?.key ?? "—");
    const frameName = sprite ? Number(sprite.frame.name) : 0;
    const sig = `${key}:${frameName}`;
    if (sig !== this.lastLive) {
      this.lastLive = sig;
      s.onLive(key, Number.isFinite(frameName) ? frameName : 0);
    }
  }
}

type LabSnapshotSlice = ReturnType<typeof labBridge.get>["slice"];

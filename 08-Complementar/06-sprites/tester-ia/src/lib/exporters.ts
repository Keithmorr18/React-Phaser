import { resolveHitbox, type LabState } from '../store';

const pad = (s: string) => s.padEnd(0);

export function buildExportPayload(s: LabState) {
  const hit = resolveHitbox(s);
  const payload: Record<string, unknown> = {
    meta: {
      app: 'SpriteLab',
      format: 'spritelab.animation',
      version: 1,
      exportedAt: new Date().toISOString(),
      image: s.asset.name,
      imageWidth: s.asset.width,
      imageHeight: s.asset.height,
      frameWidth: s.asset.frameW,
      frameHeight: s.asset.frameH,
      margin: s.asset.margin,
      spacing: s.asset.spacing,
      frameCount: s.frames.length,
    },
    sprite: {
      origin: { x: s.transform.originX, y: s.transform.originY },
      scale: { x: s.transform.scaleX, y: s.transform.scaleY },
      angle: s.transform.angle,
      alpha: s.transform.alpha,
      tint: s.transform.tint === '#ffffff' ? null : s.transform.tint,
      tintFill: s.transform.tintFill,
      blendMode: s.transform.blend,
      flipX: s.transform.flipX,
      flipY: s.transform.flipY,
      depth: s.transform.depth,
      pixelArt: true,
      displaySize: {
        w: Math.round(s.asset.frameW * s.transform.scaleX),
        h: Math.round(s.asset.frameH * s.transform.scaleY),
      },
    },
    hitbox: {
      auto: s.hitbox.auto,
      x: Math.round(hit.x),
      y: Math.round(hit.y),
      w: Math.round(hit.w),
      h: Math.round(hit.h),
      note: 'coordenadas relativas ao canto superior-esquerdo do frame (pixels de origem)',
    },
    anims: s.anims.map((a) => ({
      key: a.key,
      frames: a.frames,
      frameRate: a.frameRate,
      duration: a.frameRate > 0 ? Math.round((a.frames.length / a.frameRate) * 1000) : 0,
      repeat: a.repeat,
      loop: a.repeat === -1,
      yoyo: a.yoyo,
      hideOnComplete: a.hideOnComplete,
      msPerFrame: a.frameRate > 0 ? Math.round(1000 / a.frameRate) : 0,
    })),
  };

  if (s.exportOpts.includeFrames) {
    payload.frames = s.frames.map((f) => ({
      index: f.index,
      rect: f.rect,
      bounds: f.bounds,
      coverage: +(f.coverage * 100).toFixed(1),
    }));
  }
  if (s.exportOpts.includeMotion) {
    payload.motion = {
      mode: s.motion.mode,
      speed: s.motion.speed,
      distance: s.motion.distance,
      gravity: s.motion.gravity,
      bounce: s.motion.bounce,
      autoFlip: s.motion.autoFlip,
    };
  }
  if (s.exportOpts.embedImage) {
    payload.imageData = s.asset.url.startsWith('data:') ? s.asset.url : null;
  }
  return payload;
}

export function buildPhaserCode(s: LabState) {
  const key = (s.asset.name.replace(/\.[a-z0-9]+$/i, '') || 'sprite').replace(/[^a-zA-Z0-9_-]/g, '-');
  const t = s.transform;
  const hit = resolveHitbox(s);
  const lines: string[] = [];
  lines.push(`// ─────────────────────────────────────────────`);
  lines.push(`// SpriteLab export → Phaser 3 (${new Date().toLocaleDateString()})`);
  lines.push(`// ─────────────────────────────────────────────`);
  lines.push(`const KEY = '${key}';`);
  lines.push('');
  lines.push(`export function preload(scene) {`);
  lines.push(
    `  scene.load.spritesheet(KEY, 'assets/${s.asset.name}', { frameWidth: ${s.asset.frameW}, frameHeight: ${s.asset.frameH}, margin: ${s.asset.margin}, spacing: ${s.asset.spacing} });`,
  );
  lines.push(`}`);
  lines.push('');
  lines.push(`export function create(scene, x = 400, y = 300) {`);
  if (s.anims.length) {
    lines.push(`  // animações`);
    for (const a of s.anims) {
      lines.push(`  scene.anims.create({`);
      lines.push(`    key: '${a.key}',`);
      lines.push(`    frames: scene.anims.generateFrameNumbers(KEY, { frames: [${a.frames.join(', ')}] }),`);
      lines.push(`    frameRate: ${a.frameRate},`);
      if (a.repeat !== 0) lines.push(`    repeat: ${a.repeat},`);
      if (a.yoyo) lines.push(`    yoyo: true,`);
      if (a.hideOnComplete) lines.push(`    hideOnComplete: true,`);
      lines.push(`  });`);
    }
    lines.push('');
  }
  lines.push(`  const sprite = scene.add.sprite(x, y, KEY, ${s.anims[0]?.frames[0] ?? 0});`);
  lines.push(`  sprite.setOrigin(${t.originX}, ${t.originY});`);
  if (t.scaleX !== 1 || t.scaleY !== 1) lines.push(`  sprite.setScale(${t.scaleX}, ${t.scaleY});`);
  if (t.angle) lines.push(`  sprite.setAngle(${t.angle});`);
  if (t.alpha !== 1) lines.push(`  sprite.setAlpha(${t.alpha});`);
  if (t.blend !== 'NORMAL') lines.push(`  sprite.setBlendMode(Phaser.BlendModes.${t.blend});`);
  if (t.tint !== '#ffffff') lines.push(`  sprite.${t.tintFill ? 'setTintFill' : 'setTint'}(0x${t.tint.replace('#', '')});`);
  if (t.depth) lines.push(`  sprite.setDepth(${t.depth});`);
  lines.push(`  sprite.setFlipX(${t.flipX});`);
  lines.push(`  sprite.setFlipY(${t.flipY});`);
  lines.push('');
  lines.push(`  // hitbox (offset relativo ao frame)`);
  lines.push(`  scene.physics.add.existing(sprite);`);
  lines.push(`  sprite.body.setSize(${Math.round(hit.w)}, ${Math.round(hit.h)}, false);`);
  lines.push(`  sprite.body.setOffset(${Math.round(hit.x)}, ${Math.round(hit.y)});`);
  lines.push('');
  if (s.anims.length) lines.push(`  sprite.play('${s.anims[0].key}');`);
  lines.push('');
  lines.push(`  return sprite;`);
  lines.push(`}`);
  lines.push('');
  lines.push(`// ─── Motion preset: ${s.motion.mode} ───`);
  lines.push(motionSnippet(s.motion.mode, s.motion));
  return lines.join('\n');
}

function motionSnippet(mode: string, m: { speed: number; distance: number; gravity: number; bounce: number }) {
  switch (mode) {
    case 'patrol':
      return `scene.tweens.add({ targets: sprite, x: '+= ${m.distance}', duration: ${Math.round(1000 / Math.max(0.1, m.speed))}, yoyo: true, repeat: -1, ease: 'Sine.inOut', onYoyo: () => sprite.setFlipX(true), onRepeat: () => sprite.setFlipX(false) });`;
    case 'bob':
      return `scene.tweens.add({ targets: sprite, y: '+= ${Math.round(m.distance / 4)}', duration: ${Math.round(500 / Math.max(0.1, m.speed))}, yoyo: true, repeat: -1, ease: 'Sine.inOut' });`;
    case 'jump':
      return `scene.tweens.add({ targets: sprite, y: '-= ${m.distance}', duration: ${Math.round(600 / Math.max(0.1, m.speed))}, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });`;
    case 'orbit':
      return `scene.tweens.add({ targets: sprite, angle: 360, duration: ${Math.round(2000 / Math.max(0.1, m.speed))}, repeat: -1 });`;
    case 'keys':
      return `const cursors = scene.input.keyboard.createCursorKeys();\nscene.events.on('update', () => {\n  if (cursors.left.isDown) sprite.setVelocityX(-${Math.round(m.speed * 100)});\n  else if (cursors.right.isDown) sprite.setVelocityX(${Math.round(m.speed * 100)});\n  if (cursors.up.isDown && sprite.body.blocked.down) sprite.setVelocityY(-${m.gravity});\n});`;
    case 'physics':
      return `sprite.body.setGravityY(${m.gravity});\nsprite.body.setBounce(${m.bounce});\nsprite.body.setCollideWorldBounds(true);`;
    default:
      return `// sprite estático — apenas animação`;
  }
}

export function buildReport(s: LabState) {
  const hit = resolveHitbox(s);
  const rows = [
    ['Sheet', `${s.asset.width} × ${s.asset.height} px`],
    ['Frame', `${s.asset.frameW} × ${s.asset.frameH} px`],
    ['Frames', `${s.frames.length}`],
    ['Proporção', (s.asset.frameW / Math.max(1, s.asset.frameH)).toFixed(2) + ':1'],
    ['Escala', `${s.transform.scaleX} × ${s.transform.scaleY}`],
    [
      'Tamanho final',
      `${Math.round(s.asset.frameW * s.transform.scaleX)} × ${Math.round(s.asset.frameH * s.transform.scaleY)} px`,
    ],
    ['Origem', `${s.transform.originX.toFixed(2)} / ${s.transform.originY.toFixed(2)}`],
    ['Hitbox', `${Math.round(hit.w)} × ${Math.round(hit.h)} @ ${Math.round(hit.x)},${Math.round(hit.y)}`],
    ['Animações', `${s.anims.length}`],
  ];
  pad;
  return rows;
}

export function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

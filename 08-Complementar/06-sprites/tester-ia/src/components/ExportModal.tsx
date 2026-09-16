import { useMemo, useRef, useState } from 'react';
import { useLab } from '../store';
import type { AssetState } from '../types';
import { buildExportPayload, buildPhaserCode, buildReport, copyText, downloadText } from '../lib/exporters';
import { Btn, Toggle } from './ui';
import { cn } from '../utils/cn';

const uid = () => Math.random().toString(36).slice(2, 9);

export function ExportModal({ onClose }: { onClose: () => void }) {
  const lab = useLab();
  const [tab, setTab] = useState<'json' | 'code' | 'report'>('json');
  const [copied, setCopied] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const json = useMemo(() => JSON.stringify(buildExportPayload(lab), null, 2), [lab]);
  const code = useMemo(() => buildPhaserCode(lab), [lab]);
  const text = tab === 'code' ? code : json;
  const name = (lab.asset.name.replace(/\.[a-z0-9]+$/i, '') || 'sprite').replace(/[^a-zA-Z0-9_-]/g, '-');

  const doCopy = async () => {
    await copyText(text);
    setCopied(tab);
    setTimeout(() => setCopied(''), 1400);
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const meta = data.meta ?? {};
      const s = useLab.getState();
      const asset: AssetState = data.imageData
        ? {
            name: meta.image ?? 'importado.png',
            url: data.imageData,
            width: meta.imageWidth ?? 0,
            height: meta.imageHeight ?? 0,
            frameW: meta.frameWidth ?? 32,
            frameH: meta.frameHeight ?? 32,
            margin: meta.margin ?? 0,
            spacing: meta.spacing ?? 0,
            source: 'json',
            rev: 0,
          }
        : {
            ...s.asset,
            frameW: meta.frameWidth ?? s.asset.frameW,
            frameH: meta.frameHeight ?? s.asset.frameH,
            margin: meta.margin ?? 0,
            spacing: meta.spacing ?? 0,
            rev: 0,
          };
      const anims = (data.anims ?? []).map((a: Record<string, unknown>) => ({
        id: uid(),
        key: String(a.key ?? 'anim'),
        frames: (a.frames as number[]) ?? [0],
        frameRate: Number(a.frameRate ?? 10),
        repeat: Number(a.repeat ?? -1),
        yoyo: !!a.yoyo,
        hideOnComplete: !!a.hideOnComplete,
      }));
      s.loadAsset(asset, anims);
      if (data.sprite) {
        s.setTransform({
          originX: data.sprite.origin?.x ?? 0.5,
          originY: data.sprite.origin?.y ?? 0.5,
          scaleX: data.sprite.scale?.x ?? 1,
          scaleY: data.sprite.scale?.y ?? 1,
          angle: data.sprite.angle ?? 0,
          alpha: data.sprite.alpha ?? 1,
          tint: data.sprite.tint ?? '#ffffff',
          tintFill: !!data.sprite.tintFill,
          blend: data.sprite.blendMode ?? 'NORMAL',
          flipX: !!data.sprite.flipX,
          flipY: !!data.sprite.flipY,
          depth: data.sprite.depth ?? 0,
        });
      }
      if (data.hitbox) {
        s.setHitbox({
          auto: data.hitbox.auto ?? true,
          x: data.hitbox.x ?? 0,
          y: data.hitbox.y ?? 0,
          w: data.hitbox.w ?? 32,
          h: data.hitbox.h ?? 32,
        });
      }
      if (data.motion) {
        s.setMotion({
          mode: data.motion.mode ?? 'static',
          speed: data.motion.speed ?? 2,
          distance: data.motion.distance ?? 220,
          gravity: data.motion.gravity ?? 1200,
          bounce: data.motion.bounce ?? 0.45,
          autoFlip: data.motion.autoFlip ?? true,
        });
      }
      onClose();
    } catch {
      alert('JSON inválido — não foi possível importar.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a0f1c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Exportar / Importar</h2>
          <div className="ml-2 flex gap-0.5 rounded-lg bg-slate-950/70 p-0.5 ring-1 ring-slate-800">
            {(['json', 'code', 'report'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded-md px-3 py-1 text-[11px] font-semibold transition',
                  tab === t ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40' : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {t === 'json' ? 'animation.json' : t === 'code' ? 'phaser.js' : 'relatório'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Btn onClick={() => fileRef.current?.click()}>importar json</Btn>
            <Btn onClick={onClose} variant="solid">
              fechar ✕
            </Btn>
          </div>
        </header>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-800/70 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">opções</span>
          <div className="flex flex-wrap gap-x-4">
            <Toggle
              label="embutir imagem (base64)"
              checked={lab.exportOpts.embedImage}
              onChange={(v) => lab.setExportOpts({ embedImage: v })}
            />
            <Toggle
              label="dados dos frames"
              checked={lab.exportOpts.includeFrames}
              onChange={(v) => lab.setExportOpts({ includeFrames: v })}
            />
            <Toggle
              label="preset de movimento"
              checked={lab.exportOpts.includeMotion}
              onChange={(v) => lab.setExportOpts({ includeMotion: v })}
            />
          </div>
        </div>

        <div className="lab-scroll flex-1 overflow-auto bg-slate-950/60 p-3">
          {tab === 'report' ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {buildReport(lab).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{k}</div>
                  <div className="font-mono text-[13px] text-cyan-300">{v}</div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-300">
              {text}
            </pre>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-1.5 border-t border-slate-800 px-4 py-3">
          <span className="font-mono text-[10px] text-slate-500">
            {text.length.toLocaleString('pt-BR')} caracteres · {(text.length / 1024).toFixed(1)} KB
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Btn onClick={doCopy} variant="solid">
              {copied === tab ? 'copiado ✓' : 'copiar'}
            </Btn>
            <Btn onClick={() => downloadText(`${name}.animation.json`, json)} variant="accent">
              ↓ {name}.animation.json
            </Btn>
            <Btn onClick={() => downloadText(`${name}.phaser.js`, code, 'text/javascript')}>↓ {name}.phaser.js</Btn>
          </div>
        </footer>
      </div>
    </div>
  );
}

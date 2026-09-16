import { useRef, useState } from 'react';
import { useEngine, useLab } from '../store';
import { jitterReport } from '../store';
import { buildAssetFromFile, buildAssetFromFiles, guessFrameSize, makeDemoAsset } from '../lib/sheet';
import { Btn, Num, Panel, Row, Stat, Warn } from './ui';

export function AssetPanel() {
  const asset = useLab((s) => s.asset);
  const frames = useLab((s) => s.frames);
  const setSlicing = useLab((s) => s.setSlicing);
  const loadAsset = useLab((s) => s.loadAsset);
  const setHitbox = useLab((s) => s.setHitbox);
  const setTransform = useLab((s) => s.setTransform);
  const single = useRef<HTMLInputElement>(null);
  const multi = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const jitter = jitterReport(frames);
  const empty = frames.filter((f) => !f.bounds).length;
  const cols = asset.frameW ? Math.floor((asset.width - asset.margin + asset.spacing) / (asset.frameW + asset.spacing)) : 0;
  const rows = asset.frameH ? Math.floor((asset.height - asset.margin + asset.spacing) / (asset.frameH + asset.spacing)) : 0;

  const handleFiles = async (list: FileList | null, mode: 'sheet' | 'files') => {
    if (!list || !list.length) return;
    setBusy(true);
    try {
      const next = mode === 'sheet' ? await buildAssetFromFile(list[0]) : await buildAssetFromFiles([...list]);
      loadAsset(next);
    } finally {
      setBusy(false);
    }
  };

  const loadDemo = () => {
    const demo = makeDemoAsset();
    loadAsset(demo.asset, demo.anims);
  };

  const cur = useEngine((s) => s.frame);
  const focusFrame = frames[cur];

  return (
    <Panel
      title="1 · Asset & Fatiamento"
      actions={
        <>
          <Btn onClick={loadDemo} title="Gerar spritesheet de exemplo">
            demo
          </Btn>
          <Btn onClick={() => single.current?.click()} variant="accent">
            sheet
          </Btn>
          <Btn onClick={() => multi.current?.click()} title="Várias imagens → atlas">
            frames
          </Btn>
        </>
      }
    >
      <input
        ref={single}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFiles(e.target.files, 'sheet')}
      />
      <input
        ref={multi}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files, 'files')}
      />

      <div className="flex items-center gap-2 rounded-lg border border-slate-800/70 bg-slate-950/60 p-1.5">
        <div
          className="h-11 w-11 shrink-0 rounded-md border border-slate-800 bg-slate-900"
          style={{
            backgroundImage: asset.url ? `url(${asset.url})` : undefined,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            imageRendering: 'pixelated',
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold text-slate-200">{asset.name || 'nenhum asset'}</div>
          <div className="font-mono text-[10px] text-slate-500">
            {asset.width}×{asset.height}px · {asset.source}
            {busy && ' · processando…'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Row label="frame w">
          <Num value={asset.frameW} min={1} onChange={(v) => setSlicing({ frameW: Math.max(1, v) })} />
        </Row>
        <Row label="frame h">
          <Num value={asset.frameH} min={1} onChange={(v) => setSlicing({ frameH: Math.max(1, v) })} />
        </Row>
        <Row label="margem">
          <Num value={asset.margin} min={0} onChange={(v) => setSlicing({ margin: Math.max(0, v) })} />
        </Row>
        <Row label="espaço">
          <Num value={asset.spacing} min={0} onChange={(v) => setSlicing({ spacing: Math.max(0, v) })} />
        </Row>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="grade" value={`${cols}×${rows}`} tone="cyan" />
        <Stat label="frames" value={frames.length} tone="cyan" />
        <Stat
          label="célula"
          value={`${asset.frameW}×${asset.frameH}`}
          tone={asset.frameW === asset.frameH ? 'cyan' : 'amber'}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <Btn
          onClick={() => setSlicing(guessFrameSize(asset.width, asset.height))}
          title="Detectar tamanho de célula provável"
        >
          auto detectar
        </Btn>
        {[16, 24, 32, 48, 64, 96, 128].map((s) => (
          <Btn key={s} active={asset.frameW === s && asset.frameH === s} onClick={() => setSlicing({ frameW: s, frameH: s })}>
            {s}
          </Btn>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Stat
          label="conteúdo"
          value={
            focusFrame?.bounds
              ? `${focusFrame.bounds.w}×${focusFrame.bounds.h}`
              : '—'
          }
        />
        <Stat
          label="preench."
          value={`${Math.round((frames.reduce((a, f) => a + f.coverage, 0) / Math.max(1, frames.length)) * 100)}%`}
        />
        <Stat label="vazios" value={empty} tone={empty ? 'amber' : undefined} />
      </div>

      {jitter.varying && (
        <Warn>
          <b>Frames com tamanhos diferentes</b> — variação de {jitter.width}px de largura e {jitter.height}px de altura
          entre frames (deslocamento {jitter.spreadX}/{jitter.spreadY}px). Isso causa tremor na animação.{' '}
          <button
            className="underline decoration-dotted"
            onClick={() => {
              const f = frames.find((x) => x.bounds);
              if (f?.bounds) setTransform({ originX: +(0.5).toFixed(2), originY: +(0.5).toFixed(2) });
            }}
          >
            centralizar origem
          </button>{' '}
          ou use a hitbox automática.
        </Warn>
      )}

      <div className="flex flex-wrap gap-1">
        <Btn onClick={() => setHitbox({ auto: false, x: 0, y: 0, w: asset.frameW, h: asset.frameH })}>
          hitbox = frame
        </Btn>
        <Btn
          onClick={() => {
            const b = frames.find((f) => f.bounds)?.bounds;
            if (b) setHitbox({ auto: false, ...b });
          }}
        >
          hitbox = conteúdo
        </Btn>
      </div>
    </Panel>
  );
}

import { useEngine, useLab, resolveHitbox } from '../store';
import { Btn, Num, Panel, Row, Seg, Slider, Stat, Toggle } from './ui';
import { cn } from '../utils/cn';

const ORIGINS: [number, number, string][] = [
  [0, 0, '↖'],
  [0.5, 0, '↑'],
  [1, 0, '↗'],
  [0, 0.5, '←'],
  [0.5, 0.5, '·'],
  [1, 0.5, '→'],
  [0, 1, '↙'],
  [0.5, 1, '↓'],
  [1, 1, '↘'],
];

export function InspectorPanel() {
  const t = useLab((s) => s.transform);
  const asset = useLab((s) => s.asset);
  const frames = useLab((s) => s.frames);
  const view = useLab((s) => s.view);
  const setTransform = useLab((s) => s.setTransform);
  const setView = useLab((s) => s.setView);
  const cur = useEngine((s) => s.frame);
  const info = frames[cur];
  const integerScale = Number.isInteger(t.scaleX) && Number.isInteger(t.scaleY) && t.scaleX === t.scaleY;

  const setOriginContent = () => {
    const b = info?.bounds;
    if (!b) return;
    setTransform({
      originX: +((b.x + b.w / 2) / asset.frameW).toFixed(3),
      originY: +((b.y + b.h / 2) / asset.frameH).toFixed(3),
    });
  };

  return (
    <Panel
      title="4 · Transformação & Efeitos"
      actions={<span className="font-mono text-[10px] text-slate-500">{asset.frameW}×{asset.frameH}</span>}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            origem
          </span>
          <div className="grid flex-1 grid-cols-3 gap-0.5 rounded-lg bg-slate-950/70 p-0.5 ring-1 ring-slate-800">
            {ORIGINS.map(([ox, oy, label]) => {
              const active = Math.abs(t.originX - ox) < 0.01 && Math.abs(t.originY - oy) < 0.01;
              return (
                <button
                  key={label}
                  onClick={() => setTransform({ originX: ox, originY: oy })}
                  className={cn(
                    'rounded-md py-1 text-[11px] font-bold transition',
                    active ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40' : 'text-slate-500 hover:text-slate-200',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <Btn onClick={setOriginContent} title="Origem no centro do conteúdo real do frame">
            conteúdo
          </Btn>
        </div>

        <Slider label="origem x" value={t.originX} min={0} max={1} step={0.01} onChange={(v) => setTransform({ originX: v })} />
        <Slider label="origem y" value={t.originY} min={0} max={1} step={0.01} onChange={(v) => setTransform({ originY: v })} />

        <div className="flex items-center gap-2">
          <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            escala
          </span>
          <div className="flex flex-1 items-center gap-1">
            {[1, 2, 3, 4, 6].map((s) => (
              <Btn key={s} active={t.scaleX === s && t.scaleY === s} onClick={() => setTransform({ scaleX: s, scaleY: s })}>
                ×{s}
              </Btn>
            ))}
            <Btn
              active={t.scaleX === 1 && t.scaleY === 1}
              onClick={() => setTransform({ scaleX: 1, scaleY: 1 })}
              title="Escala 1:1"
            >
              1:1
            </Btn>
            <div className="ml-auto flex items-center gap-1">
              <Btn active={t.lockScale} onClick={() => setTransform({ lockScale: !t.lockScale })} title="Travar proporção">
                {t.lockScale ? '🔒' : '🔓'}
              </Btn>
              <Btn onClick={() => setTransform({ scaleX: t.scaleY, scaleY: t.scaleX })} title="Inverter proporção">
                ⇅
              </Btn>
            </div>
          </div>
        </div>

        <Slider
          label="escala x"
          value={t.scaleX}
          min={0.1}
          max={10}
          step={0.05}
          onChange={(v) => setTransform(t.lockScale ? { scaleX: v, scaleY: v } : { scaleX: v })}
        />
        <Slider
          label="escala y"
          value={t.scaleY}
          min={0.1}
          max={10}
          step={0.05}
          onChange={(v) => setTransform(t.lockScale ? { scaleX: v, scaleY: v } : { scaleY: v })}
        />
        <Slider label="rotação" value={t.angle} min={-180} max={180} step={1} unit="°" digits={0} onChange={(v) => setTransform({ angle: v })} />
        <div className="flex gap-1">
          {[0, 90, 180, 270].map((a) => (
            <Btn key={a} active={t.angle === a} onClick={() => setTransform({ angle: a })} className="flex-1">
              {a}°
            </Btn>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Toggle label="flip x" checked={t.flipX} onChange={(v) => setTransform({ flipX: v })} />
          <Toggle label="flip y" checked={t.flipY} onChange={(v) => setTransform({ flipY: v })} />
        </div>

        <Slider label="alpha" value={t.alpha} min={0} max={1} step={0.01} onChange={(v) => setTransform({ alpha: v })} />

        <div className="flex items-center gap-2">
          <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">tint</span>
          <input
            type="color"
            value={t.tint}
            onChange={(e) => setTransform({ tint: e.target.value })}
            className="h-7 w-10 cursor-pointer rounded-md border border-slate-800 bg-slate-950"
          />
          <Btn onClick={() => setTransform({ tint: '#ffffff' })}>sem tint</Btn>
          <Toggle label="preencher" checked={t.tintFill} onChange={(v) => setTransform({ tintFill: v })} />
        </div>

        <Row label="blend">
          <Seg
            value={t.blend}
            options={[
              { value: 'NORMAL', label: 'normal' },
              { value: 'ADD', label: 'add' },
              { value: 'MULTIPLY', label: 'mult' },
              { value: 'SCREEN', label: 'screen' },
              { value: 'ERASE', label: 'erase' },
            ]}
            onChange={(v) => setTransform({ blend: v })}
          />
        </Row>

        <div className="grid grid-cols-3 gap-1.5">
          <Stat label="final" value={`${Math.round(asset.frameW * t.scaleX)}×${Math.round(asset.frameH * t.scaleY)}`} tone="cyan" />
          <Stat
            label="proporção"
            value={`${((asset.frameW * t.scaleX) / Math.max(1, asset.frameH * t.scaleY)).toFixed(2)}:1`}
          />
          <Stat
            label="pixel art"
            value={integerScale ? 'ok' : 'parcial'}
            tone={integerScale ? 'cyan' : 'amber'}
          />
        </div>

        <div className="space-y-1.5 rounded-lg border border-slate-800/70 bg-slate-950/40 p-2">
          <button
            onClick={() => setView({ showStates: !view.showStates })}
            className={cn(
              'flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition',
              view.showStates
                ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200'
                : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200',
            )}
            title="Mostra todas as animações tocando ao mesmo tempo, lado a lado (S)"
          >
            <span>⌗ grade de estados — todas as animações</span>
            <span className="font-mono">{view.showStates ? 'ON' : 'OFF'}</span>
          </button>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Overlays de diagnóstico</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Toggle label="grade" checked={view.showGrid} onChange={(v) => setView({ showGrid: v })} />
            <Toggle label="palco" checked={view.showStage} onChange={(v) => setView({ showStage: v })} />
            <Toggle label="tamanho real" checked={view.showNatural} onChange={(v) => setView({ showNatural: v })} />
            <Toggle label="render final" checked={view.showBounds} onChange={(v) => setView({ showBounds: v })} />
            <Toggle label="hitbox" checked={view.showHitbox} onChange={(v) => setView({ showHitbox: v })} />
            <Toggle label="pivô" checked={view.showPivot} onChange={(v) => setView({ showPivot: v })} />
            <Toggle label="onion skin" checked={view.onion} onChange={(v) => setView({ onion: v })} />
            <Toggle label="rastro" checked={view.trail} onChange={(v) => setView({ trail: v })} />
          </div>
          <Slider label="grade px" value={view.gridSize} min={4} max={256} step={4} digits={0} onChange={(v) => setView({ gridSize: v })} />
          {view.onion && (
            <>
              <Slider label="onion qtd" value={view.onionCount} min={1} max={4} digits={0} onChange={(v) => setView({ onionCount: v })} />
              <Slider label="onion desloc" value={view.onionOffset} min={0} max={120} digits={0} unit="px" onChange={(v) => setView({ onionOffset: v })} />
            </>
          )}
          <Row label="fundo">
            <Seg
              value={view.bg}
              options={[
                { value: 'checker', label: 'xadrez' },
                { value: 'solid', label: 'cor' },
                { value: 'dark', label: 'escuro' },
                { value: 'blueprint', label: 'blue' },
              ]}
              onChange={(v) => setView({ bg: v })}
            />
            {view.bg === 'solid' && (
              <input
                type="color"
                value={view.bgColor}
                onChange={(e) => setView({ bgColor: e.target.value })}
                className="h-7 w-9 cursor-pointer rounded-md border border-slate-800 bg-slate-950"
              />
            )}
          </Row>
        </div>

        <div className="flex flex-wrap gap-1.5 font-mono text-[10px] text-slate-500">
          <span>
            conteúdo: {info?.bounds ? `${info.bounds.w}×${info.bounds.h} @${info.bounds.x},${info.bounds.y}` : 'vazio'}
          </span>
          <span>
            hitbox: {(() => {
              const h = resolveHitbox(useLab.getState());
              return `${Math.round(h.w)}×${Math.round(h.h)}`;
            })()}
          </span>
          <span className="ml-auto flex items-center gap-1">
            depth
            <Num value={t.depth} onChange={(v) => setTransform({ depth: v })} className="w-12" />
          </span>
        </div>
      </div>
    </Panel>
  );
}

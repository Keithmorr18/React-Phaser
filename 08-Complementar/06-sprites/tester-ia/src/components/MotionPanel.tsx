import { useLab, resolveHitbox } from '../store';
import { Btn, Num, Panel, Seg, Slider, Stat, Toggle, Warn } from './ui';
import type { Hitbox, MotionMode } from '../types';

const MODES: { value: MotionMode; label: string; hint: string }[] = [
  { value: 'static', label: 'estático', hint: 'Sem movimento — ideal para conferir tamanho e origem' },
  { value: 'patrol', label: 'patrulha', hint: 'Vai e volta horizontalmente (ciclo de andar)' },
  { value: 'bob', label: 'flutuar', hint: 'Sobe e desce com squash & stretch' },
  { value: 'jump', label: 'pulo', hint: 'Pulo em arco repetido com antecipação' },
  { value: 'orbit', label: 'órbita', hint: 'Movimento circular / parallax' },
  { value: 'keys', label: 'teclado', hint: 'WASD / setas movem o sprite' },
  { value: 'physics', label: 'física', hint: 'Gravidade + colisão com o chão (clique para pular)' },
];

export function MotionPanel() {
  const motion = useLab((s) => s.motion);
  const setMotion = useLab((s) => s.setMotion);
  const hitbox = useLab((s) => s.hitbox);
  const setHitbox = useLab((s) => s.setHitbox);
  const asset = useLab((s) => s.asset);
  const frames = useLab((s) => s.frames);
  const hit = resolveHitbox(useLab.getState());
  const mode = MODES.find((m) => m.value === motion.mode)!;

  return (
    <Panel title="5 · Movimento, Física & Hitbox">
      <Seg
        value={motion.mode}
        options={MODES.map((m) => ({ value: m.value, label: m.label, title: m.hint }))}
        onChange={(v) => setMotion({ mode: v })}
      />
      <p className="-mt-1 text-[10.5px] leading-relaxed text-slate-500">{mode.hint}</p>

      {motion.mode !== 'static' && (
        <>
          <Slider label="velocidade" value={motion.speed} min={0.2} max={8} step={0.1} onChange={(v) => setMotion({ speed: v })} unit="×" />
          {['patrol', 'bob', 'jump', 'orbit'].includes(motion.mode) && (
            <Slider label="distância" value={motion.distance} min={20} max={600} step={5} digits={0} unit="px" onChange={(v) => setMotion({ distance: v })} />
          )}
          {motion.mode === 'physics' && (
            <>
              <Slider label="gravidade" value={motion.gravity} min={0} max={3000} step={50} digits={0} onChange={(v) => setMotion({ gravity: v })} />
              <Slider label="bounce" value={motion.bounce} min={0} max={1} step={0.05} onChange={(v) => setMotion({ bounce: v })} />
              <Warn tone="cyan">
                Clique no palco para aplicar impulso · use <b>A/D</b> para empurrar. O corpo usa a hitbox configurada
                abaixo.
              </Warn>
            </>
          )}
          <Toggle label="virar conforme a direção (auto flip)" checked={motion.autoFlip} onChange={(v) => setMotion({ autoFlip: v })} />
        </>
      )}

      <div className="space-y-2 rounded-lg border border-slate-800/70 bg-slate-950/40 p-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Hitbox / corpo</span>
          <div className="ml-auto flex gap-1">
            <Btn active={hitbox.auto} onClick={() => setHitbox({ auto: !hitbox.auto })}>
              {hitbox.auto ? 'auto (união da animação)' : 'manual'}
            </Btn>
          </div>
        </div>
        {!hitbox.auto && (
          <div className="grid grid-cols-4 gap-1">
            {(['x', 'y', 'w', 'h'] as const).map((k) => (
              <label key={k} className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{k}</span>
                <Num
                  value={hitbox[k]}
                  onChange={(v) => setHitbox({ [k]: k === 'x' || k === 'y' ? v : Math.max(1, v) } as Partial<Hitbox>)}
                />
              </label>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          <Stat label="corpo" value={`${Math.round(hit.w)}×${Math.round(hit.h)}`} tone="cyan" />
          <Stat label="offset" value={`${Math.round(hit.x)},${Math.round(hit.y)}`} />
          <Stat
            label="do frame"
            value={`${Math.round((hit.w / Math.max(1, asset.frameW)) * 100)}%`}
            tone={hit.w > asset.frameW || hit.h > asset.frameH ? 'amber' : undefined}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Btn onClick={() => setHitbox({ auto: false, x: 0, y: 0, w: asset.frameW, h: asset.frameH })}>= frame</Btn>
          <Btn
            onClick={() => {
              const b = frames.find((f) => f.bounds)?.bounds;
              if (b) setHitbox({ auto: false, ...b });
            }}
          >
            = conteúdo
          </Btn>
          <Btn
            onClick={() => {
              const w = Math.round(asset.frameW * 0.7);
              const h = Math.round(asset.frameH * 0.35);
              setHitbox({ auto: false, x: Math.round((asset.frameW - w) / 2), y: asset.frameH - h - 2, w, h });
            }}
            title="Hitbox de plataforma: pés, 70% da largura"
          >
            pés (platformer)
          </Btn>
        </div>
        {(hit.w > asset.frameW || hit.h > asset.frameH) && (
          <Warn tone="rose">
            A hitbox é maior que o frame — em jogos isso gera colisões “invisíveis”.
          </Warn>
        )}
      </div>
    </Panel>
  );
}

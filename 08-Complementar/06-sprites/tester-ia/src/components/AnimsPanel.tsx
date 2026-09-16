import { useState } from 'react';
import { useEngine, useLab } from '../store';
import { Btn, Field, Num, Panel, Row, Seg, Slider, Toggle, Warn } from './ui';
import { cn } from '../utils/cn';

const PRESETS = ['idle', 'walk', 'run', 'jump', 'fall', 'attack', 'hurt', 'die', 'cast'];

export function AnimsPanel() {
  const anims = useLab((s) => s.anims);
  const selectedAnimId = useLab((s) => s.selectedAnimId);
  const playback = useLab((s) => s.playback);
  const frames = useLab((s) => s.frames);
  const selectAnim = useLab((s) => s.selectAnim);
  const addAnim = useLab((s) => s.addAnim);
  const updateAnim = useLab((s) => s.updateAnim);
  const removeAnim = useLab((s) => s.removeAnim);
  const duplicateAnim = useLab((s) => s.duplicateAnim);
  const [range, setRange] = useState({ from: 0, to: 5, step: 1 });
  const [raw, setRaw] = useState('');

  const anim = anims.find((a) => a.id === selectedAnimId) ?? anims.find((a) => a.id === playback.animId);
  const engineAnim = useEngine((s) => s.animKey);
  const total = frames.length;
  const duration = anim && anim.frameRate > 0 ? (anim.frames.length / anim.frameRate) * 1000 : 0;

  const applyRange = () => {
    if (!anim) return;
    const out: number[] = [];
    for (let i = range.from; i <= range.to; i += Math.max(1, range.step)) out.push(i);
    updateAnim(anim.id, { frames: out.filter((i) => i < total) });
  };

  const parseRaw = () => {
    if (!anim) return;
    const list = raw
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((n) => parseInt(n, 10))
      .filter((n) => n < total);
    if (list.length) updateAnim(anim.id, { frames: list });
    setRaw('');
  };

  return (
    <Panel
      title="3 · Animações"
      actions={
        <>
          <Btn onClick={() => addAnim({ key: `anim-${anims.length + 1}`, frames: [0], frameRate: 10 })} variant="accent">
            + nova
          </Btn>
          {anim && (
            <>
              <Btn onClick={() => duplicateAnim(anim.id)} title="Duplicar">
                ⧉
              </Btn>
              <Btn variant="danger" onClick={() => removeAnim(anim.id)} title="Excluir">
                ✕
              </Btn>
            </>
          )}
        </>
      }
    >
      <div className="max-h-[178px] space-y-1 overflow-y-auto pr-1 lab-scroll">
        {anims.length === 0 && <Warn tone="cyan">Crie uma animação para começar os testes.</Warn>}
        {anims.map((a) => {
          const active = a.id === playback.animId;
          const selected = a.id === selectedAnimId;
          return (
            <div
              key={a.id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition',
                active
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : selected
                    ? 'border-slate-700 bg-slate-800/50'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700',
              )}
              onClick={() => selectAnim(a.id)}
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-cyan-400' : 'bg-slate-600')} />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-200">{a.key}</span>
              <span className="font-mono text-[10px] text-slate-500">
                {a.frames.length}f · {a.frameRate}fps
              </span>
              <span className="flex gap-0.5">
                {a.repeat === -1 && <Tag>loop</Tag>}
                {a.yoyo && <Tag tone="fuchsia">yoyo</Tag>}
              </span>
            </div>
          );
        })}
      </div>

      {anim && (
        <div className="space-y-2.5 rounded-lg border border-slate-800/70 bg-slate-950/40 p-2.5">
          <div className="flex items-center gap-2">
            <Field label="key" value={anim.key} mono onChange={(v) => updateAnim(anim.id, { key: v || 'anim' })} />
            <div className="flex shrink-0 gap-0.5">
              <Btn onClick={() => updateAnim(anim.id, { frames: [...anim.frames].reverse() })} title="Reverter frames">
                ⇄
              </Btn>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <Btn key={p} active={anim.key === p} onClick={() => updateAnim(anim.id, { key: p })}>
                {p}
              </Btn>
            ))}
          </div>

          <Slider
            label="fps"
            value={anim.frameRate}
            min={1}
            max={60}
            onChange={(v) => updateAnim(anim.id, { frameRate: Math.max(1, v) })}
            unit="f/s"
            digits={0}
          />
          <Row label="repeat">
            <Seg
              value={anim.repeat === -1 ? 'loop' : anim.repeat === 0 ? 'once' : 'n'}
              options={[
                { value: 'loop', label: '∞ loop' },
                { value: 'once', label: '1×' },
                { value: 'n', label: 'n vezes' },
              ]}
              onChange={(v) => updateAnim(anim.id, { repeat: v === 'loop' ? -1 : v === 'once' ? 0 : 3 })}
            />
            {anim.repeat > 0 && (
              <Num value={anim.repeat} min={1} onChange={(v) => updateAnim(anim.id, { repeat: Math.max(1, v) })} />
            )}
          </Row>
          <div className="grid grid-cols-2 gap-1">
            <Toggle label="yoyo (vai e volta)" checked={anim.yoyo} onChange={(v) => updateAnim(anim.id, { yoyo: v })} />
            <Toggle
              label="esconde ao fim"
              checked={anim.hideOnComplete}
              onChange={(v) => updateAnim(anim.id, { hideOnComplete: v })}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              intervalo
            </span>
            <Num value={range.from} min={0} onChange={(v) => setRange((r) => ({ ...r, from: Math.max(0, v) }))} />
            <Num
              value={range.to}
              min={0}
              onChange={(v) => setRange((r) => ({ ...r, to: Math.max(r.from, v) }))}
            />
            <span className="text-[10px] text-slate-500">passo</span>
            <Num value={range.step} min={1} onChange={(v) => setRange((r) => ({ ...r, step: Math.max(1, v) }))} />
            <Btn onClick={applyRange} variant="accent">
              aplicar
            </Btn>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              frames
            </span>
            <Field
              value={raw}
              placeholder={anim.frames.join(',')}
              mono
              onChange={setRaw}
            />
            <Btn onClick={parseRaw}>ok</Btn>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-slate-500">
            <span>
              duração: <span className="text-slate-300">{duration.toFixed(0)}ms</span>
            </span>
            <span>
              ms/frame: <span className="text-slate-300">{anim.frameRate ? (1000 / anim.frameRate).toFixed(0) : 0}</span>
            </span>
            <span>
              tocando: <span className="text-cyan-300">{engineAnim || '—'}</span>
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Tag({ children, tone = 'cyan' }: { children: React.ReactNode; tone?: 'cyan' | 'fuchsia' }) {
  return (
    <span
      className={cn(
        'rounded px-1 py-0.5 text-[9px] font-semibold uppercase',
        tone === 'cyan' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-fuchsia-500/15 text-fuchsia-300',
      )}
    >
      {children}
    </span>
  );
}

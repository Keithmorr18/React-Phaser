import { useRef, useState } from 'react';
import { useEngine, useLab } from '../store';
import { Btn } from './ui';
import { cn } from '../utils/cn';

export function Timeline() {
  const asset = useLab((s) => s.asset);
  const frames = useLab((s) => s.frames);
  const anims = useLab((s) => s.anims);
  const playback = useLab((s) => s.playback);
  const setFrame = useLab((s) => s.setFrame);
  const addAnim = useLab((s) => s.addAnim);
  const updateAnim = useLab((s) => s.updateAnim);
  const frame = useEngine((s) => s.frame);

  const [selectMode, setSelectMode] = useState(false);
  const [sel, setSel] = useState<number[]>([]);
  const anchor = useRef<number | null>(null);

  const anim = anims.find((a) => a.id === playback.animId);
  const inAnim = new Set(anim?.frames ?? []);
  const TH = 54;
  const k = asset.frameW ? TH / asset.frameW : 1;
  const kh = asset.frameH ? TH / asset.frameH : 1;

  const click = (i: number, shift: boolean) => {
    if (!selectMode) {
      setFrame(i);
      return;
    }
    if (shift && anchor.current !== null) {
      const [a, b] = [Math.min(anchor.current, i), Math.max(anchor.current, i)];
      const range = frames.slice(a, b + 1).map((f) => f.index);
      setSel((prev) => Array.from(new Set([...prev, ...range])).sort((x, y) => x - y));
      return;
    }
    anchor.current = i;
    setSel((prev) => (prev.includes(i) ? prev.filter((v) => v !== i) : [...prev, i].sort((x, y) => x - y)));
  };

  const sortedSel = [...sel].sort((a, b) => a - b);

  return (
    <div className="flex min-h-0 flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Timeline</span>
        <span className="font-mono text-[10px] text-slate-500">
          {frames.length} frames · anim <span className="text-cyan-300">{anim?.key ?? '—'}</span> ({anim?.frames.length ?? 0})
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Btn
            active={selectMode}
            onClick={() => setSelectMode((v) => !v)}
            title="Modo seleção: clique/shift-clique para escolher frames"
          >
            {selectMode ? 'selecionando' : 'navegar'}
          </Btn>
          <span className="font-mono text-[10px] text-slate-500">sel: {sortedSel.length}</span>
          <Btn
            disabled={!sortedSel.length}
            onClick={() => addAnim({ frames: sortedSel, frameRate: 12 })}
            variant="accent"
          >
            + animação
          </Btn>
          <Btn disabled={!sortedSel.length || !anim} onClick={() => anim && updateAnim(anim.id, { frames: sortedSel })}>
            usar na atual
          </Btn>
          <Btn disabled={!sortedSel.length} onClick={() => setSel((prev) => [...prev].reverse())}>
            inverter
          </Btn>
          <Btn disabled={!sel.length} onClick={() => setSel([])}>
            limpar
          </Btn>
        </div>
      </div>

      <div className="lab-scroll flex min-h-[62px] items-start gap-1 overflow-x-auto rounded-lg bg-slate-950/60 p-1.5">
        {frames.length === 0 && (
          <div className="px-2 py-3 text-[11px] text-slate-500">
            Carregue uma spritesheet para ver os frames aqui.
          </div>
        )}
        {frames.map((f) => {
          const isCur = f.index === frame;
          const isSel = sel.includes(f.index);
          return (
            <button
              key={f.index}
              onClick={(e) => click(f.index, e.shiftKey)}
              onPointerEnter={(e) => {
                if (!selectMode && e.buttons === 1) setFrame(f.index);
              }}
              title={`frame ${f.index}\nconteúdo: ${f.bounds ? `${f.bounds.w}×${f.bounds.h} @ ${f.bounds.x},${f.bounds.y}` : 'vazio'}\npreenchimento: ${(f.coverage * 100).toFixed(0)}%`}
              className={cn(
                'group relative shrink-0 overflow-hidden rounded-md border transition',
                isCur ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-slate-700 hover:border-slate-500',
                isSel && 'border-fuchsia-400 ring-2 ring-fuchsia-400/40',
                !f.bounds && 'border-dashed border-rose-500/60',
              )}
            >
              <span
                className="block"
                style={{
                  width: TH,
                  height: TH,
                  backgroundImage: asset.url ? `url(${asset.url})` : undefined,
                  backgroundSize: `${asset.width * k}px ${asset.height * kh}px`,
                  backgroundPosition: `-${f.rect.x * k}px -${f.rect.y * kh}px`,
                  imageRendering: 'pixelated',
                }}
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-slate-950/80 px-1 font-mono text-[9px] text-slate-400">
                <span>{f.index}</span>
                {inAnim.has(f.index) && <span className="text-cyan-400">●</span>}
              </span>
              {isSel && (
                <span className="absolute right-0.5 top-0.5 rounded bg-fuchsia-500 px-1 font-mono text-[9px] text-white">
                  {sortedSel.indexOf(f.index) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

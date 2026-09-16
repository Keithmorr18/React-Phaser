import { useEngine, useLab } from '../store';
import { Btn, Kbd } from './ui';
import { cn } from '../utils/cn';

export function PlaybackBar() {
  const playback = useLab((s) => s.playback);
  const anims = useLab((s) => s.anims);
  const togglePlay = useLab((s) => s.togglePlay);
  const setPlayback = useLab((s) => s.setPlayback);
  const stepFrame = useLab((s) => s.stepFrame);
  const setFrame = useLab((s) => s.setFrame);
  const frame = useEngine((s) => s.frame);
  const count = useEngine((s) => s.frameCount);
  const anim = anims.find((a) => a.id === playback.animId);

  const idx = anim ? anim.frames.indexOf(frame) : -1;
  const pct = anim && anim.frames.length ? ((idx + 1) / anim.frames.length) * 100 : 0;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/40 px-2.5 py-2">
      <div className="flex items-center gap-1">
        <Btn onClick={() => setFrame(0)} title="Primeiro frame (Home)">
          ⏮
        </Btn>
        <Btn onClick={() => stepFrame(-1)} title="Frame anterior (←)">
          ◀
        </Btn>
        <button
          onClick={togglePlay}
          className={cn(
            'flex h-9 w-14 items-center justify-center rounded-lg border text-sm font-bold transition',
            playback.playing
              ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
              : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700',
          )}
          title="Play / Pause (espaço)"
        >
          {playback.playing ? '❙❙' : '▶'}
        </button>
        <Btn onClick={() => stepFrame(1)} title="Próximo frame (→)">
          ▶
        </Btn>
        <Btn onClick={() => setFrame(Math.max(0, count - 1))} title="Último frame (End)">
          ⏭
        </Btn>
      </div>

      <div className="flex min-w-[190px] flex-1 flex-col gap-1">
        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
          <span className="truncate">
            {anim ? (
              <>
                <span className="text-cyan-300">{anim.key}</span> · frame{' '}
                <span className="text-slate-200">
                  {idx >= 0 ? idx + 1 : '—'}/{anim.frames.length}
                </span>{' '}
                (#{frame + 1} do sheet)
              </>
            ) : (
              'sem animação'
            )}
          </span>
          <span>{pct ? `${pct.toFixed(0)}%` : '0%'}</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-950 ring-1 ring-slate-800">
          {anim?.frames.map((f, i) => (
            <button
              key={i}
              onClick={() => setFrame(f)}
              title={`frame ${f}`}
              className="absolute top-0 h-full border-r border-slate-950/80 transition hover:bg-cyan-400/60"
              style={{
                left: `${(i / anim.frames.length) * 100}%`,
                width: `${100 / anim.frames.length}%`,
                background: i <= idx ? 'rgba(34,211,238,0.45)' : 'rgba(51,65,85,0.5)',
              }}
            />
          ))}
          {!anim && <div className="h-full w-full bg-slate-800/40" />}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">vel</span>
        <input
          type="range"
          min={0.1}
          max={4}
          step={0.05}
          value={playback.speed}
          onChange={(e) => setPlayback({ speed: +e.target.value })}
          className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-slate-700 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
        />
        <button
          onClick={() => setPlayback({ speed: 1 })}
          className="w-10 rounded-md border border-slate-800 bg-slate-950 px-1 py-0.5 font-mono text-[10px] text-slate-300 hover:border-slate-700"
        >
          {playback.speed.toFixed(2)}×
        </button>
      </div>

      <div className="hidden items-center gap-1.5 pl-1 text-[10px] text-slate-500 lg:flex">
        <Kbd>space</Kbd>
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
        <Kbd>1-9</Kbd>
        <Kbd>g</Kbd>
        <Kbd>o</Kbd>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { SpriteScene } from './SpriteScene';
import { sceneApi } from './api';
import { useEngine, useLab } from '../store';
import { cn } from '../utils/cn';

export function PhaserStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const bg = useLab((s) => s.view.bg);
  const bgColor = useLab((s) => s.view.bgColor);
  const zoom = useLab((s) => s.view.zoom);
  const setView = useLab((s) => s.setView);
  const panning = useEngine((s) => s.panning);
  const fps = useEngine((s) => s.fps);
  const frame = useEngine((s) => s.frame);
  const count = useEngine((s) => s.frameCount);
  const displayW = useEngine((s) => s.displayW);
  const displayH = useEngine((s) => s.displayH);
  const x = useEngine((s) => s.x);
  const y = useEngine((s) => s.y);
  const ready = useEngine((s) => s.ready);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      transparent: true,
      pixelArt: true,
      antialias: false,
      banner: false,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
      physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
      scene: [SpriteScene],
    });
    (window as unknown as { __phaser?: Phaser.Game }).__phaser = game;

    const unsub = useLab.subscribe((state) => {
      sceneApi.current?.sync(state);
    });

    return () => {
      unsub();
      sceneApi.current = null;
      game.destroy(true);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-800/80">
      {/* background reference */}
      <div
        className={cn('absolute inset-0', bg === 'checker' && 'lab-checker')}
        style={bg === 'solid' ? { background: bgColor } : undefined}
      />
      <div
        className={cn('absolute inset-0', bg === 'dark' && 'bg-[#080c15]', bg === 'blueprint' && 'bg-[#0a1730]')}
      />
      <div ref={hostRef} className={cn('absolute inset-0', panning && 'cursor-grabbing')} />

      {/* top-left badge */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
        <Badge>STAGE 1280×760</Badge>
        <Badge tone="cyan">
          {count || 0} frames · {ready ? 'texture ok' : 'carregando…'}
        </Badge>
      </div>

      {/* zoom controls */}
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/85 p-1 backdrop-blur">
        <StageBtn title="Diminuir zoom" onClick={() => setView({ zoom: Math.max(0.15, +(zoom * 0.85).toFixed(3)) })}>
          −
        </StageBtn>
        <span className="w-14 text-center font-mono text-[11px] text-slate-300">{(zoom * 100).toFixed(0)}%</span>
        <StageBtn title="Aumentar zoom" onClick={() => setView({ zoom: Math.min(8, +(zoom * 1.15).toFixed(3)) })}>
          +
        </StageBtn>
        <StageBtn title="Ajustar à tela (Z)" onClick={() => sceneApi.current?.resetView()}>
          ⤢
        </StageBtn>
        <StageBtn title="Centralizar no sprite (F)" onClick={() => sceneApi.current?.focusSprite()}>
          ⊹
        </StageBtn>
      </div>

      {/* stats HUD */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
        <Badge tone={fps < 45 ? 'amber' : 'green'}>{fps || 0} FPS</Badge>
        <Badge>frame {frame + 1}/{count || 0}</Badge>
        <Badge>
          {Math.round(displayW)}×{Math.round(displayH)} px
        </Badge>
        <Badge>
          x {Math.round(x)} / y {Math.round(y)}
        </Badge>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 hidden text-right text-[10px] leading-relaxed text-slate-500 sm:block">
        arraste o sprite · <span className="text-slate-400">botão direito</span> move a câmera ·{' '}
        <span className="text-slate-400">scroll</span> = zoom
      </div>
    </div>
  );
}

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'cyan' | 'green' | 'amber' }) {
  const tones = {
    slate: 'bg-slate-950/85 text-slate-400 ring-slate-800',
    cyan: 'bg-cyan-500/10 text-cyan-300 ring-cyan-500/30',
    green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  } as const;
  return <span className={cn('rounded-md px-1.5 py-1 ring-1 backdrop-blur', tones[tone])}>{children}</span>;
}

function StageBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="h-6 w-6 rounded-md text-xs text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300"
    >
      {children}
    </button>
  );
}

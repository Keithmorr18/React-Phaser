import { useEffect, useState } from 'react';
import { PhaserStage } from './phaser/PhaserStage';
import { sceneApi } from './phaser/api';
import { AssetPanel } from './components/AssetPanel';
import { AnimsPanel } from './components/AnimsPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { MotionPanel } from './components/MotionPanel';
import { PlaybackBar } from './components/PlaybackBar';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { useEngine, useLab } from './store';
import { analyzeFrames, buildAssetFromFile, buildAssetFromFiles, computeGrid, loadImage, makeDemoAsset } from './lib/sheet';
import { Btn, Kbd } from './components/ui';
import { cn } from './utils/cn';

export function App() {
  const [showExport, setShowExport] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [help, setHelp] = useState(false);
  const asset = useLab((s) => s.asset);
  const anims = useLab((s) => s.anims);
  const frames = useLab((s) => s.frames);
  const showStates = useLab((s) => s.view.showStates);

  /* boot with the built-in demo sheet */
  useEffect(() => {
    const demo = makeDemoAsset();
    useLab.getState().loadAsset(demo.asset, demo.anims);
  }, []);

  /* alpha analysis whenever the sheet or slicing changes */
  useEffect(() => {
    if (!asset.url || !asset.width) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const grid = computeGrid(asset.width, asset.height, asset.frameW, asset.frameH, asset.margin, asset.spacing);
      loadImage(asset.url)
        .then((img) => {
          if (cancelled) return;
          useLab.getState().setFrames(analyzeFrames(img, grid));
        })
        .catch(() => undefined);
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [asset.url, asset.width, asset.height, asset.frameW, asset.frameH, asset.margin, asset.spacing, asset.rev]);

  /* keyboard shortcuts */
  useEffect(() => {
    const isTyping = (el: EventTarget | null) =>
      el instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey) return;
      const s = useLab.getState();
      const eng = useEngine.getState();
      const k = e.key.toLowerCase();
      if (k === ' ') {
        e.preventDefault();
        s.togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        s.stepFrame(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        s.stepFrame(-1);
      } else if (e.key === 'Home') {
        s.setFrame(0);
      } else if (e.key === 'End') {
        s.setFrame(Math.max(0, eng.frameCount - 1));
      } else if (/^[1-9]$/.test(k)) {
        const a = s.anims[+k - 1];
        if (a) s.selectAnim(a.id);
      } else if (k === 's') s.setView({ showStates: !s.view.showStates });
      else if (k === 'g') s.setView({ showGrid: !s.view.showGrid });
      else if (k === 'o') s.setView({ onion: !s.view.onion });
      else if (k === 't') s.setView({ trail: !s.view.trail });
      else if (k === 'h') s.setView({ showHitbox: !s.view.showHitbox });
      else if (k === 'n') s.setView({ showNatural: !s.view.showNatural });
      else if (k === 'p') s.setView({ showPivot: !s.view.showPivot });
      else if (k === 'b') s.setView({ showBounds: !s.view.showBounds });
      else if (k === 'z') sceneApi.current?.resetView();
      else if (k === 'f') sceneApi.current?.focusSprite();
      else if (k === 'e') setShowExport(true);
      else if (k === 'escape') setShowExport(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* global drag & drop */
  useEffect(() => {
    const over = (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    };
    const leave = () => setDragging(false);
    const drop = async (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      const asset = files.length === 1 ? await buildAssetFromFile(files[0]) : await buildAssetFromFiles(files);
      useLab.getState().loadAsset(asset);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, []);

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#070b14] text-slate-200">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800/80 bg-slate-950/70 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-black text-slate-950">
            SL
          </div>
          <div>
            <h1 className="text-[13px] font-bold leading-tight tracking-tight text-slate-100">
              SpriteLab <span className="text-cyan-400">·</span> laboratório de animações
            </h1>
            <p className="text-[10px] leading-tight text-slate-500">
              React + Phaser · teste tamanhos, proporções, movimento e exporte JSON
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 font-mono text-[10px] text-slate-500 md:flex">
          <span className="rounded-md bg-slate-900 px-2 py-1 ring-1 ring-slate-800">
            {asset.name || '—'} · {asset.width}×{asset.height}
          </span>
          <span className="rounded-md bg-slate-900 px-2 py-1 ring-1 ring-slate-800">
            {asset.frameW}×{asset.frameH} → {frames.length} frames
          </span>
          <span className="rounded-md bg-slate-900 px-2 py-1 ring-1 ring-slate-800">{anims.length} anims</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Btn onClick={() => setHelp((v) => !v)} active={help} title="Atalhos">
            ?
          </Btn>
          <Btn
            active={showStates}
            onClick={() => useLab.getState().setView({ showStates: !showStates })}
            title="Grade de estados: todas as animações ao mesmo tempo (S)"
          >
            ⌗ estados
          </Btn>
          <Btn onClick={() => sceneApi.current?.resetView()} title="Ajustar câmera (Z)">
            reset view
          </Btn>
          <Btn variant="accent" onClick={() => setShowExport(true)} title="Exportar / importar (E)">
            ⇩ exportar json
          </Btn>
        </div>
      </header>

      {help && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-800/70 bg-slate-900/60 px-3 py-2 text-[10.5px] text-slate-400">
          <span className="flex items-center gap-1">
            <Kbd>space</Kbd> play/pause
          </span>
          <span className="flex items-center gap-1">
            <Kbd>←</Kbd>
            <Kbd>→</Kbd> frame a frame
          </span>
          <span className="flex items-center gap-1">
            <Kbd>1</Kbd>–<Kbd>9</Kbd> tocar animação
          </span>
          <span className="flex items-center gap-1">
            <Kbd>g</Kbd> grade <Kbd>b</Kbd> bounds <Kbd>n</Kbd> tamanho real <Kbd>h</Kbd> hitbox <Kbd>p</Kbd> pivô
          </span>
          <span className="flex items-center gap-1">
            <Kbd>o</Kbd> onion skin <Kbd>t</Kbd> rastro <Kbd>s</Kbd> grade de estados <Kbd>z</Kbd> câmera{' '}
            <Kbd>f</Kbd> focar <Kbd>e</Kbd> exportar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>WASD</Kbd> mover (modo teclado/física)
          </span>
        </div>
      )}

      <main className="grid min-h-0 flex-1 gap-2 overflow-y-auto p-2 lg:grid-cols-[318px_minmax(0,1fr)_332px] lg:overflow-hidden">
        <aside className="lab-scroll flex flex-col gap-2 lg:min-h-0 lg:overflow-y-auto lg:pr-0.5">
          <AssetPanel />
          <AnimsPanel />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col gap-2">
          <div className="min-h-[340px] flex-1">
            <PhaserStage />
          </div>
          <PlaybackBar />
          <Timeline />
        </section>

        <aside className="lab-scroll flex flex-col gap-2 lg:min-h-0 lg:overflow-y-auto lg:pl-0.5">
          <InspectorPanel />
          <MotionPanel />
        </aside>
      </main>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-cyan-500/10 backdrop-blur-sm">
          <div
            className={cn(
              'rounded-2xl border-2 border-dashed border-cyan-400/70 bg-slate-950/80 px-10 py-8 text-center',
            )}
          >
            <div className="text-2xl">🖼️</div>
            <div className="mt-2 text-sm font-semibold text-cyan-200">Solte a spritesheet aqui</div>
            <div className="text-[11px] text-slate-400">
              1 imagem (sheet) ou várias imagens (serão montadas em atlas)
            </div>
          </div>
        </div>
      )}

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}

export default App;

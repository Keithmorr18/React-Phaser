import { useEffect, useRef, type ReactNode } from "react";
import Phaser from "phaser";
import { LabScene } from "./LabScene";
import { useLab } from "../lab/store";
import { cn } from "../utils/cn";

export function PhaserPreview() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { state, dispatch } = useLab();
  const p = state.preview;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let destroyed = false;
    const w = Math.max(320, host.clientWidth);
    const h = Math.max(240, host.clientHeight);

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: w,
      height: h,
      backgroundColor: "#0c0e14",
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: 900 }, debug: false },
      },
      scene: LabScene,
      scale: { mode: Phaser.Scale.NONE },
      audio: { noAudio: true },
      render: { pixelArt: true, antialias: false },
    });
    gameRef.current = game;

    const ro = new ResizeObserver(() => {
      if (destroyed || !game.scale) return;
      const nw = Math.max(320, host.clientWidth);
      const nh = Math.max(240, host.clientHeight);
      game.scale.resize(nw, nh);
    });
    ro.observe(host);

    return () => {
      destroyed = true;
      ro.disconnect();
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0b0d14]">
      <div className="flex items-center gap-1 border-b border-white/6 px-2 py-1.5">
        <ModeBtn
          active={p.studioMode}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { studioMode: true } })}
        >
          Estúdio
        </ModeBtn>
        <ModeBtn
          active={!p.studioMode}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { studioMode: false } })}
        >
          Arena
        </ModeBtn>
        <div className="mx-1 h-4 w-px bg-white/10" />
        <TinyToggle
          label="Grade"
          on={p.showGrid}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { showGrid: !p.showGrid } })}
        />
        <TinyToggle
          label="Origem"
          on={p.showOrigin}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { showOrigin: !p.showOrigin } })}
        />
        <TinyToggle
          label="Hitbox"
          on={p.showHitbox}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { showHitbox: !p.showHitbox } })}
        />
        <TinyToggle
          label="Bounds"
          on={p.showBounds}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { showBounds: !p.showBounds } })}
        />
        <TinyToggle
          label="Régua"
          on={p.showRulers}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { showRulers: !p.showRulers } })}
        />
        <TinyToggle
          label="Onion"
          on={p.showOnion}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { showOnion: !p.showOnion } })}
        />
        <TinyToggle
          label="1x 2x 4x"
          on={p.showScaleCompare}
          onClick={() => dispatch({ type: "SET_PREVIEW", patch: { showScaleCompare: !p.showScaleCompare } })}
        />
        <div className="ml-auto flex items-center gap-1">
          {(["checkers", "dark", "magenta", "dungeon", "sky"] as const).map((bg) => (
            <button
              key={bg}
              title={bg}
              onClick={() => dispatch({ type: "SET_PREVIEW", patch: { background: bg } })}
              className={cn(
                "h-4 w-4 rounded-sm border border-white/15",
                p.background === bg && "ring-2 ring-cyan-300 ring-offset-1 ring-offset-[#0b0d14]",
                bg === "checkers" && "checker-sm",
                bg === "dark" && "bg-zinc-950",
                bg === "magenta" && "bg-[#ff00ff]",
                bg === "dungeon" && "bg-[#1b2230]",
                bg === "sky" && "bg-sky-400",
              )}
            />
          ))}
          <div className="ml-2 flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            <span>zoom</span>
            {[1, 1.5, 2].map((z) => (
              <button
                key={z}
                onClick={() => dispatch({ type: "SET_PREVIEW", patch: { cameraZoom: z } })}
                className={cn(
                  "rounded px-1.5 py-0.5",
                  p.cameraZoom === z ? "bg-cyan-400/20 text-cyan-200" : "hover:text-white",
                )}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>
      </div>
      <div ref={hostRef} className="relative min-h-0 flex-1" />
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide",
        active ? "bg-cyan-400/15 text-cyan-200" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}

function TinyToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider",
        on ? "text-cyan-300" : "text-zinc-500 hover:text-zinc-300",
      )}
    >
      {label}
    </button>
  );
}

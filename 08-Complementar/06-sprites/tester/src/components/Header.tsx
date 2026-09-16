import { useRef, useState } from "react";
import { useLab } from "../lab/store";
import { Btn } from "./ui";
import { cn } from "../utils/cn";

export function Header() {
  const { loadFiles, loadDemo, dispatch, importProjectFile } = useLab();
  const imgRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [demos, setDemos] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/8 bg-[#0c1018] px-3">
      <div className="flex items-center gap-2.5">
        <div className="relative grid h-8 w-8 grid-cols-2 gap-0.5 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 p-1.5 shadow-[0_0_18px_rgba(34,211,238,0.35)]">
          <span className="rounded-[2px] bg-white/90" />
          <span className="rounded-[2px] bg-white/40" />
          <span className="rounded-[2px] bg-white/55" />
          <span className="rounded-[2px] bg-white/25" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-extrabold tracking-[0.18em] text-white">SPRITE LAB</div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-cyan-400/80">Laboratório de animações</div>
        </div>
      </div>

      <div className="ml-4 h-6 w-px bg-white/10" />

      <Btn variant="solid" onClick={() => imgRef.current?.click()}>
        Importar folha
      </Btn>
      <Btn variant="ghost" onClick={() => jsonRef.current?.click()}>
        Abrir JSON
      </Btn>
      <div className="relative">
        <Btn variant="ghost" onClick={() => setDemos((v) => !v)}>
          Demos ▾
        </Btn>
        {demos && (
          <div className="absolute left-0 top-9 z-40 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#121826] py-1 shadow-2xl">
            {(
              [
                ["astra", "Astra, a Cavaleira", "48×48 · 10 estados"],
                ["blobu", "Blobu, o Slime", "16×16 · 6 estados"],
                ["burst", "Burst FX", "32×32 · explosão"],
              ] as const
            ).map(([id, name, blurb]) => (
              <button
                key={id}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-white/5"
                onClick={() => {
                  loadDemo(id);
                  setDemos(false);
                }}
              >
                <span className="text-xs font-medium text-zinc-100">{name}</span>
                <span className="font-mono text-[10px] text-zinc-500">{blurb}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Btn variant="ghost" onClick={() => dispatch({ type: "SET_UI", patch: { helpOpen: true } })}>
          Atalhos
        </Btn>
        <Btn variant="cyan" onClick={() => dispatch({ type: "SET_UI", patch: { exportOpen: true } })}>
          Exportar JSON
        </Btn>
      </div>

      <input
        ref={imgRef}
        type="file"
        accept="image/png,image/webp,image/gif,image/jpeg"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void loadFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={jsonRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importProjectFile(f);
          e.target.value = "";
        }}
      />
      {demos && <button className="fixed inset-0 z-30 cursor-default" onClick={() => setDemos(false)} />}
    </header>
  );
}

export function StatusBar() {
  const { state, frames, activeAnim } = useLab();
  const a = state.asset;
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-white/8 bg-[#0c1018] px-3 font-mono text-[10px] text-zinc-500">
      <span className={cn(a ? "text-zinc-300" : "")}>{a ? a.name : "sem asset"}</span>
      {a && (
        <>
          <span>
            imagem {a.width}×{a.height}
          </span>
          <span>
            quadro {state.slice.frameWidth}×{state.slice.frameHeight}
          </span>
          <span>{frames.length} frames</span>
        </>
      )}
      <span className="text-cyan-400/80">{activeAnim ? `${activeAnim.key} @ ${activeAnim.frameRate} fps` : "sem animação"}</span>
      <span>
        estado vivo: {state.liveState}:{state.liveFrame}
      </span>
      <span className="ml-auto text-zinc-600">Phaser 3 · pixel art lab</span>
    </footer>
  );
}

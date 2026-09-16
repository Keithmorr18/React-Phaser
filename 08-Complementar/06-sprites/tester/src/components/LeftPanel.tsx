import { useState } from "react";
import { useLab } from "../lab/store";
import { SliceEditor } from "./SliceEditor";
import { AnimList } from "./AnimList";
import { cn } from "../utils/cn";

export function LeftPanel() {
  const { loadFiles, state } = useLab();
  const [over, setOver] = useState(false);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-white/8 bg-[#0c1018]">
      <div
        className={cn(
          "mx-2 mt-2 rounded-xl border border-dashed px-3 py-3 text-center transition",
          over ? "border-cyan-400 bg-cyan-400/10" : "border-white/12 bg-white/3",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) void loadFiles(e.dataTransfer.files);
        }}
      >
        <div className="text-xs font-medium text-zinc-200">Solte PNG, WebP ou vários frames</div>
        <div className="mt-0.5 text-[10px] text-zinc-500">
          Uma folha = recorte em grade · vários arquivos = pack automático
        </div>
        {state.asset && (
          <div className="mt-2 font-mono text-[10px] text-cyan-300/80">
            {state.asset.name} · {state.asset.width}×{state.asset.height}
          </div>
        )}
      </div>
      <SliceEditor />
      <AnimList />
    </aside>
  );
}

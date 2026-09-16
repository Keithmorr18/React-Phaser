import { useState } from "react";
import { useLab } from "../lab/store";
import { PRESET_STATES } from "../lab/types";
import { Btn } from "./ui";
import { cn } from "../utils/cn";

export function AnimList() {
  const { state, dispatch, activeAnim } = useLab();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-[210px] shrink-0 flex-col border-t border-white/8">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Estados / animações</span>
        <div className="relative">
          <Btn variant="solid" onClick={() => setOpen((v) => !v)}>
            + estado
          </Btn>
          {open && (
            <div className="absolute bottom-8 right-0 z-30 max-h-64 w-44 overflow-auto rounded-lg border border-white/10 bg-[#121826] py-1 shadow-xl">
              <button
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/5"
                onClick={() => {
                  dispatch({ type: "ADD_ANIM" });
                  setOpen(false);
                }}
              >
                em branco
              </button>
              {PRESET_STATES.map((p) => (
                <button
                  key={p.key}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-white/5"
                  onClick={() => {
                    dispatch({ type: "ADD_ANIM", preset: p });
                    setOpen(false);
                  }}
                >
                  {p.name}
                  <span className="ml-1 font-mono text-[10px] text-zinc-600">{p.key}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-auto px-1.5 pb-2">
        {state.animations.length === 0 && (
          <p className="px-2 py-3 text-[11px] text-zinc-500">Crie um estado e dê um duplo clique nos quadros da folha para adicioná-los.</p>
        )}
        {state.animations.map((a, i) => {
          const active = a.id === activeAnim?.id;
          return (
            <div
              key={a.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5",
                active ? "bg-cyan-400/10" : "hover:bg-white/4",
              )}
              onClick={() => dispatch({ type: "SET_ACTIVE_ANIM", id: a.id })}
            >
              <span className="font-mono text-[10px] text-zinc-600">{i + 1}</span>
              <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-zinc-100">{a.name}</div>
                <div className="font-mono text-[10px] text-zinc-500">
                  {a.key} · {a.frames.length}f · {a.frameRate}fps
                </div>
              </div>
              <button
                className="hidden text-[10px] text-zinc-500 group-hover:inline hover:text-zinc-200"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "DUPLICATE_ANIM", id: a.id });
                }}
              >
                copiar
              </button>
              <button
                className="hidden text-[10px] text-rose-400/80 group-hover:inline hover:text-rose-300"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "DELETE_ANIM", id: a.id });
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

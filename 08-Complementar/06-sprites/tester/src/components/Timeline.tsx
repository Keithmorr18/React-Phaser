import { useLab } from "../lab/store";
import { Btn, FrameThumb } from "./ui";
import { cn } from "../utils/cn";

export function Timeline() {
  const { state, dispatch, frames, activeAnim } = useLab();
  const asset = state.asset;
  const playing = state.playback.playing;

  function step(dir: number) {
    if (!activeAnim || !activeAnim.frames.length) return;
    const len = activeAnim.frames.length;
    const next = (state.playback.currentFrame + dir + len) % len;
    dispatch({ type: "SET_PLAYBACK", patch: { currentFrame: next, playing: false } });
  }

  return (
    <div className="flex h-[168px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0c1018]">
      <div className="flex items-center gap-2 border-b border-white/6 px-2 py-1.5">
        <Btn variant="solid" onClick={() => dispatch({ type: "SET_PLAYBACK", patch: { playing: !playing } })}>
          {playing ? "Pausar" : "Play"}
        </Btn>
        <Btn onClick={() => step(-1)}>◂</Btn>
        <Btn onClick={() => step(1)}>▸</Btn>
        <Btn
          onClick={() =>
            dispatch({
              type: "SET_PLAYBACK",
              patch: { playing: false, currentFrame: 0 },
            })
          }
        >
          Stop
        </Btn>
        <div className="mx-1 h-4 w-px bg-white/10" />
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">velocidade</span>
        {[0.25, 0.5, 1, 1.5, 2].map((sp) => (
          <button
            key={sp}
            onClick={() => dispatch({ type: "SET_PLAYBACK", patch: { speed: sp } })}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px]",
              state.playback.speed === sp ? "bg-cyan-400/20 text-cyan-200" : "text-zinc-500 hover:text-zinc-200",
            )}
          >
            {sp}x
          </button>
        ))}
        <div className="ml-auto truncate font-mono text-[10px] text-zinc-500">
          {activeAnim
            ? `${activeAnim.name} · quadro ${Math.min(state.playback.currentFrame + 1, activeAnim.frames.length)}/${activeAnim.frames.length} · live ${state.liveFrame}`
            : "nenhuma animação selecionada"}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center gap-1 overflow-x-auto px-2 py-2">
        {!asset && <p className="text-xs text-zinc-500">Importe uma folha de sprites para começar.</p>}
        {asset && activeAnim && activeAnim.frames.length === 0 && (
          <p className="text-xs text-zinc-500">Selecione quadros na folha e clique “+ à animação”, ou dê um duplo clique.</p>
        )}
        {asset &&
          activeAnim?.frames.map((idx, i) => {
            const frame = frames[idx];
            if (!frame) return null;
            const current = i === state.playback.currentFrame || state.liveFrame === idx;
            const zoom = Math.min(2.4, 88 / Math.max(frame.w, frame.h));
            return (
              <div
                key={`${idx}-${i}`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (Number.isFinite(from)) dispatch({ type: "MOVE_FRAME_IN_ANIM", from, to: i });
                }}
                onClick={() => dispatch({ type: "SET_PLAYBACK", patch: { currentFrame: i, playing: false } })}
                className={cn(
                  "group relative flex shrink-0 flex-col items-center gap-1 rounded-lg border p-1",
                  current ? "border-cyan-400 bg-cyan-400/10" : "border-white/8 bg-black/20 hover:border-white/20",
                )}
              >
                <div className="checker-sm overflow-hidden rounded">
                  <FrameThumb dataUrl={asset.dataUrl} imgW={asset.width} imgH={asset.height} frame={frame} zoom={zoom} />
                </div>
                <span className="font-mono text-[9px] text-zinc-500">{idx}</span>
                <button
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white group-hover:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "REMOVE_FRAME_FROM_ANIM", indexInAnim: i });
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

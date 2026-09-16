import { useEffect, useRef } from "react";
import { useLab } from "../lab/store";
import { leftover } from "../lab/geometry";
import { Btn } from "./ui";

export function SliceEditor() {
  const { state, frames, dispatch, image } = useLab();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastClick = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const asset = state.asset;
  const zoom = state.ui.sliceZoom;
  const panX = state.ui.slicePanX;
  const panY = state.ui.slicePanY;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !asset) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a0c12";
    ctx.fillRect(0, 0, w, h);

    const size = 8;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const on = ((x / size) | 0) % 2 === ((y / size) | 0) % 2;
        ctx.fillStyle = on ? "#141824" : "#10131b";
        ctx.fillRect(x, y, size, size);
      }
    }

    if (image && image.complete) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, panX, panY, asset.width * zoom, asset.height * zoom);
    }

    const anim = state.animations.find((a) => a.id === state.activeAnimId);
    const animSet = new Set(anim?.frames ?? []);

    frames.forEach((f) => {
      const x = panX + f.x * zoom;
      const y = panY + f.y * zoom;
      const fw = f.w * zoom;
      const fh = f.h * zoom;
      const selected = state.selectedFrames.includes(f.index);
      const inAnim = animSet.has(f.index);
      ctx.strokeStyle = selected ? "#22d3ee" : inAnim ? anim?.color ?? "#a78bfa" : "rgba(255,255,255,0.16)";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, fw - 1, fh - 1);
      if (selected) {
        ctx.fillStyle = "rgba(34,211,238,0.12)";
        ctx.fillRect(x, y, fw, fh);
      }
      ctx.fillStyle = selected ? "#22d3ee" : "rgba(255,255,255,0.45)";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(String(f.index), x + 3, y + 11);
    });
  }, [asset, image, frames, zoom, panX, panY, state.selectedFrames, state.activeAnimId, state.animations]);

  function hitFrame(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || !asset) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - panX) / zoom;
    const y = (clientY - rect.top - panY) / zoom;
    return frames.find((f) => x >= f.x && y >= f.y && x < f.x + f.w && y < f.y + f.h) ?? null;
  }

  const rem = asset ? leftover(asset.width, asset.height, state.slice) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Folha / recorte</span>
        <div className="flex items-center gap-1">
          <Btn
            onClick={() => dispatch({ type: "SET_UI", patch: { sliceZoom: Math.max(0.25, zoom / 1.25) } })}
          >
            −
          </Btn>
          <span className="w-10 text-center font-mono text-[10px] text-zinc-400">{zoom.toFixed(2)}x</span>
          <Btn onClick={() => dispatch({ type: "SET_UI", patch: { sliceZoom: Math.min(16, zoom * 1.25) } })}>+</Btn>
          <Btn
            onClick={() => {
              if (!asset || !canvasRef.current) return;
              const cw = canvasRef.current.clientWidth - 32;
              const ch = canvasRef.current.clientHeight - 32;
              const z = Math.max(0.2, Math.min(cw / asset.width, ch / asset.height));
              dispatch({ type: "SET_UI", patch: { sliceZoom: z, slicePanX: 16, slicePanY: 16 } });
            }}
          >
            caber
          </Btn>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 px-2 pb-2">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair rounded-lg border border-white/8"
          onWheel={(e) => {
            e.preventDefault();
            const next = e.deltaY > 0 ? zoom / 1.12 : zoom * 1.12;
            dispatch({ type: "SET_UI", patch: { sliceZoom: Math.min(16, Math.max(0.25, next)) } });
          }}
          onPointerDown={(e) => {
            if (e.button === 1 || e.button === 2 || e.altKey) {
              drag.current = { x: e.clientX, y: e.clientY, panX, panY };
              return;
            }
            const f = hitFrame(e.clientX, e.clientY);
            if (!f) {
              dispatch({ type: "SET_SELECTED_FRAMES", frames: [] });
              return;
            }
            if (e.shiftKey && lastClick.current != null) {
              dispatch({ type: "SELECT_RANGE", from: lastClick.current, to: f.index });
            } else {
              dispatch({ type: "TOGGLE_FRAME", frame: f.index, additive: e.metaKey || e.ctrlKey });
              lastClick.current = f.index;
            }
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            dispatch({
              type: "SET_UI",
              patch: {
                slicePanX: drag.current.panX + (e.clientX - drag.current.x),
                slicePanY: drag.current.panY + (e.clientY - drag.current.y),
              },
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerLeave={() => {
            drag.current = null;
          }}
          onDoubleClick={(e) => {
            const f = hitFrame(e.clientX, e.clientY);
            if (!f) return;
            dispatch({ type: "SET_SELECTED_FRAMES", frames: [f.index] });
            dispatch({ type: "ADD_SELECTION_TO_ANIM" });
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      {rem && (rem.remX > 0 || rem.remY > 0) && (
        <div className="px-3 pb-2 font-mono text-[10px] text-amber-300">
          sobra {rem.remX}px × {rem.remY}px — o recorte não cobre a folha inteira
        </div>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { useLab } from "../lab/store";
import { analyzeFrames, bboxVariance, leftover, suggestFrameSizes, suggestHitbox, suggestOriginFromFeet } from "../lab/geometry";
import { Btn, Field, NumInput, Section, Slider, TextInput, Toggle } from "./ui";
import { cn } from "../utils/cn";
import type { UiState } from "../lab/types";

const TABS: { id: UiState["rightTab"]; label: string }[] = [
  { id: "slice", label: "Recorte" },
  { id: "transform", label: "Transform" },
  { id: "collision", label: "Colisão" },
  { id: "move", label: "Movimento" },
  { id: "diag", label: "Diagnóstico" },
];

export function Inspector() {
  const { state, dispatch, frames, activeAnim, image } = useLab();
  const tab = state.ui.rightTab;

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-white/8 bg-[#0c1018]">
      <div className="flex border-b border-white/8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: "SET_UI", patch: { rightTab: t.id } })}
            className={cn(
              "flex-1 px-1 py-2 text-[10px] font-medium uppercase tracking-wide",
              tab === t.id ? "border-b-2 border-cyan-400 text-cyan-200" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3">
        {tab === "slice" && <SliceTab />}
        {tab === "transform" && <TransformTab />}
        {tab === "collision" && <CollisionTab />}
        {tab === "move" && <MoveTab />}
        {tab === "diag" && <DiagTab image={image} />}
        {activeAnim && <AnimEdit />}
      </div>
      <div className="border-t border-white/8 p-2 text-[10px] text-zinc-500">
        {frames.length} quadros · selecionados {state.selectedFrames.length}
        <div className="mt-1 flex gap-1">
          <Btn
            variant="solid"
            className="flex-1"
            onClick={() => dispatch({ type: "ADD_SELECTION_TO_ANIM" })}
            disabled={!activeAnim || !state.selectedFrames.length}
          >
            + à animação
          </Btn>
          <Btn
            variant="ghost"
            onClick={() =>
              dispatch({ type: "SET_SELECTED_FRAMES", frames: frames.map((f) => f.index) })
            }
          >
            todos
          </Btn>
        </div>
      </div>
    </aside>
  );
}

function SliceTab() {
  const { state, dispatch, frames } = useLab();
  const s = state.slice;
  const asset = state.asset;
  const suggestions = asset ? suggestFrameSizes(asset.width, asset.height).slice(0, 10) : [];
  const rem = asset ? leftover(asset.width, asset.height, s) : null;

  function set(partial: Partial<typeof s>) {
    if (partial.frameWidth != null && s.lockAspect) {
      dispatch({ type: "SET_SLICE", slice: { ...partial, frameHeight: partial.frameWidth } });
      return;
    }
    if (partial.frameHeight != null && s.lockAspect) {
      dispatch({ type: "SET_SLICE", slice: { ...partial, frameWidth: partial.frameHeight } });
      return;
    }
    dispatch({ type: "SET_SLICE", slice: partial });
  }

  return (
    <>
      <Section title="Tamanho do quadro">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Largura">
            <NumInput value={s.frameWidth} min={1} onChange={(n) => set({ frameWidth: n })} />
          </Field>
          <Field label="Altura">
            <NumInput value={s.frameHeight} min={1} onChange={(n) => set({ frameHeight: n })} />
          </Field>
          <Field label="Margem">
            <NumInput value={s.margin} min={0} onChange={(n) => set({ margin: n })} />
          </Field>
          <Field label="Espaçamento">
            <NumInput value={s.spacing} min={0} onChange={(n) => set({ spacing: n })} />
          </Field>
          <Field label="Offset X">
            <NumInput value={s.offsetX} onChange={(n) => set({ offsetX: n })} />
          </Field>
          <Field label="Offset Y">
            <NumInput value={s.offsetY} onChange={(n) => set({ offsetY: n })} />
          </Field>
        </div>
        <Toggle on={s.lockAspect} onChange={(v) => set({ lockAspect: v })} label="Travar proporção 1:1" />
        <div className="flex flex-wrap gap-1 pt-1">
          {[8, 16, 24, 32, 48, 64, 96, 128].map((n) => (
            <button
              key={n}
              onClick={() => set({ frameWidth: n, frameHeight: s.lockAspect ? n : s.frameHeight })}
              className={cn(
                "rounded border border-white/8 px-1.5 py-0.5 font-mono text-[10px]",
                s.frameWidth === n ? "bg-cyan-400/15 text-cyan-200" : "text-zinc-400 hover:text-white",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </Section>
      {rem && (
        <p className="font-mono text-[10px] text-zinc-500">
          grade {rem.cols}×{rem.rows} = {frames.length} frames
        </p>
      )}
      {suggestions.length > 0 && (
        <Section title="Sugestões que cabem na folha">
          <div className="flex flex-col gap-0.5">
            {suggestions.map((g) => (
              <button
                key={`${g.w}x${g.h}`}
                className="flex justify-between rounded px-1.5 py-1 font-mono text-[10px] text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                onClick={() =>
                  dispatch({
                    type: "SET_SLICE",
                    slice: { frameWidth: g.w, frameHeight: g.h, lockAspect: g.w === g.h },
                  })
                }
              >
                <span>
                  {g.w}×{g.h}
                </span>
                <span>
                  {g.cols}×{g.rows} · {g.frames}f
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function TransformTab() {
  const { state, dispatch } = useLab();
  const p = state.preview;
  const set = (patch: Partial<typeof p>) => dispatch({ type: "SET_PREVIEW", patch });
  return (
    <>
      <Section title="Escala e origem">
        <Field label="Escala do sprite" hint="jogo">
          <Slider min={0.25} max={12} step={0.25} value={p.scale} onChange={(n) => set({ scale: n })} />
        </Field>
        <Field label="Zoom da câmera">
          <Slider min={0.5} max={3} step={0.1} value={p.cameraZoom} onChange={(n) => set({ cameraZoom: n })} />
        </Field>
        <Field label="Origem X" hint="0–1">
          <Slider min={0} max={1} step={0.01} value={p.originX} onChange={(n) => set({ originX: n })} />
        </Field>
        <Field label="Origem Y" hint="0–1">
          <Slider min={0} max={1} step={0.01} value={p.originY} onChange={(n) => set({ originY: n })} />
        </Field>
        <div className="grid grid-cols-3 gap-1">
          {[
            [0, 0, "↖"],
            [0.5, 0, "↑"],
            [1, 0, "↗"],
            [0, 0.5, "←"],
            [0.5, 0.5, "·"],
            [1, 0.5, "→"],
            [0, 1, "↙"],
            [0.5, 1, "↓"],
            [1, 1, "↘"],
          ].map(([x, y, g]) => (
            <button
              key={`${x}${y}`}
              onClick={() => set({ originX: Number(x), originY: Number(y) })}
              className={cn(
                "rounded border border-white/8 py-1 text-xs",
                p.originX === x && p.originY === y ? "bg-fuchsia-400/20 text-fuchsia-200" : "text-zinc-400",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Aparência">
        <Field label="Rotação">
          <Slider min={-180} max={180} step={1} value={p.rotation} onChange={(n) => set({ rotation: n })} />
        </Field>
        <Field label="Alpha">
          <Slider min={0} max={1} step={0.01} value={p.alpha} onChange={(n) => set({ alpha: n })} />
        </Field>
        <Field label="Tint">
          <input
            type="color"
            value={p.tint}
            onChange={(e) => set({ tint: e.target.value })}
            className="h-8 w-full cursor-pointer rounded border border-white/10 bg-transparent"
          />
        </Field>
        <Toggle on={p.flipX} onChange={(v) => set({ flipX: v })} label="Espelhar X" />
        <Toggle on={p.flipY} onChange={(v) => set({ flipY: v })} label="Espelhar Y" />
        <Toggle on={p.pixelArt} onChange={(v) => set({ pixelArt: v })} label="Pixel art (sem blur)" />
        <Toggle on={p.showShadow} onChange={(v) => set({ showShadow: v })} label="Sombra" />
        <Field label="Tamanho do tile (régua)">
          <NumInput value={p.tileSize} min={4} onChange={(n) => set({ tileSize: n })} />
        </Field>
        <Btn variant="solid" onClick={() => dispatch({ type: "RESET_PREVIEW" })}>
          resetar transform
        </Btn>
      </Section>
    </>
  );
}

function CollisionTab() {
  const { state, dispatch, image, frames } = useLab();
  const h = state.hitbox;
  return (
    <Section title="Hitbox Arcade">
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Offset relativo ao canto superior esquerdo do quadro. Use o overlay ciano no preview.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Offset X">
          <NumInput value={h.x} onChange={(n) => dispatch({ type: "SET_HITBOX", patch: { x: n } })} />
        </Field>
        <Field label="Offset Y">
          <NumInput value={h.y} onChange={(n) => dispatch({ type: "SET_HITBOX", patch: { y: n } })} />
        </Field>
        <Field label="Largura">
          <NumInput value={h.w} min={1} onChange={(n) => dispatch({ type: "SET_HITBOX", patch: { w: n } })} />
        </Field>
        <Field label="Altura">
          <NumInput value={h.h} min={1} onChange={(n) => dispatch({ type: "SET_HITBOX", patch: { h: n } })} />
        </Field>
      </div>
      <Btn
        variant="solid"
        onClick={() => {
          if (!image) return;
          const analysis = analyzeFrames(image, frames);
          dispatch({ type: "SET_HITBOX", patch: suggestHitbox(analysis, state.slice.frameWidth, state.slice.frameHeight) });
        }}
      >
        ajustar aos pixels
      </Btn>
      <Btn
        variant="ghost"
        onClick={() => {
          if (!image) return;
          const analysis = analyzeFrames(image, frames);
          const o = suggestOriginFromFeet(analysis, state.slice.frameWidth, state.slice.frameHeight);
          dispatch({ type: "SET_PREVIEW", patch: { originX: o.x, originY: o.y } });
        }}
      >
        origem nos pés
      </Btn>
    </Section>
  );
}

function MoveTab() {
  const { state, dispatch } = useLab();
  const m = state.movement;
  const set = (patch: Partial<typeof m>) => dispatch({ type: "SET_MOVEMENT", patch });
  return (
    <Section title="Teste de movimento">
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Mude para o modo Arena no preview. A máquina de estados troca idle / walk / run / jump / fall / crouch sozinha.
      </p>
      <Field label="Velocidade">
        <Slider min={20} max={400} step={5} value={m.speed} onChange={(n) => set({ speed: n })} />
      </Field>
      <Field label="Multiplicador corrida">
        <Slider min={1} max={3} step={0.05} value={m.runMultiplier} onChange={(n) => set({ runMultiplier: n })} />
      </Field>
      <Field label="Impulso do pulo">
        <Slider min={80} max={700} step={10} value={m.jumpForce} onChange={(n) => set({ jumpForce: n })} />
      </Field>
      <Field label="Gravidade">
        <Slider min={0} max={2000} step={10} value={m.gravity} onChange={(n) => set({ gravity: n })} />
      </Field>
      <Field label="Controle no ar">
        <Slider min={0} max={1} step={0.05} value={m.airControl} onChange={(n) => set({ airControl: n })} />
      </Field>
      <div className="rounded-lg border border-white/8 bg-white/3 p-2 font-mono text-[10px] leading-relaxed text-zinc-400">
        WASD / setas — mover
        <br />
        Shift — correr · Espaço — pular
        <br />
        J — attack · K — cast · S — crouch
      </div>
    </Section>
  );
}

function DiagTab({ image }: { image: HTMLImageElement | null }) {
  const { state, frames } = useLab();
  const analysis = useMemo(() => (image ? analyzeFrames(image, frames) : []), [image, frames]);
  const empty = analysis.filter((a) => a.empty).length;
  const variance = bboxVariance(analysis);
  const asset = state.asset;
  const displayW = Math.round(state.slice.frameWidth * state.preview.scale);
  const displayH = Math.round(state.slice.frameHeight * state.preview.scale);
  const tilesH = state.slice.frameHeight / Math.max(1, state.preview.tileSize);

  return (
    <Section title="Proporções e qualidade">
      <div className="space-y-1.5 font-mono text-[11px] text-zinc-300">
        <Row k="quadro" v={`${state.slice.frameWidth}×${state.slice.frameHeight} px`} />
        <Row k="na tela (escala)" v={`${displayW}×${displayH} px`} />
        <Row k="altura em tiles" v={`${tilesH.toFixed(2)} × ${state.preview.tileSize}px`} />
        {asset && <Row k="folha" v={`${asset.width}×${asset.height}`} />}
        <Row k="quadros vazios" v={String(empty)} />
        <Row k="variação bbox" v={`${variance.w}×${variance.h} px`} />
      </div>
      {variance.inconsistent && (
        <p className="rounded-md bg-amber-400/10 px-2 py-1.5 text-[11px] text-amber-200">
          Quadros com silhuetas inconsistentes. Confira o recorte ou o espaçamento.
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Fundo magenta no preview revela pixels sobrando. Compare 1x 2x 4x para validar a escala do jogo.
      </p>
    </Section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-500">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function AnimEdit() {
  const { activeAnim, dispatch } = useLab();
  if (!activeAnim) return null;
  return (
    <Section title="Animação ativa">
      <Field label="Nome">
        <TextInput value={activeAnim.name} onChange={(v) => dispatch({ type: "UPDATE_ANIM", id: activeAnim.id, patch: { name: v } })} />
      </Field>
      <Field label="Key (Phaser)">
        <TextInput value={activeAnim.key} onChange={(v) => dispatch({ type: "UPDATE_ANIM", id: activeAnim.id, patch: { key: v } })} />
      </Field>
      <Field label="FPS">
        <Slider
          min={1}
          max={30}
          step={1}
          value={activeAnim.frameRate}
          onChange={(n) => dispatch({ type: "UPDATE_ANIM", id: activeAnim.id, patch: { frameRate: n } })}
        />
      </Field>
      <Field label="Repeat (−1 loop)">
        <NumInput
          value={activeAnim.repeat}
          onChange={(n) => dispatch({ type: "UPDATE_ANIM", id: activeAnim.id, patch: { repeat: n } })}
        />
      </Field>
      <Toggle
        on={activeAnim.yoyo}
        onChange={(v) => dispatch({ type: "UPDATE_ANIM", id: activeAnim.id, patch: { yoyo: v } })}
        label="Yoyo / ping-pong"
      />
    </Section>
  );
}

import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import type { FrameRect } from "../lab/types";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
        {hint && <span className="font-mono normal-case tracking-normal text-zinc-600">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function NumInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "w-full rounded-md border border-white/8 bg-black/30 px-2 py-1 font-mono text-xs text-zinc-100 outline-none focus:border-cyan-400/40",
        className,
      )}
    />
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-white/8 bg-black/30 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-400/40"
    />
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
      <span className="w-10 text-right font-mono text-[10px] text-zinc-400">{trimNum(value)}</span>
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex items-center justify-between gap-3 py-1 text-left text-xs text-zinc-300"
    >
      <span>{label}</span>
      <span className={cn("relative h-4 w-7 rounded-full transition", on ? "bg-cyan-400" : "bg-zinc-700")}>
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition",
            on ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "solid" | "cyan" | "danger";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40",
        variant === "ghost" && "text-zinc-300 hover:bg-white/6",
        variant === "solid" && "border border-white/10 bg-white/6 text-zinc-200 hover:bg-white/10",
        variant === "cyan" && "bg-cyan-400 text-zinc-950 hover:bg-cyan-300",
        variant === "danger" && "text-rose-300 hover:bg-rose-400/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FrameThumb({
  dataUrl,
  imgW,
  imgH,
  frame,
  zoom,
  className,
}: {
  dataUrl: string;
  imgW: number;
  imgH: number;
  frame: FrameRect;
  zoom: number;
  className?: string;
}) {
  return (
    <div
      className={cn("pixelated shrink-0", className)}
      style={{
        width: Math.max(1, frame.w * zoom),
        height: Math.max(1, frame.h * zoom),
        backgroundImage: `url(${dataUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `-${frame.x * zoom}px -${frame.y * zoom}px`,
        backgroundSize: `${imgW * zoom}px ${imgH * zoom}px`,
      }}
    />
  );
}

export function Section({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

function trimNum(n: number) {
  return String(Math.round(n * 100) / 100);
}

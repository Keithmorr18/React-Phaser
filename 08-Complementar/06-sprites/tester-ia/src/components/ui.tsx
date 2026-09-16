import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export function Panel({
  title,
  children,
  actions,
  className,
  icon,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-slate-800/80 bg-slate-900/40 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]',
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b border-slate-800/70 px-3 py-2">
        {icon && <span className="text-xs text-cyan-400/80">{icon}</span>}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">{title}</h2>
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </header>
      <div className="space-y-2.5 p-3">{children}</div>
    </section>
  );
}

export function Row({
  label,
  children,
  hint,
  wide,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2', wide && 'items-start')}>
      <label
        title={hint}
        className={cn(
          'shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500',
          wide ? 'w-full' : 'w-[74px]',
        )}
      >
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
  hint,
  digits = 2,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
  hint?: string;
  digits?: number;
}) {
  return (
    <Row label={label} hint={hint}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
      />
      <input
        type="number"
        value={Number.isFinite(value) ? +(+value).toFixed(digits) : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(+e.target.value)}
        className="w-[62px] rounded-md border border-slate-800 bg-slate-950 px-1.5 py-1 text-right font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-500/60"
      />
      {unit && <span className="w-6 text-[10px] text-slate-500">{unit}</span>}
    </Row>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-1 gap-0.5 rounded-lg bg-slate-950/70 p-0.5 ring-1 ring-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 truncate rounded-md px-1.5 py-1 text-[11px] font-medium transition',
            value === o.value
              ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      title={hint}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-slate-800/40"
    >
      <span
        className={cn(
          'relative h-4 w-7 shrink-0 rounded-full transition',
          checked ? 'bg-cyan-500/80' : 'bg-slate-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
            checked ? 'left-3.5' : 'left-0.5',
          )}
        />
      </span>
      <span className={cn('text-[11px] font-medium', checked ? 'text-slate-200' : 'text-slate-500')}>{label}</span>
    </button>
  );
}

export function Btn({
  children,
  onClick,
  variant = 'ghost',
  active,
  title,
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'solid' | 'accent' | 'danger';
  active?: boolean;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  const variants = {
    ghost: 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white',
    solid: 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700',
    accent: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25',
    danger: 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
  } as const;
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
        variants[variant],
        active && 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className,
  mono,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <label className={cn('flex min-w-0 flex-1 items-center gap-1.5', className)}>
      {label && (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'min-w-0 flex-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-cyan-500/60',
          mono && 'font-mono',
        )}
      />
    </label>
  );
}

export function Num({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(+e.target.value)}
      className={cn(
        'w-full rounded-md border border-slate-800 bg-slate-950 px-1.5 py-1 text-right font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-500/60',
        className,
      )}
    />
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'cyan' | 'amber' | 'rose' }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-2 py-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={cn(
          'font-mono text-[12px] font-semibold',
          tone === 'cyan' && 'text-cyan-300',
          tone === 'amber' && 'text-amber-300',
          tone === 'rose' && 'text-rose-300',
          !tone && 'text-slate-200',
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 font-mono text-[9px] text-slate-400">
      {children}
    </kbd>
  );
}

export function Warn({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'rose' | 'cyan' }) {
  const tones = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  } as const;
  return <div className={cn('rounded-lg border px-2 py-1.5 text-[10.5px] leading-relaxed', tones[tone])}>{children}</div>;
}

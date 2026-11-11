import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  hint,
  accent = "cyan",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "cyan" | "magenta" | "lime" | "amber";
}) {
  const ring = {
    cyan: "from-cyan-400/20",
    magenta: "from-fuchsia-400/20",
    lime: "from-lime-400/20",
    amber: "from-amber-400/20",
  }[accent];

  return (
    <div className="card relative overflow-hidden p-4 sm:p-5">
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-gradient-to-br ${ring} to-transparent blur-2xl`}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  description,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

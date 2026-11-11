import type { ReactNode } from "react";

const VARIANTS = {
  info: "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-100",
  success: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100",
  error: "border-rose-400/30 bg-rose-500/10 text-rose-100",
  warning: "border-amber-400/25 bg-amber-400/[0.07] text-amber-100",
  neutral: "border-white/10 bg-white/[0.04] text-slate-300",
} as const;

export function Notice({
  variant = "info",
  title,
  children,
  className = "",
}: {
  variant?: keyof typeof VARIANTS;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${VARIANTS[variant]} ${className}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1 opacity-90" : "opacity-90"}>{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {children ? <p className="max-w-md text-sm text-slate-400">{children}</p> : null}
      {action}
    </div>
  );
}

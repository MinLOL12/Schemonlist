import Link from "next/link";

import { demoMode } from "@/lib/config";

export function DemoBanner() {
  if (!demoMode) return null;

  return (
    <div className="border-b border-amber-400/20 bg-amber-400/[0.07]">
      <div className="shell flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
        <p className="flex items-center gap-2 text-amber-100">
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
            Demo mode
          </span>
          <span className="text-amber-100/90">
            Supabase is not configured, so data lives in memory and resets on restart.
          </span>
        </p>
        <Link href="/setup" className="font-semibold text-amber-200 underline-offset-4 hover:underline">
          Connect your database →
        </Link>
      </div>
    </div>
  );
}

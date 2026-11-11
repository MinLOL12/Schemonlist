"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-24 text-center">
      <p className="eyebrow">Something broke</p>
      <h1 className="mt-2 text-2xl font-bold text-white">An unexpected error occurred</h1>
      <p className="mt-2 text-sm text-slate-400">
        Try again. If you are the administrator, check the server logs and
        <span className="text-slate-300"> /setup</span> for database status.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">Go home</Link>
      </div>
    </div>
  );
}

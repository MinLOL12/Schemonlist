"use client";

import { useState } from "react";

function youtubeId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = parsed.pathname.slice(1).split("/")[0];
    if (host.endsWith("youtube.com")) {
      id = parsed.searchParams.get("v");
      if (!id) {
        const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/);
        if (match) id = match[1];
      }
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function VideoEmbed({
  url,
  title,
  allowEmbed = true,
}: {
  url: string | null;
  title: string;
  allowEmbed?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(url);

  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/30 text-sm text-slate-500">
        No verification video yet.
      </div>
    );
  }

  if (!allowEmbed || !id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="group relative flex aspect-video flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0b1226] via-[#0a0d1b] to-[#140a22] text-center"
      >
        <span className="absolute inset-0 grid-lines opacity-40" aria-hidden />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/15 text-cyan-200 transition group-hover:scale-105 group-hover:bg-cyan-400/25">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="relative text-sm font-semibold text-slate-200">
          Open verification video
        </span>
        <span className="relative max-w-xs text-xs text-slate-500">
          {allowEmbed ? "External link" : "Video embedding is disabled in demo mode."}
        </span>
      </a>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative aspect-video w-full overflow-hidden rounded-xl border border-white/10"
        aria-label={`Play verification video for ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:scale-[1.02] group-hover:opacity-100"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/50 backdrop-blur transition group-hover:bg-cyan-400/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-7 w-7 text-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
        <span className="absolute bottom-3 left-4 right-4 truncate text-left text-sm font-semibold text-white">
          {title} — verification
        </span>
      </button>
    );
  }

  return (
    <iframe
      className="aspect-video w-full rounded-xl border border-white/10"
      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
      title={`${title} verification video`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

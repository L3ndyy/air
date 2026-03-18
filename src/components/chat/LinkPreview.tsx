"use client";

import { useEffect, useState } from "react";

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  const seen = new Set<string>();
  return matches
    .map((u) => u.replace(/[.,;:!?)]+$/, ""))
    .filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .slice(0, 2);
}

interface OgData {
  title?: string;
  description?: string;
  image?: string;
}

export function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<OgData | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`/api/og?url=${encodeURIComponent(url)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fail"))))
      .then((d) => {
        if (!cancelled) setData(d as OgData);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url]);

  if (failed) return null;
  if (!data && !loading) return null;
  if (!data && loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="mt-2 flex items-start gap-2 rounded-md border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] p-2"
      >
        <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-md bg-[var(--air-muted)]/20" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-28 animate-pulse rounded bg-[var(--air-muted)]/20" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded bg-[var(--air-muted)]/20" />
          <div className="mt-1 h-3 w-32 animate-pulse rounded bg-[var(--air-muted)]/20" />
        </div>
      </div>
    );
  }

  if (!data) return null;
  if (!data.title && !data.description && !data.image) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="air-og-preview mt-2 block overflow-hidden rounded-md border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] no-underline [color:var(--air-text)]"
    >
      <div className="flex items-start gap-2 p-2">
        {data.image && (
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-[var(--air-glass)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.image} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {data.title && <p className="line-clamp-1 text-sm font-medium">{data.title}</p>}
          {data.description && (
            <p className="mt-0.5 line-clamp-2 text-xs [color:var(--air-text-muted)]">{data.description}</p>
          )}
          {!data.title && !data.description && data.image && (
            <p className="text-xs [color:var(--air-text-muted)]">Открыть ссылку</p>
          )}
        </div>
      </div>
    </a>
  );
}

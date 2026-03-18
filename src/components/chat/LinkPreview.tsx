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

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/og?url=${encodeURIComponent(url)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fail"))))
      .then((d) => {
        if (!cancelled) setData(d as OgData);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [url]);

  if (failed) return null;
  if (!data) return null;
  if (!data.title && !data.image) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block overflow-hidden rounded-lg border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] no-underline [color:var(--air-text)]"
    >
      {data.image && (
        <div className="aspect-video w-full overflow-hidden bg-[var(--air-glass)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      {(data.title || data.description) && (
        <div className="p-2">
          {data.title && <p className="line-clamp-1 text-sm font-medium">{data.title}</p>}
          {data.description && (
            <p className="mt-0.5 line-clamp-2 text-xs [color:var(--air-text-muted)]">{data.description}</p>
          )}
        </div>
      )}
    </a>
  );
}

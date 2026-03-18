import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE = new Map<string, { data: OgData; at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface OgData {
  title?: string;
  description?: string;
  image?: string;
}

function extractOg(html: string, baseUrl: string): OgData {
  const result: OgData = {};
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogTitle) result.title = ogTitle[1].trim().slice(0, 200);

  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
  if (ogDesc) result.description = ogDesc[1].trim().slice(0, 300);

  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogImage) {
    let src = ogImage[1].trim();
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try {
        const u = new URL(baseUrl);
        src = u.origin + src;
      } catch {
        // leave as is
      }
    }
    result.image = src.slice(0, 2048);
  }
  return result;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
  }

  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AirBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
    }
    const html = await res.text();
    const data = extractOg(html, parsed.origin);
    CACHE.set(url, { data, at: Date.now() });
    if (CACHE.size > 500) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_HASHTAG_ID = process.env.INSTAGRAM_HASHTAG_ID;

// Cache to limit API calls
let cache: { data: InstagramPost[]; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface InstagramPost {
  id: string;
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  media_type: string;
}

export async function GET() {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_HASHTAG_ID) {
    return NextResponse.json({ posts: [], configured: false });
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ posts: cache.data, configured: true });
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${INSTAGRAM_HASHTAG_ID}/recent_media?fields=id,media_url,permalink,caption,timestamp,media_type&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error("Instagram API-fel");

    const json = await res.json();
    const posts: InstagramPost[] = (json.data ?? []).filter(
      (p: InstagramPost) => p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM"
    );

    cache = { data: posts, ts: Date.now() };
    return NextResponse.json({ posts, configured: true });
  } catch {
    return NextResponse.json({ posts: [], configured: true, error: "Kunde inte hämta Instagram-bilder" });
  }
}

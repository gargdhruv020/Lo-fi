import { NextRequest, NextResponse } from "next/server";
import https from "https";

// Pure Node.js helper to search YouTube and scrape the first matching video ID
const searchYoutube = (query: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/;
          const match = data.match(regex);
          if (match && match[1]) {
            resolve(match[1]);
          } else {
            const watchRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/;
            const watchMatch = data.match(watchRegex);
            if (watchMatch && watchMatch[1]) {
              resolve(watchMatch[1]);
            } else {
              reject(new Error("Could not find any video ID in search results"));
            }
          }
        });
      }
    ).on("error", (err) => {
      reject(err);
    });
  });
};

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://pipedapi.mha.fi",
  "https://pipedapi.colossal.systems",
];

const INVIDIOUS_INSTANCES = [
  "inv.nadeko.net",
  "invidious.nerdvpn.de",
  "invidious.jing.rocks",
  "yewtu.be",
  "invidious.privacydev.net",
];

// Try to get a direct audio stream URL from Piped & Invidious instances
const getAudioUrl = async (videoId: string): Promise<string | null> => {
  // 1. Fast Piped API check
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.audioStreams && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
          const bestAudio =
            data.audioStreams.find((s: any) => s.mimeType?.includes("mp4") || s.quality?.includes("128")) ||
            data.audioStreams[0];
          if (bestAudio && bestAudio.url) {
            return bestAudio.url;
          }
        }
      }
    } catch {}
  }

  // 2. Invidious API check
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const apiUrl = `https://${instance}/api/v1/videos/${videoId}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();

      if (data.adaptiveFormats && Array.isArray(data.adaptiveFormats)) {
        const audioFormat =
          data.adaptiveFormats.find((f: any) => f.itag === "140" || f.itag === 140) ||
          data.adaptiveFormats.find((f: any) => f.type?.startsWith("audio/"));

        if (audioFormat && audioFormat.url) {
          return audioFormat.url;
        }
      }
    } catch {}
  }

  return null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!id || !title || !artist) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const searchQuery = `${title} ${artist}`;

  try {
    const videoId = await searchYoutube(searchQuery);

    let audioUrl: string | null = null;
    try {
      audioUrl = await getAudioUrl(videoId);
    } catch {}

    return NextResponse.json({ videoId, audioUrl, status: "ready" });
  } catch (error: any) {
    console.error(`YouTube search failed for ${searchQuery}:`, error.message);
    return NextResponse.json({
      videoId: "jfKfPfyJRdk",
      audioUrl: null,
      status: "fallback",
      error: error.message,
    });
  }
}

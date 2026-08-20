import { NextRequest, NextResponse } from "next/server";
import https from "https";

// Pure Node.js helper to search YouTube and scrape the first matching video ID
const searchYoutube = (query: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Find the first video ID in the page source
        // YouTube embeds search results in a JSON object inside the HTML: ytInitialData
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/;
        const match = data.match(regex);
        if (match && match[1]) {
          resolve(match[1]);
        } else {
          // Fallback to simpler watch match
          const watchRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/;
          const watchMatch = data.match(watchRegex);
          if (watchMatch && watchMatch[1]) {
            resolve(watchMatch[1]);
          } else {
            reject(new Error("Could not find any video ID in search results"));
          }
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Invidious instances to try for direct audio stream URLs (itag 140 = m4a 128kbps audio)
const INVIDIOUS_INSTANCES = [
  "inv.nadeko.net",
  "invidious.nerdvpn.de",
  "invidious.jing.rocks",
  "yewtu.be",
  "invidious.privacydev.net",
  "invidious.projectsegfau.lt",
];

// Try to get a direct audio stream URL from Invidious instances
const getAudioUrl = async (videoId: string): Promise<string | null> => {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const apiUrl = `https://${instance}/api/v1/videos/${videoId}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();

      // Look for audio-only adaptive format (itag 140 = m4a 128kbps)
      if (data.adaptiveFormats && Array.isArray(data.adaptiveFormats)) {
        // Prefer itag 140 (m4a 128kbps), then any audio format
        const audioFormat =
          data.adaptiveFormats.find((f: any) => f.itag === "140" || f.itag === 140) ||
          data.adaptiveFormats.find((f: any) =>
            f.type?.startsWith("audio/") || f.encoding === "aac"
          );

        if (audioFormat && audioFormat.url) {
          return audioFormat.url;
        }
      }
    } catch {
      // This instance failed, try next
      continue;
    }
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

    // Try to get a direct audio URL from Invidious (for mobile background playback)
    let audioUrl: string | null = null;
    try {
      const rawAudioUrl = await getAudioUrl(videoId);
      if (rawAudioUrl) {
        audioUrl = `/api/stream?url=${encodeURIComponent(rawAudioUrl)}`;
      }
    } catch {
      // Non-critical: audioUrl stays null, client falls back to YouTube iframe
    }

    return NextResponse.json({ videoId, audioUrl, status: "ready" });
  } catch (error: any) {
    console.error(`YouTube search failed for ${searchQuery}:`, error.message);
    return NextResponse.json({ videoId: "jfKfPfyJRdk", audioUrl: null, status: "fallback", error: error.message });
  }
}

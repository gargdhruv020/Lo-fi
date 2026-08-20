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
    return NextResponse.json({ videoId, status: "ready" });
  } catch (error: any) {
    console.error(`YouTube search failed for ${searchQuery}:`, error.message);
    // Return a default fallback video ID if search fails
    // This is a relaxing lo-fi audio fallback video ID
    return NextResponse.json({ videoId: "jfKfPfyJRdk", status: "fallback", error: error.message });
  }
}

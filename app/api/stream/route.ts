import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get("url");

  if (!streamUrl) {
    return new NextResponse("Missing stream url parameter", { status: 400 });
  }

  try {
    const range = request.headers.get("range") || "bytes=0-";

    const upstreamRes = await fetch(streamUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Range: range,
      },
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(`Upstream audio error: ${upstreamRes.statusText}`, {
        status: upstreamRes.status,
      });
    }

    const headers = new Headers();
    headers.set("Content-Type", upstreamRes.headers.get("content-type") || "audio/mp4");
    headers.set("Accept-Ranges", "bytes");

    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) {
      headers.set("Content-Range", contentRange);
    }
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status === 206 ? 206 : 200,
      headers,
    });
  } catch (err: any) {
    return new NextResponse(`Audio streaming proxy error: ${err.message}`, { status: 500 });
  }
}

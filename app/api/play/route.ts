import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!id || !title || !artist) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Search query on YouTube
  const searchQuery = `${title} ${artist}`;

  // Choose appropriate yt-dlp path based on platform
  let ytdlpPath = "";

  if (process.platform === "win32") {
    // Windows Local Path
    ytdlpPath = `C:\\Users\\NEW BAG COLLECTION\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python311\\Scripts\\yt-dlp.exe`;
    if (!fs.existsSync(ytdlpPath)) {
      ytdlpPath = "yt-dlp"; // fallback to global command if path changed
    }
  } else {
    // Linux / Vercel Environment
    // We copy the committed binary to /tmp and make it executable
    const committedYtdlp = path.join(process.cwd(), "bin", "yt-dlp");
    const tmpYtdlp = "/tmp/yt-dlp";

    try {
      if (!fs.existsSync(tmpYtdlp)) {
        fs.copyFileSync(committedYtdlp, tmpYtdlp);
        fs.chmodSync(tmpYtdlp, "755"); // make it executable
      }
      ytdlpPath = tmpYtdlp;
    } catch (err: any) {
      console.error("Failed to copy yt-dlp binary to /tmp:", err.message);
      ytdlpPath = "yt-dlp"; // fallback to environment path
    }
  }

  // yt-dlp command to extract the direct HTTPS audio streaming URL (no disk writes!)
  const cmd = `"${ytdlpPath}" -g -f "ba[ext=m4a]" "ytsearch:${searchQuery}"`;

  const nodePath = process.platform === "win32" ? "C:\\Program Files\\nodejs" : "";
  const customEnv = {
    ...process.env,
    PATH: nodePath ? `${nodePath};${process.env.PATH || ""}` : process.env.PATH || "",
  };

  return new Promise<NextResponse>((resolve) => {
    exec(cmd, { env: customEnv }, (error, stdout) => {
      if (error) {
        console.error(`yt-dlp stream extraction failed for ${searchQuery}:`, error.message);
        // Fallback to song1 if download/extraction fails
        resolve(NextResponse.json({ url: "/audio/song1.mp3", status: "fallback", error: error.message }));
      } else {
        const streamUrl = stdout.trim();
        if (streamUrl && streamUrl.startsWith("http")) {
          resolve(NextResponse.json({ url: streamUrl, status: "ready" }));
        } else {
          console.warn(`yt-dlp returned invalid stream url: ${streamUrl}`);
          resolve(NextResponse.json({ url: "/audio/song1.mp3", status: "fallback" }));
        }
      }
    });
  });
}

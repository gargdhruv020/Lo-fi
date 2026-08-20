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

  const audioDir = path.join(process.cwd(), "public", "audio");
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const outputFilename = `${id}.m4a`;
  const outputPath = path.join(audioDir, outputFilename);

  // If file already exists, serve it directly
  if (fs.existsSync(outputPath)) {
    return NextResponse.json({ url: `/audio/${outputFilename}`, status: "ready" });
  }

  // Path to the installed yt-dlp executable
  const ytdlpPath = `C:\\Users\\NEW BAG COLLECTION\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python311\\Scripts\\yt-dlp.exe`;

  // Search query on YouTube
  const searchQuery = `${title} ${artist}`;
  
  // yt-dlp command to download best audio as m4a, matching only videos under 6 minutes to avoid downloading full episodes
  const cmd = `"${ytdlpPath}" -f "ba[ext=m4a]" --match-filter "duration < 360" "ytsearch:${searchQuery}" -o "${outputPath}"`;

  const nodePath = "C:\\Program Files\\nodejs";
  const customEnv = {
    ...process.env,
    PATH: `${nodePath};${process.env.PATH || ""}`,
  };

  return new Promise<NextResponse>((resolve) => {
    exec(cmd, { env: customEnv }, (error) => {
      if (error) {
        console.error(`yt-dlp download failed for ${searchQuery}:`, error.message);
        // Fallback to song1 if download fails
        resolve(NextResponse.json({ url: "/audio/song1.mp3", status: "fallback", error: error.message }));
      } else {
        resolve(NextResponse.json({ url: `/audio/${outputFilename}`, status: "ready" }));
      }
    });
  });
}

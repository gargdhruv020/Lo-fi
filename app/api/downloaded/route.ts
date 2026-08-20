import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const audioDir = path.join(process.cwd(), "public", "audio");
    if (!fs.existsSync(audioDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(audioDir);
    // Extract file base names without the extension (e.g. s4-rockstar-tumho)
    const downloadedIds = files
      .filter((file) => file.endsWith(".m4a"))
      .map((file) => path.parse(file).name);

    return NextResponse.json({ files: downloadedIds });
  } catch (err) {
    console.error("Error reading downloaded audio directory:", err);
    return NextResponse.json({ files: [] });
  }
}

import { NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const isExternal =
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("instagram.com");

    // Direct URLs (Cloudinary, mp4) — return as-is, no extraction needed
    if (!isExternal) {
      return NextResponse.json({ videoUrl: url });
    }

    const videoUrl = await new Promise<string>((resolve, reject) => {
      // 15 second timeout — yt-dlp can hang forever on bad URLs
      const timeout = setTimeout(() => reject(new Error("Timeout")), 15000);

      // Try yt-dlp first, fall back path if not installed
      const ytDlpPaths = ["yt-dlp", "/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp"];
      const cmd = `${ytDlpPaths[0]} --no-playlist -f "best[ext=mp4]/best" -g "${url}" 2>/dev/null || ${ytDlpPaths[1]} --no-playlist -f "best[ext=mp4]/best" -g "${url}" 2>/dev/null`;

      exec(cmd, { timeout: 14000 }, (error, stdout, stderr) => {
        clearTimeout(timeout);

        if (error) {
          console.error("yt-dlp error:", stderr);
          reject(new Error("Extraction failed"));
          return;
        }

        const lines = stdout
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("http"));

        if (lines.length === 0) {
          reject(new Error("No URL extracted"));
          return;
        }

        resolve(lines[0]);
      });
    });

    return NextResponse.json({ videoUrl });

  } catch (err: any) {
    console.error("Extract video error:", err.message);
    return NextResponse.json(
      { error: err.message ?? "Extraction failed" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST(req: Request) {
  const { url } = await req.json();

  // keep this check (important)
  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  return new Promise((resolve) => {
    exec(`yt-dlp -f "best[ext=mp4]" -g "${url}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        resolve(
          NextResponse.json(
            { error: "Extraction failed" },
            { status: 500 }
          )
        );
        return;
      }

      // ✅ IMPORTANT FIX
      const lines = stdout.split("\n").filter((line) => line.trim() !== "");
      const videoUrl = lines[0]; // take ONLY first line

      resolve(
        NextResponse.json({
          videoUrl,
        })
      );
    });
  });
}
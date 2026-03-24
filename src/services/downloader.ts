import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { videos } from "../db/schema";
import { uploadVideo } from "./storage";
import { config } from "../config";
import { Semaphore } from "../utils/semaphore";
import { mkdirSync, rmSync, readdirSync, statSync } from "fs";
import { join } from "path";

export const downloadSemaphore = new Semaphore(
  config.MAX_CONCURRENT_DOWNLOADS
);

export function generateId(): string {
  return nanoid(12);
}

export async function startDownloadPipeline(
  id: string,
  youtubeUrl: string
): Promise<void> {
  const tempDir = join(config.TEMP_DIR, id);

  try {
    await downloadSemaphore.acquire();
    mkdirSync(tempDir, { recursive: true });

    // Update status to downloading
    await db
      .update(videos)
      .set({ status: "downloading" })
      .where(eq(videos.id, id));

    // Spawn yt-dlp
    const args = [
      config.YTDLP_PATH,
      "--no-playlist",
      "--merge-output-format",
      "mp4",
      "--format",
      config.YTDLP_FORMAT,
      "--output",
      join(tempDir, "%(title)s.%(ext)s"),
      "--print",
      "after_move:filepath",
      "--progress",
      "--newline",
    ];

    // Use OAuth2 cached credentials for age-restricted videos
    args.push("--cache-dir", config.YTDLP_CACHE_DIR);
    args.push("--username", "oauth2");
    args.push("--password", "");

    args.push(youtubeUrl);

    const proc = Bun.spawn(args,
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    let outputFilePath: string | null = null;
    let videoTitle: string | null = null;

    // Parse stdout for progress and output path
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        // Match progress lines: [download]  45.2% of ...
        const progressMatch = line.match(
          /\[download\]\s+(\d+(?:\.\d+)?)%/
        );
        if (progressMatch) {
          const pct = Math.floor(parseFloat(progressMatch[1] ?? "0"));
          await db
            .update(videos)
            .set({ downloadProgress: pct })
            .where(eq(videos.id, id));
          continue;
        }

        // The --print after_move:filepath outputs the final file path as the last line
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("[") && !trimmed.startsWith("Deleting")) {
          outputFilePath = trimmed;
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (!trimmed.startsWith("[") && !trimmed.startsWith("Deleting")) {
        outputFilePath = trimmed;
      }
    }

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderrReader = proc.stderr.getReader();
      let stderr = "";
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;
        stderr += decoder.decode(value, { stream: true });
      }
      throw new Error(`yt-dlp exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
    }

    // Find the output file if --print didn't work cleanly
    if (!outputFilePath || !outputFilePath.endsWith(".mp4")) {
      const files = readdirSync(tempDir).filter((f) => f.endsWith(".mp4"));
      if (files.length === 0) {
        throw new Error("No mp4 file found after yt-dlp download");
      }
      const file = files[0] as string;
      outputFilePath = join(tempDir, file);
      videoTitle = file.replace(/\.mp4$/, "");
    } else {
      const parts = outputFilePath.split(/[/\\]/);
      videoTitle = (parts[parts.length - 1] ?? "").replace(/\.mp4$/, "");
    }

    // Update status to uploading
    console.log(`[download] ${id}: yt-dlp done, file: ${outputFilePath}`);
    await db
      .update(videos)
      .set({
        status: "uploading",
        youtubeTitle: videoTitle,
        downloadProgress: 100,
      })
      .where(eq(videos.id, id));

    // Upload to S3
    const s3Key = `videos/${id}.mp4`;
    console.log(`[download] ${id}: uploading to S3 key: ${s3Key}`);
    await uploadVideo(outputFilePath, s3Key);
    console.log(`[download] ${id}: S3 upload complete`);

    const fileStat = statSync(outputFilePath);

    // Mark as ready
    await db
      .update(videos)
      .set({
        status: "ready",
        s3Key,
        s3ContentType: "video/mp4",
        fileSizeBytes: fileStat.size,
        completedAt: new Date(),
      })
      .where(eq(videos.id, id));

    console.log(`[download] Completed: ${id} - ${videoTitle}`);
  } catch (error) {
    console.error(`[download] Failed: ${id}`, error);
    const message =
      error instanceof Error ? error.message : String(error);

    await db
      .update(videos)
      .set({ status: "error", errorMessage: message.slice(0, 1000) })
      .where(eq(videos.id, id));
  } finally {
    downloadSemaphore.release();
    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eq, desc, sql, or, and, lt } from "drizzle-orm";
import { db } from "../db/client";
import { videos } from "../db/schema";
import { isValidYoutubeUrl } from "../utils/validation";
import {
  generateId,
  startDownloadPipeline,
  downloadSemaphore,
} from "../services/downloader";
import { checkS3Connection } from "../services/storage";
import { config } from "../config";

export const apiRoutes = new Hono();

// Health check
apiRoutes.get("/health", async (c) => {
  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch {}

  const s3Ok = await checkS3Connection();

  return c.json({
    status: dbOk && s3Ok ? "ok" : "degraded",
    db: dbOk ? "connected" : "disconnected",
    s3: s3Ok ? "reachable" : "unreachable",
    activeDownloads: downloadSemaphore.activeCount,
    queuedDownloads: downloadSemaphore.queuedCount,
  });
});

// Submit a download
apiRoutes.post("/download", async (c) => {
  const body = await c.req.json<{ url?: string }>();

  if (!body.url || !isValidYoutubeUrl(body.url)) {
    return c.json({ error: "Invalid YouTube URL" }, 400);
  }

  const id = generateId();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + config.VIDEO_TTL_HOURS * 60 * 60 * 1000
  );

  await db.insert(videos).values({
    id,
    youtubeUrl: body.url,
    status: "pending",
    expiresAt,
  });

  // Fire and forget the download pipeline
  startDownloadPipeline(id, body.url);

  return c.json(
    {
      id,
      status: "pending",
      statusUrl: `/api/status/${id}`,
      redirectUrl: `/v/${id}`,
    },
    201
  );
});

// Get video status
apiRoutes.get("/status/:id", async (c) => {
  const id = c.req.param("id");

  const video = await db.query.videos.findFirst({
    where: eq(videos.id, id),
  });

  if (!video) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    id: video.id,
    youtubeUrl: video.youtubeUrl,
    youtubeTitle: video.youtubeTitle,
    status: video.status,
    downloadProgress: video.downloadProgress,
    redirectUrl: `/v/${video.id}`,
    fileSizeBytes: video.fileSizeBytes,
    createdAt: video.createdAt,
    expiresAt: video.expiresAt,
    error: video.errorMessage,
  });
});

// SSE progress stream
apiRoutes.get("/status/:id/stream", async (c) => {
  const id = c.req.param("id");

  return streamSSE(c, async (stream) => {
    let lastStatus = "";
    let lastProgress = -1;

    while (true) {
      const video = await db.query.videos.findFirst({
        where: eq(videos.id, id),
      });

      if (!video) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ error: "Not found" }),
        });
        break;
      }

      // Send update if changed
      if (
        video.status !== lastStatus ||
        video.downloadProgress !== lastProgress
      ) {
        lastStatus = video.status;
        lastProgress = video.downloadProgress ?? 0;

        if (video.status === "ready") {
          await stream.writeSSE({
            event: "complete",
            data: JSON.stringify({
              status: "ready",
              redirectUrl: `/v/${video.id}`,
              youtubeTitle: video.youtubeTitle,
              fileSizeBytes: video.fileSizeBytes,
            }),
          });
          break;
        }

        if (video.status === "error") {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({
              status: "error",
              error: video.errorMessage,
            }),
          });
          break;
        }

        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify({
            status: video.status,
            downloadProgress: video.downloadProgress,
            youtubeTitle: video.youtubeTitle,
          }),
        });
      }

      await stream.sleep(1000);
    }
  });
});

// List recent videos
apiRoutes.get("/videos", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(videos),
  ]);

  return c.json({
    videos: items.map((v) => ({
      id: v.id,
      youtubeUrl: v.youtubeUrl,
      youtubeTitle: v.youtubeTitle,
      status: v.status,
      fileSizeBytes: v.fileSizeBytes,
      downloadProgress: v.downloadProgress,
      redirectUrl: `/v/${v.id}`,
      createdAt: v.createdAt,
      expiresAt: v.expiresAt,
    })),
    total: countResult[0].count,
    page,
    limit,
  });
});

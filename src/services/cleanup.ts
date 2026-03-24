import { eq, lt, or, and } from "drizzle-orm";
import { db } from "../db/client";
import { videos } from "../db/schema";
import { deleteVideo } from "./storage";

export async function cleanupExpiredVideos() {
  const now = new Date();

  // Find expired videos that are ready or errored
  const expired = await db
    .select()
    .from(videos)
    .where(
      and(
        lt(videos.expiresAt, now),
        or(eq(videos.status, "ready"), eq(videos.status, "error"))
      )
    )
    .limit(100);

  for (const video of expired) {
    try {
      if (video.s3Key) {
        await deleteVideo(video.s3Key);
      }

      await db
        .update(videos)
        .set({ status: "expired" })
        .where(eq(videos.id, video.id));

      console.log(`[cleanup] Expired video ${video.id}`);
    } catch (err) {
      console.error(`[cleanup] Failed to clean up ${video.id}:`, err);
    }
  }

  // Mark stale in-progress jobs as errored (stuck > 1 hour)
  const staleThreshold = new Date(now.getTime() - 60 * 60 * 1000);
  await db
    .update(videos)
    .set({ status: "error", errorMessage: "Timed out" })
    .where(
      and(
        lt(videos.createdAt, staleThreshold),
        or(
          eq(videos.status, "pending"),
          eq(videos.status, "downloading"),
          eq(videos.status, "uploading")
        )
      )
    );

  if (expired.length > 0) {
    console.log(`[cleanup] Cleaned up ${expired.length} expired videos`);
  }
}

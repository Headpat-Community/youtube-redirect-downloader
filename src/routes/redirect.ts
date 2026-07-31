import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { videos } from "../db/schema";
import { getVideoUrl } from "../services/storage";

export const redirectRoutes = new Hono();

redirectRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const video = await db.query.videos.findFirst({
    where: eq(videos.id, id),
  });

  if (!video) {
    return c.text("Video not found", 404);
  }

  if (video.status === "expired") {
    return c.text("Video has expired", 410);
  }

  if (video.status !== "ready" || !video.s3Key) {
    return c.json(
      {
        status: video.status,
        message: "Video is not ready yet",
        statusUrl: `/api/status/${id}`,
      },
      202
    );
  }

  return c.redirect(getVideoUrl(video.s3Key), 302);
});

import {
  pgTable,
  pgEnum,
  text,
  bigint,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const videoStatusEnum = pgEnum("video_status", [
  "pending",
  "downloading",
  "uploading",
  "ready",
  "expired",
  "error",
]);

export const videos = pgTable(
  "videos",
  {
    id: text("id").primaryKey(),
    youtubeUrl: text("youtube_url").notNull(),
    youtubeTitle: text("youtube_title"),
    status: videoStatusEnum("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    s3Key: text("s3_key"),
    s3ContentType: text("s3_content_type"),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    downloadProgress: integer("download_progress").default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_videos_status").on(table.status),
    index("idx_videos_expires_at").on(table.expiresAt),
    index("idx_videos_created_at").on(table.createdAt),
  ]
);

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

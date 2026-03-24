CREATE TYPE "public"."video_status" AS ENUM('pending', 'downloading', 'uploading', 'ready', 'expired', 'error');--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"youtube_url" text NOT NULL,
	"youtube_title" text,
	"status" "video_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"s3_key" text,
	"s3_content_type" text,
	"file_size_bytes" integer,
	"download_progress" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "idx_videos_status" ON "videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_videos_expires_at" ON "videos" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_videos_created_at" ON "videos" USING btree ("created_at");
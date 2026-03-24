export const config = {
  PORT: parseInt(process.env.PORT || "3000"),
  HOST: process.env.HOST || "0.0.0.0",

  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/ytdl",

  S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:9000",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "minioadmin",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "minioadmin",
  S3_BUCKET: process.env.S3_BUCKET || "videos",
  S3_REGION: process.env.S3_REGION || "us-east-1",

  VIDEO_TTL_HOURS: parseInt(process.env.VIDEO_TTL_HOURS || "24"),
  MAX_CONCURRENT_DOWNLOADS: parseInt(
    process.env.MAX_CONCURRENT_DOWNLOADS || "3"
  ),
  PRESIGN_EXPIRY_SECONDS: parseInt(
    process.env.PRESIGN_EXPIRY_SECONDS || "3600"
  ),

  YTDLP_PATH: process.env.YTDLP_PATH || "yt-dlp",
  YTDLP_FORMAT:
    process.env.YTDLP_FORMAT ||
    "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
  TEMP_DIR: process.env.TEMP_DIR || "/tmp/ytdl",

  CLEANUP_INTERVAL_MINUTES: parseInt(
    process.env.CLEANUP_INTERVAL_MINUTES || "15"
  ),
} as const;

export const config = {
	PORT: parseInt(process.env.PORT || "3000", 10),
	HOST: process.env.HOST || "0.0.0.0",

	DATABASE_URL:
		process.env.DATABASE_URL ||
		`postgres://${process.env.POSTGRES_USER || "postgres"}:${process.env.POSTGRES_PASSWORD || "postgres"}@${process.env.POSTGRES_HOST || "db"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB || "videos"}`,

	STORAGE_DRIVER: (process.env.STORAGE_DRIVER || "s3") as "s3" | "local",

	S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:9000",
	S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "minioadmin",
	S3_SECRET_KEY: process.env.S3_SECRET_KEY || "minioadmin",
	S3_BUCKET: process.env.S3_BUCKET || "videos",
	S3_REGION: process.env.S3_REGION || "us-east-1",

	LOCAL_STORAGE_DIR: process.env.LOCAL_STORAGE_DIR || "/app/data/videos",
	LOCAL_STORAGE_SECRET: process.env.LOCAL_STORAGE_SECRET || "",

	VIDEO_TTL_HOURS: parseInt(process.env.VIDEO_TTL_HOURS || "24", 10),
	MAX_CONCURRENT_DOWNLOADS: parseInt(
		process.env.MAX_CONCURRENT_DOWNLOADS || "3",
		10,
	),
	PRESIGN_EXPIRY_SECONDS: parseInt(
		process.env.PRESIGN_EXPIRY_SECONDS || "3600",
		10,
	),

	YTDLP_PATH: process.env.YTDLP_PATH || "yt-dlp",
	YTDLP_FORMAT:
		process.env.YTDLP_FORMAT ||
		"bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best",
	TEMP_DIR: process.env.TEMP_DIR || "/tmp/ytdl",
	YTDLP_COOKIES_PATH: process.env.YTDLP_COOKIES_PATH || "",

	CLEANUP_INTERVAL_MINUTES: parseInt(
		process.env.CLEANUP_INTERVAL_MINUTES || "15",
		10,
	),
} as const;

if (config.STORAGE_DRIVER !== "s3" && config.STORAGE_DRIVER !== "local") {
	throw new Error(
		`Invalid STORAGE_DRIVER "${config.STORAGE_DRIVER}", expected "s3" or "local"`,
	);
}

if (config.STORAGE_DRIVER === "local" && !config.LOCAL_STORAGE_SECRET) {
	throw new Error("LOCAL_STORAGE_SECRET is required when STORAGE_DRIVER=local");
}

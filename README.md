# YouTube Redirect Downloader

A self-hosted service that downloads YouTube videos, uploads them to S3-compatible storage, and provides direct MP4 links. Built primarily for VRChat video players that need direct URLs to video files.

## How It Works

1. Paste a YouTube URL into the web UI (or call the API)
2. The server downloads the video using [yt-dlp](https://github.com/yt-dlp/yt-dlp) and uploads it to S3
3. You get a direct link (`/v/{id}`) that redirects to the video file
4. Videos are automatically deleted after a configurable time (default: 24 hours)

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An S3-compatible storage provider (AWS S3, MinIO, Cloudflare R2, etc.)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/Headpat-Community/youtube-redirect-downloader.git
cd youtube-redirect-downloader
```

1. Copy the example environment file and configure it:

```bash
cp .env.example .env
```

1. Edit `.env` with your S3 credentials:

```env
S3_ENDPOINT=https://your-s3-endpoint.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=videos
S3_REGION=us-east-1
```

1. Start the services:

```bash
docker compose up -d app db
```

1. Open `http://localhost:3000` in your browser.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `POSTGRES_DB` | `videos` | Database name |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `POSTGRES_HOST` | `db` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `S3_ENDPOINT` | `http://localhost:9000` | S3 endpoint URL |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret key |
| `S3_BUCKET` | `videos` | S3 bucket name |
| `S3_REGION` | `us-east-1` | S3 region |
| `VIDEO_TTL_HOURS` | `24` | Hours before videos are auto-deleted |
| `MAX_CONCURRENT_DOWNLOADS` | `3` | Max simultaneous downloads |
| `PRESIGN_EXPIRY_SECONDS` | `3600` | S3 presigned URL expiry |
| `CLEANUP_INTERVAL_MINUTES` | `15` | How often the cleanup job runs |

## API

### `POST /api/download`

Submit a YouTube URL for download.

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Response:

```json
{
  "id": "abc123def456",
  "status": "pending",
  "statusUrl": "/api/status/abc123def456",
  "redirectUrl": "/v/abc123def456"
}
```

### `GET /api/status/:id`

Check the status of a download.

### `GET /api/status/:id/stream`

Server-Sent Events stream for real-time progress updates.

### `GET /api/videos`

List recent downloads. Supports `?page=1&limit=20`.

### `GET /v/:id`

Redirects to the video's presigned S3 URL. This is the link you share or use in VRChat.

### `GET /api/health`

Health check endpoint for monitoring and Kubernetes probes.

## VRChat Usage

After a video finishes downloading, copy the link (e.g. `https://your-domain.com/v/abc123`) and paste it into any VRChat video player. The `/v/:id` endpoint returns a `302` redirect to a presigned S3 URL with the correct `Content-Type: video/mp4` header, which VRChat video players can consume directly.

## Kubernetes

Kubernetes manifests are provided in the `k8s/` directory:

```bash
# Edit the secret with your real credentials
vim k8s/secret.yaml

# Edit the ingress with your domain
vim k8s/ingress.yaml

# Deploy
kubectl apply -f k8s/
```

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Framework:** [Hono](https://hono.dev)
- **Database:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- **Video Download:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg
- **Storage:** S3-compatible (via Bun native S3 client)

## License

MIT

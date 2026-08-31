#!/bin/sh
yt-dlp -U || echo "yt-dlp self-update failed, running $(yt-dlp --version)"
exec "$@"

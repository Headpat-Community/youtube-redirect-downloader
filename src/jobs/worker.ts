import { cleanupExpiredVideos } from "../services/cleanup";
import { config } from "../config";

export function startCleanupWorker() {
  const intervalMs = config.CLEANUP_INTERVAL_MINUTES * 60 * 1000;

  setInterval(async () => {
    try {
      await cleanupExpiredVideos();
    } catch (err) {
      console.error("[cleanup] Error during cleanup:", err);
    }
  }, intervalMs);

  console.log(
    `[cleanup] Worker started, interval: ${config.CLEANUP_INTERVAL_MINUTES}m`
  );
}

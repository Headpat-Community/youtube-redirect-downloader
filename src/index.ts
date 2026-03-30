import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config";
import { runMigrations } from "./db/migrate";
import { startCleanupWorker } from "./jobs/worker";
import { apiRoutes } from "./routes/api";
import { redirectRoutes } from "./routes/redirect";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("/api/*", cors());

// API routes
app.route("/api", apiRoutes);

// Video redirect endpoint
app.route("/v", redirectRoutes);

// Static frontend
app.use("/*", serveStatic({ root: "./public" }));

// Startup
async function main() {
	await runMigrations();
	startCleanupWorker();
	console.log(`Server running on ${config.HOST}:${config.PORT}`);
}

main();

export default {
	port: config.PORT,
	hostname: config.HOST,
	fetch: app.fetch,
};

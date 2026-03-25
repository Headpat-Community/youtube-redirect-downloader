import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./client";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runMigrations(retries = 10, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[db] Running migrations (attempt ${attempt})...`);
      await migrate(db, { migrationsFolder: "./migrations" });
      console.log("[db] Migrations complete");
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`[db] Connection failed, retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
    }
  }
}

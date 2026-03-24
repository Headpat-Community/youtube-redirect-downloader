import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./client";

export async function runMigrations() {
  console.log("[db] Running migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("[db] Migrations complete");
}

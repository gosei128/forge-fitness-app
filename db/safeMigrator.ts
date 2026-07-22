import { sqlite } from "./index";
import migration from "../drizzle/migrations";

export function runSafeMigrations(): boolean {
  try {
    sqlite.execSync(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER
      );
    `);

    const rows = sqlite.getAllSync<{ created_at: number }>(
      `SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1`
    );
    const lastMillis = rows[0]?.created_at ?? 0;

    for (const journalEntry of migration.journal.entries) {
      if (journalEntry.when > lastMillis) {
        const queryKey = `m${journalEntry.idx.toString().padStart(4, "0")}`;
        const query = (migration.migrations as any)[queryKey];
        if (query) {
          const statements = query.split("--> statement-breakpoint");
          for (const stmt of statements) {
            const trimmed = stmt.trim();
            if (trimmed) {
              try {
                sqlite.execSync(trimmed);
              } catch (err: any) {
                console.log(
                  `[SafeMigrator] Skipped safe warning for ${journalEntry.tag}:`,
                  err?.message || err,
                );
              }
            }
          }
          sqlite.execSync(
            `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('', ${journalEntry.when});`,
          );
        }
      }
    }
    return true;
  } catch (error) {
    console.error("[SafeMigrator] Migration error:", error);
    return false;
  }
}

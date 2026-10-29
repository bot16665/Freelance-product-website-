import fs from "node:fs";
import path from "node:path";
import Database from "libsql";
import { config } from "./config";
import { SCHEMA } from "./schema";

type Db = Database.Database;
const globalForDb = globalThis as unknown as { __storeDb?: Db };

/**
 * One shared connection (also survives hot reloads in `next dev`).
 *
 * - Local dev: a plain SQLite file (same as before), nothing changes.
 * - Production: a Turso database (free tier) set via DATABASE_URL + DATABASE_AUTH_TOKEN,
 *   so the app can run on Vercel where writing files is not allowed.
 */
export function getDb(): Db {
  if (!globalForDb.__storeDb) {
    if (config.databaseUrl) {
      // Remote (Turso). libsql accepts the better-sqlite3 API but also takes a remote
      // URL + auth token; its types don't cover that overload, so cast once here.
      const RemoteCtor = Database as unknown as new (
        url: string,
        opts: { authToken?: string }
      ) => Database.Database;
      globalForDb.__storeDb = new RemoteCtor(config.databaseUrl, {
        authToken: config.databaseAuthToken,
      });
    } else {
      fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });
      globalForDb.__storeDb = new Database(config.databaseFile);
    }
    const db = globalForDb.__storeDb;
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
  }
  return globalForDb.__storeDb;
}

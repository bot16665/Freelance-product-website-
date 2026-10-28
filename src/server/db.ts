import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "./config";
import { SCHEMA } from "./schema.mjs";

type Db = Database.Database;
const globalForDb = globalThis as unknown as { __storeDb?: Db };

/** One shared connection (also survives hot reloads in `next dev`). */
export function getDb(): Db {
  if (!globalForDb.__storeDb) {
    fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });
    const db = new Database(config.databaseFile);
    db.pragma("journal_mode = WAL"); // faster, and safe for many readers
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    globalForDb.__storeDb = db;
  }
  return globalForDb.__storeDb;
}

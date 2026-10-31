import { createClient, type Client } from "@libsql/client";
import { config } from "./config";
import { SCHEMA } from "./schema";

const globalForDb = globalThis as unknown as { __storeClient?: Client; __storeReady?: Promise<Client> };

/**
 * One shared libsql client (also survives hot reloads in `next dev`), plus the schema
 * applied exactly once per server instance. Local files work too: `file:./data/store.db`.
 */
export function getDb(): Promise<Client> {
  if (!globalForDb.__storeReady) {
    if (process.env.NODE_ENV === "production" && !process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL is required in production (e.g. libsql://your-db.turso.io).");
    }
    globalForDb.__storeReady = (async () => {
      const client = createClient({
        url: config.tursoDatabaseUrl,
        authToken: config.tursoAuthToken,
      });
      await client.executeMultiple(SCHEMA);
      globalForDb.__storeClient = client;
      return client;
    })().catch((err) => {
      globalForDb.__storeReady = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return globalForDb.__storeReady;
}

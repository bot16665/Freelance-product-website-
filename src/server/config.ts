import path from "node:path";

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Everything configurable lives in .env.local (see .env.example). */
export const config = {
  /** SQLite database file (local dev only). Back up this one file and you have backed up everything. */
  databaseFile: path.resolve(process.env.DATABASE_FILE ?? "./data/store.db"),
  /** Turso (free hosted SQLite) — set these in production, e.g. on Vercel. */
  databaseUrl: process.env.DATABASE_URL || undefined,
  databaseAuthToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  /** Uploaded product images (local dev only; Vercel Blob is used in production). */
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads"),
  /** Vercel Blob token. When set, uploads go to Blob storage instead of the local folder. */
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN || undefined,
  /** Must match your Firebase project (used to check login tokens). */
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "printer-sys",
  /** Where the public keys for checking Firebase tokens come from. Only change this for tests. */
  jwksUrl:
    process.env.FIREBASE_JWKS_URL ??
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  /** These Google accounts are always store staff and can add other staff. */
  ownerEmails: list(process.env.OWNER_EMAILS),
  maxImageBytes: 2 * 1024 * 1024,
};

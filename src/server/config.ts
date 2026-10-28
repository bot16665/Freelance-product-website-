import path from "node:path";

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Everything configurable lives in .env.local (see .env.example). */
export const config = {
  /** SQLite database file. Back up this one file and you have backed up everything. */
  databaseFile: path.resolve(process.env.DATABASE_FILE ?? "./data/store.db"),
  /** Uploaded product images. */
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads"),
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

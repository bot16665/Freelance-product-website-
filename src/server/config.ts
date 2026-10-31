const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Everything configurable lives in .env.local (see .env.example). */
export const config = {
  /** Turso database URL. `file:./data/store.db` runs on a local SQLite file. */
  tursoDatabaseUrl: process.env.TURSO_DATABASE_URL ?? "file:./data/store.db",
  /** Auth token for hosted Turso. Leave empty for a local file. */
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN ?? undefined,
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

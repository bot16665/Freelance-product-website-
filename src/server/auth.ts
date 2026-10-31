import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config";
import { getDb } from "./db";
import { HttpError } from "./http";
import type { Role } from "@/lib/types";

export type SessionUser = {
  uid: string;
  email: string | null;
  name: string | null;
  role: Role;
  isOwner: boolean;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

/**
 * Firebase is only used to log people in. Every API call sends the Firebase ID token and
 * we check it here (signature, expiry, issuer, audience) using Google's public keys.
 * No secret key is needed on the server for this.
 */
export async function verifyFirebaseToken(token: string) {
  jwks ??= createRemoteJWKSet(new URL(config.jwksUrl));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://securetoken.google.com/${config.firebaseProjectId}`,
    audience: config.firebaseProjectId,
    algorithms: ["RS256"],
  });
  if (!payload.sub) throw new Error("Token has no subject");
  return payload;
}

/** Who is calling? Also remembers the user in the `users` table (at most once every 5 minutes). */
export async function getSession(req: Request): Promise<SessionUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return null;

  let payload;
  try {
    payload = await verifyFirebaseToken(match[1]);
  } catch {
    return null;
  }

  const uid = payload.sub as string;
  const email = typeof payload.email === "string" ? payload.email : null;
  const name = typeof payload.name === "string" ? payload.name : null;
  const verified = payload.email_verified === true;

  const db = await getDb();
  const now = Date.now();

  // The 5-minute window means the common case (polling every few seconds) is a single read.
  const seen = await db.execute({ sql: "SELECT last_seen FROM users WHERE uid = ?", args: [uid] });
  if (seen.rows.length === 0 || now - (seen.rows[0].last_seen as number) >= 5 * 60 * 1000) {
    await db.execute({
      sql: `INSERT INTO users (uid, email, name, created_at, last_seen) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET email = excluded.email, name = excluded.name, last_seen = excluded.last_seen`,
      args: [uid, email, name, now, now],
    });
  }

  const isOwner = !!email && verified && config.ownerEmails.includes(email.toLowerCase());
  const isSeller = isOwner || (await db.execute({ sql: "SELECT 1 FROM sellers WHERE uid = ?", args: [uid] })).rows.length > 0;

  return { uid, email, name, role: isSeller ? "seller" : "buyer", isOwner };
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const session = await getSession(req);
  if (!session) throw new HttpError(401, "Please sign in again.");
  return session;
}

export async function requireSeller(req: Request): Promise<SessionUser> {
  const session = await requireUser(req);
  if (session.role !== "seller") throw new HttpError(403, "Only store staff can do this.");
  return session;
}

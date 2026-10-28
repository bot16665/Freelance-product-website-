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

/** Who is calling? Also remembers the user in the `users` table. */
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

  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (uid, email, name, created_at, last_seen) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET email = excluded.email, name = excluded.name, last_seen = excluded.last_seen`
  ).run(uid, email, name, now, now);

  const isOwner = !!email && verified && config.ownerEmails.includes(email.toLowerCase());
  const isSeller = isOwner || !!db.prepare("SELECT 1 FROM sellers WHERE uid = ?").get(uid);

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

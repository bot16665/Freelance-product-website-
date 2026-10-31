import { config } from "@/server/config";
import { requireSeller } from "@/server/auth";
import { getDb } from "@/server/db";
import { badRequest, handle, HttpError, readJson } from "@/server/http";
import type { Row } from "@/server/http";

/** Everyone who has ever signed in, and whether they are staff. */
export const GET = handle(async (req: Request) => {
  await requireSeller(req);
  const db = await getDb();
  const res = await db.execute(
    `SELECT u.uid, u.email, u.name, u.last_seen, (s.uid IS NOT NULL) AS is_seller
     FROM users u LEFT JOIN sellers s ON s.uid = u.uid
     ORDER BY u.last_seen DESC LIMIT 500`
  );
  const users = (res.rows as Row[]).map((r) => ({
    uid: r.uid,
    email: r.email,
    name: r.name,
    lastSeen: r.last_seen,
    isOwner: !!r.email && config.ownerEmails.includes(String(r.email).toLowerCase()),
    isSeller: r.is_seller === 1,
  }));
  return Response.json({ users }, { headers: { "Cache-Control": "no-store" } });
});

/** { uid, seller: true|false } makes someone staff or removes their staff access. */
export const PATCH = handle(async (req: Request) => {
  const me = await requireSeller(req);
  const { uid, seller } = await readJson(req);
  if (typeof uid !== "string" || typeof seller !== "boolean") throw badRequest("Invalid request.");

  const db = await getDb();
  const found = await db.execute({ sql: "SELECT email FROM users WHERE uid = ?", args: [uid] });
  const target = found.rows[0] as unknown as { email: string | null } | undefined;
  if (!target) throw new HttpError(404, "That user has not signed in yet.");
  if (target.email && config.ownerEmails.includes(target.email.toLowerCase())) {
    throw new HttpError(400, "Owners always have access. Change OWNER_EMAILS to remove them.");
  }
  if (!seller && uid === me.uid) throw new HttpError(400, "You cannot remove your own access.");

  if (seller) {
    await db.execute({ sql: "INSERT INTO sellers (uid, added_by, created_at) VALUES (?, ?, ?) ON CONFLICT(uid) DO NOTHING", args: [uid, me.uid, Date.now()] });
  } else {
    await db.execute({ sql: "DELETE FROM sellers WHERE uid = ?", args: [uid] });
  }
  return Response.json({ ok: true });
});

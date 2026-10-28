import { requireUser } from "@/server/auth";
import { badRequest, handle, HttpError, readJson } from "@/server/http";
import { listOrders, placeOrder } from "@/server/orders";

/** ?scope=mine (default) = my orders. ?scope=all = every order (staff only).
 *  ?limit=n (max 500, default 200) and ?before=<created_at> page through older orders. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const params = new URL(req.url).searchParams;
  const scope = params.get("scope") === "all" ? "all" : "mine";
  if (scope === "all" && user.role !== "seller") throw new HttpError(403, "Only store staff can see all orders.");

  const limitStr = params.get("limit");
  const limit = limitStr === null ? undefined : Number(limitStr);
  const beforeStr = params.get("before");
  const before = beforeStr === null || beforeStr === "" ? undefined : Number(beforeStr);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) throw badRequest("limit must be a positive whole number.");
  if (before !== undefined && !Number.isFinite(before)) throw badRequest("before must be a timestamp.");

  const { orders, hasMore } = listOrders(scope, user.uid, { limit, before });
  const oldest = orders.length ? orders[orders.length - 1].createdAt : null;
  return Response.json(
    { orders, hasMore, nextBefore: hasMore ? oldest : null },
    { headers: { "Cache-Control": "no-store" } }
  );
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  return Response.json({ order: placeOrder(user, await readJson(req)) }, { status: 201 });
});

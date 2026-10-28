import { requireUser } from "@/server/auth";
import { handle, HttpError, readJson } from "@/server/http";
import { listOrders, placeOrder } from "@/server/orders";

/** ?scope=mine (default) = my orders. ?scope=all = every order (staff only). */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "mine";
  if (scope === "all" && user.role !== "seller") throw new HttpError(403, "Only store staff can see all orders.");
  return Response.json({ orders: listOrders(scope, user.uid) }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  return Response.json({ order: placeOrder(user, await readJson(req)) }, { status: 201 });
});

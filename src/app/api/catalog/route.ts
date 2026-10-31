import { requireUser } from "@/server/auth";
import { handle } from "@/server/http";
import { listCatalog } from "@/server/products";

/** The store: only published products with a price, and only fields a customer should see. */
export const GET = handle(async (req: Request) => {
  await requireUser(req);
  return Response.json({ items: await listCatalog() }, { headers: { "Cache-Control": "no-store" } });
});

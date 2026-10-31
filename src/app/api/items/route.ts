import { requireSeller } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { createItem, listAll, parseProduct } from "@/server/products";

export const GET = handle(async (req: Request) => {
  await requireSeller(req);
  return Response.json({ items: await listAll() }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = handle(async (req: Request) => {
  const user = await requireSeller(req);
  const product = parseProduct(await readJson(req));
  return Response.json({ item: await createItem(product, user.uid) }, { status: 201 });
});

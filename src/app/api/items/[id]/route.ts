import { requireSeller } from "@/server/auth";
import { handle, HttpError, readJson } from "@/server/http";
import { deleteItem, getItem, parseProduct, updateItem } from "@/server/products";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: Request, { params }: Ctx) => {
  await requireSeller(req);
  const item = await getItem((await params).id);
  if (!item) throw new HttpError(404, "Product not found.");
  return Response.json({ item }, { headers: { "Cache-Control": "no-store" } });
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  await requireSeller(req);
  const item = await updateItem((await params).id, parseProduct(await readJson(req)));
  if (!item) throw new HttpError(404, "Product not found.");
  return Response.json({ item });
});

export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  await requireSeller(req);
  if (!(await deleteItem((await params).id))) throw new HttpError(404, "Product not found.");
  return Response.json({ ok: true });
});

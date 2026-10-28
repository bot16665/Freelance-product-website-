import { requireUser } from "@/server/auth";
import { badRequest, handle, readJson } from "@/server/http";
import { changeStatus, type OrderAction } from "@/server/orders";

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req);
  const { action } = await readJson(req);
  if (action !== "confirm" && action !== "cancel" && action !== "deliver") throw badRequest("Unknown action.");
  return Response.json({ order: changeStatus((await params).id, action as OrderAction, user) });
});

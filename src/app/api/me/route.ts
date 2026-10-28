import { requireUser } from "@/server/auth";
import { handle } from "@/server/http";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  return Response.json({ uid: user.uid, email: user.email, name: user.name, role: user.role, isOwner: user.isOwner });
});

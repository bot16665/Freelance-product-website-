import fs from "node:fs/promises";
import path from "node:path";
import { config } from "@/server/config";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves uploaded product images. Public on purpose (an <img> tag cannot send a login token). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // strict pattern, so nobody can read other files with ../ tricks
  const m = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });

  try {
    const data = await fs.readFile(path.join(config.uploadDir, name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[m[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

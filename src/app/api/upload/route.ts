import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { requireSeller } from "@/server/auth";
import { config } from "@/server/config";
import { badRequest, handle } from "@/server/http";

/** Real file type from the first bytes (the browser's claimed type cannot be trusted). */
function detectImage(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export const POST = handle(async (req: Request) => {
  await requireSeller(req);

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    throw badRequest("Invalid upload.");
  }
  if (!(file instanceof File)) throw badRequest("No image was sent.");
  if (file.size > config.maxImageBytes) throw badRequest("Each image must be under 2 MB.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = detectImage(bytes);
  if (!ext) throw badRequest("Only JPG, PNG or WebP images are allowed.");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw badRequest("Image storage is not configured. Add BLOB_READ_WRITE_TOKEN to the environment.");
  }

  // Stored in Vercel Blob under uploads/<uuid>.<ext>; the public URL is returned and
  // saved directly on the product, so nothing is proxied through this server.
  const name = `${randomUUID()}.${ext}`;
  const blob = await put(`uploads/${name}`, bytes, {
    access: "public",
    contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
    addRandomSuffix: false,
  });
  return Response.json({ url: blob.url }, { status: 201 });
});

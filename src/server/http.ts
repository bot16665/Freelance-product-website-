export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export const badRequest = (m: string) => new HttpError(400, m);

/** Wrap a route handler so errors become clean JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error("API error:", err);
      return Response.json({ error: "Something went wrong on the server." }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {}
  throw badRequest("Invalid request body.");
}

/* small validators used by the API */

/** A raw SQLite row. Column values come back as `unknown` to the type system, but
 *  every access is guarded by the mapper functions, so `any` is acceptable here. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export function text(v: unknown, max: number, label: string, required = false): string | null {
  if (v === undefined || v === null || v === "") {
    if (required) throw badRequest(`${label} is required.`);
    return null;
  }
  if (typeof v !== "string") throw badRequest(`${label} must be text.`);
  const t = v.trim();
  if (required && !t) throw badRequest(`${label} is required.`);
  if (t.length > max) throw badRequest(`${label} is too long (max ${max} characters).`);
  return t || null;
}

export function num(v: unknown, label: string, opts: { min?: number; max?: number; int?: boolean } = {}): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw badRequest(`${label} must be a number.`);
  if (opts.int && !Number.isInteger(n)) throw badRequest(`${label} must be a whole number.`);
  if (opts.min !== undefined && n < opts.min) throw badRequest(`${label} must be at least ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) throw badRequest(`${label} must be at most ${opts.max}.`);
  return n;
}

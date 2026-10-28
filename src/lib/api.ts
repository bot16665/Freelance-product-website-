import { auth } from "@/lib/firebase";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; form?: FormData };

/** Calls our own server. The Firebase login token is attached so the server knows who you are. */
export async function apiFetch<T>(path: string, { method = "GET", body, form }: Options = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, "Please sign in again.");

  const token = await user.getIdToken(); // refreshed automatically when it expires
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your internet connection and try again.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Something went wrong. Please try again.");
  return data as T;
}

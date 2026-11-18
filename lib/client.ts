import { signIn } from "next-auth/react";
import { toast } from "sonner";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Network error. Check your connection and try again.", 0);
  }
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const body = data as { error?: string; code?: string };
    throw new ApiError(body.error ?? "Request failed", res.status, body.code);
  }
  return data as T;
}

/** Shows an error toast; a 401 offers a one-click re-sign-in. */
export function reportError(err: unknown, fallback = "Something went wrong"): void {
  const message = err instanceof Error ? err.message : fallback;
  if (err instanceof ApiError && err.status === 401) {
    toast.error(message, {
      action: { label: "Sign in", onClick: () => void signIn("google") },
      duration: 10000,
    });
    return;
  }
  toast.error(message);
}

export function showWarnings(warnings: string[] | undefined): void {
  for (const w of warnings ?? []) toast.warning(w, { duration: 9000 });
}

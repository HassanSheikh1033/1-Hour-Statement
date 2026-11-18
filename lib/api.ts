import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getEnv } from "./env";
import { getSettings } from "./db";
import { defaultSettings, type Settings } from "./schemas";

export interface AuthContext {
  email: string;
  name: string;
}

export type Handler<P = Record<string, never>> = (req: Request, ctx: AuthContext, params: P) => Promise<Response>;

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorJson(message: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Wraps a route: 401 when signed out, friendly errors for zod / database failures. */
export function withAuth<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: Request, route: { params: Promise<P> }): Promise<Response> => {
    try {
      getEnv();
      const session = await auth();
      const email = session?.user?.email;
      if (!email) return errorJson("Not signed in", 401);
      return await handler(req, { email, name: session.user?.name ?? email }, await route.params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof z.ZodError) {
    return errorJson(err.issues[0]?.message ?? "Invalid request", 400, { issues: err.issues });
  }
  console.error(err);
  const message = err instanceof Error && err.message.startsWith("Invalid environment") ? err.message : "Something went wrong. Please try again.";
  return errorJson(message, 500);
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new z.ZodError([{ code: "custom", path: [], message: "Request body must be valid JSON" }]);
  }
  return schema.parse(body);
}

export async function loadSettings(ctx: AuthContext): Promise<Settings> {
  return (await getSettings(ctx.email)) ?? defaultSettings(ctx.email);
}

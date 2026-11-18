export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { getEnv } = await import("./lib/env");
  try {
    getEnv();
  } catch (err) {
    // Log loudly so the Vercel/terminal logs show exactly what is missing.
    console.error(`\n[env] ${err instanceof Error ? err.message : String(err)}\n`);
    throw err;
  }
}

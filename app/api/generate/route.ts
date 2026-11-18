import { withAuth, parseBody, json, errorJson } from "@/lib/api";
import { generateRequestSchema } from "@/lib/schemas";
import { generateCaptions, GenerationError } from "@/lib/gemini";

export const maxDuration = 30;
export const runtime = "nodejs";

export const POST = withAuth(async (req) => {
  const body = await parseBody(req, generateRequestSchema);
  try {
    const options = await generateCaptions(body);
    return json({ options });
  } catch (err) {
    if (err instanceof GenerationError) return errorJson(err.message, err.status);
    throw err;
  }
});

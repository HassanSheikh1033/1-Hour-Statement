import { GoogleGenAI, Type } from "@google/genai";
import { captionOptionsSchema, PLATFORM_LIMITS, fullPostText, type CaptionOption, type GenerateRequest, type Platform } from "./schemas";
import { getEnv } from "./env";

const PLATFORM_RULES: Record<Platform, string> = {
  X: "X (Twitter): caption plus hashtags combined MUST be at most 280 characters. Punchy, 1-3 hashtags, at most 1-2 emoji.",
  LinkedIn:
    "LinkedIn: longer-form (400-1200 characters), professional and insight-led, a strong first line hook, short paragraphs separated by blank lines, 3-5 relevant hashtags, minimal emoji.",
  Instagram:
    "Instagram: engaging and visual, use emoji naturally, a hook in the first line, a call to action, and exactly 5-10 relevant hashtags.",
  Facebook:
    "Facebook: conversational and community-oriented, 1-3 short paragraphs, a question or call to action, 0-3 hashtags.",
  TikTok:
    "TikTok: short, trendy and energetic, hook in the first few words, casual voice, 3-6 hashtags including one or two trend-style tags.",
};

export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const responseSchema = {
  type: Type.ARRAY,
  minItems: "3",
  maxItems: "3",
  items: {
    type: Type.OBJECT,
    properties: {
      caption: { type: Type.STRING, description: "The post text without hashtags" },
      hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hashtags without the # symbol" },
    },
    required: ["caption", "hashtags"],
    propertyOrdering: ["caption", "hashtags"],
  },
};

function systemInstruction(platform: Platform): string {
  return [
    "You are an expert social media copywriter.",
    "Return EXACTLY 3 distinct caption options as a JSON array of { caption, hashtags }.",
    "Never include hashtags inside the caption text; put them only in the hashtags array, without the # symbol.",
    "Do not invent facts, statistics, or links the user did not provide.",
    `Platform rules — ${PLATFORM_RULES[platform]}`,
  ].join("\n");
}

function validate(raw: string | undefined, platform: Platform): CaptionOption[] {
  if (!raw) throw new Error("empty response");
  const parsed = captionOptionsSchema.parse(JSON.parse(raw));
  const limit = PLATFORM_LIMITS[platform];
  for (const option of parsed) {
    if (fullPostText(option.caption, option.hashtags).length > limit) {
      throw new Error(`option exceeds ${limit} characters for ${platform}`);
    }
  }
  return parsed;
}

function friendlyError(err: unknown): GenerationError {
  const e = err as { status?: number; code?: number; message?: string };
  const code = e.status ?? e.code;
  const msg = e.message ?? "";
  if (code === 429 || /RESOURCE_EXHAUSTED|rate limit|quota/i.test(msg)) {
    return new GenerationError("Gemini is rate-limited right now. Please wait a few seconds and try again.", 429);
  }
  if (code === 404 || /not found|is not supported/i.test(msg)) {
    return new GenerationError("The configured Gemini model is unavailable. Check the GEMINI_MODEL environment variable.", 502);
  }
  if (code === 400 && /API key/i.test(msg)) {
    return new GenerationError("The Gemini API key is invalid. Check GEMINI_API_KEY.", 502);
  }
  return new GenerationError("Couldn't generate captions right now. Please try again.", 502);
}

export async function generateCaptions(req: GenerateRequest): Promise<CaptionOption[]> {
  const env = getEnv();
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = `Topic: ${req.topic}\nPlatform: ${req.platform}\nTone: ${req.tone}\n\nWrite 3 different options.`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction(req.platform),
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.9,
        },
      });
      return validate(response.text, req.platform);
    } catch (err) {
      lastErr = err;
      const code = (err as { status?: number }).status;
      // Rate limits/auth problems will not be fixed by an immediate retry.
      if (code === 429 || code === 401 || code === 403 || code === 404) break;
      // Otherwise (malformed JSON, schema mismatch, transient error) retry once.
    }
  }
  console.error("Gemini generation failed", lastErr);
  throw friendlyError(lastErr);
}

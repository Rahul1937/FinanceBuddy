// Provider-agnostic AI client. Works with any OpenAI-compatible chat API
// (OpenAI, Groq, Google Gemini's OpenAI endpoint, OpenRouter, local Ollama…).
//
// Configure via env:
//   AI_BASE_URL  e.g. https://api.groq.com/openai/v1   (default: OpenAI)
//   AI_API_KEY   your provider key (falls back to OPENAI_API_KEY)
//   AI_MODEL     e.g. llama-3.3-70b-versatile           (default: gpt-4o-mini)

const PLACEHOLDERS = new Set(["", "your-openai-key", "your-groq-key", "your-api-key"]);

function aiConfig() {
  const key = (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  return { key, baseUrl, model };
}

export function aiConfigured(): boolean {
  return !PLACEHOLDERS.has(aiConfig().key);
}

/** Parse JSON even when a model wraps it in code fences or prose. */
function parseJSONLoose(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      /* fall through */
    }
  }
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) {
    try {
      return JSON.parse(brace[0]);
    } catch {
      /* fall through */
    }
  }
  throw new Error("The AI did not return valid JSON.");
}

/** Call an OpenAI-compatible chat completion and parse a JSON object response. */
export async function chatJSON(system: string, user: string, maxTokens = 4000): Promise<any> {
  const { key, baseUrl, model } = aiConfig();
  if (!key) throw new Error("AI API key is not set.");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `AI request failed (${res.status}).`);
  }
  const content = data?.choices?.[0]?.message?.content ?? "";
  return parseJSONLoose(content);
}

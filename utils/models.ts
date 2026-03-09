import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";

type AIProvider =
  | ReturnType<typeof createGroq>
  | ReturnType<typeof createOpenAI>;
let aiProvider: AIProvider;

const EMBEDDING_MODEL = "text-embedding-3-small";

// Set default values
const openai_base_url: string =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const ai_provider: string = process.env.AI_PROVIDER || "groq";
const isCustomBaseUrl = !!process.env.OPENAI_BASE_URL;

if (ai_provider == "groq") {
  aiProvider = createGroq({
    apiKey: process.env.GROQ_API_KEY,
  });
} else {
  // When using a custom base URL (e.g. DeepSeek, Ollama, Together), wrap fetch
  // to rewrite the "developer" role to "system", since only OpenAI supports it.
  const customFetch: typeof fetch = async (url, init) => {
    if (isCustomBaseUrl && init?.body && typeof init.body === "string") {
      try {
        const body = JSON.parse(init.body);
        if (Array.isArray(body.messages)) {
          body.messages = body.messages.map(
            (m: { role: string; [key: string]: unknown }) =>
              m.role === "developer" ? { ...m, role: "system" } : m,
          );
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        // JSON parse failed — send the request body as-is
      }
    }
    return fetch(url, init);
  };

  aiProvider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: openai_base_url,
    fetch: isCustomBaseUrl ? customFetch : undefined,
  });
}

// Use .chat() to target the Chat Completions API (/v1/chat/completions).
// The default provider() targets the Responses API (/v1/responses) which
// is only supported by OpenAI. Chat Completions works with all providers
// and covers all of Hydra's AI features (summarization, filtering, queries).
const aiClient = (modelId: string) => aiProvider.chat(modelId);

const embeddingClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}).embedding(EMBEDDING_MODEL);

if (!aiProvider) {
  throw new Error("Failed to initialize AI client");
}

export { aiClient, embeddingClient };
export { ai_provider };

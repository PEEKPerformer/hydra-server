import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";

type AIProvider = ReturnType<typeof createGroq> | ReturnType<typeof createOpenAI>;
let aiProvider: AIProvider;

const EMBEDDING_MODEL = "text-embedding-3-small";

// Set default values
const openai_base_url: string =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const ai_provider: string = process.env.AI_PROVIDER || "groq";

if (ai_provider == "groq") {
  aiProvider = createGroq({
    apiKey: process.env.GROQ_API_KEY,
  });
} else {
  aiProvider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: openai_base_url,
  });
}

// Wrap the provider so calling aiClient(modelId) uses the chat endpoint
// instead of the responses endpoint (which non-OpenAI providers don't support)
const aiClient = (modelId: string) => {
  if (ai_provider === "openai" && !process.env.OPENAI_BASE_URL) {
    return aiProvider(modelId);
  }
  return aiProvider.chat(modelId);
};

const embeddingClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}).embedding(EMBEDDING_MODEL);

export { aiClient, embeddingClient };
export { ai_provider };

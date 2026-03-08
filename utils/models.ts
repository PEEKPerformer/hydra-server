import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";
import type { LanguageModelV1Prompt } from "@ai-sdk/provider";

type AIProvider = ReturnType<typeof createGroq> | ReturnType<typeof createOpenAI>;
let aiProvider: AIProvider;

const EMBEDDING_MODEL = "text-embedding-3-small";

// Set default values
const openai_base_url: string =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const ai_provider: string = process.env.AI_PROVIDER || "groq";
const useCustomBaseUrl = !!process.env.OPENAI_BASE_URL;

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

// For non-OpenAI providers (e.g. DeepSeek), force chat completions endpoint
// and rewrite "developer" role to "system" (only OpenAI supports "developer")
const aiClient = (modelId: string) => {
  if (ai_provider !== "openai" || !useCustomBaseUrl) {
    return aiProvider(modelId);
  }
  const baseModel = aiProvider.chat(modelId);
  return wrapLanguageModel({
    model: baseModel,
    middleware: {
      transformParams: async ({ params }) => {
        return {
          ...params,
          prompt: params.prompt.map((msg) => {
            if (msg.role === ("developer" as any)) {
              return { ...msg, role: "system" as const };
            }
            return msg;
          }) as LanguageModelV1Prompt,
        };
      },
    },
  });
};

const embeddingClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}).embedding(EMBEDDING_MODEL);

export { aiClient, embeddingClient };
export { ai_provider };

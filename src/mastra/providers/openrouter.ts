import { createOpenAI } from "@ai-sdk/openai";

// OpenRouter provider configured for the AI SDK
// Docs: https://openrouter.ai/
export const openrouter = createOpenAI({
  apiKey: process.env["OPENROUTER_API_KEY"] ?? "",
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "X-Title": "Runa/1.0.0",
  },
});

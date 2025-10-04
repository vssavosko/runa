import { createOpenAI } from "@ai-sdk/openai";

export const huggingface = createOpenAI({
  apiKey: process.env["HUGGINGFACE_API_KEY"] ?? "",
  baseURL: "https://api-inference.huggingface.co/v1",
});

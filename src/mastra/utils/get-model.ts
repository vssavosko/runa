import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

import { huggingface } from "../providers/huggingface.js";
import { openrouter } from "../providers/openrouter.js";

import { getProvider } from "./get-provider.js";

// biome-ignore lint/suspicious/noExplicitAny: <>
export const getModel = (model = ""): any => {
  const provider = getProvider();

  const modelName = model || process.env["MODEL_NAME"] || "";

  switch (provider) {
    case "openai":
      return openai(modelName);
    case "anthropic":
      return anthropic(modelName);
    case "google":
      return google(modelName);
    case "openrouter":
      return openrouter(modelName);
    case "huggingface":
      return huggingface(modelName);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

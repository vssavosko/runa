export const getProvider = () => {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GOOGLE_API_KEY) return "google";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.HUGGINGFACE_API_KEY) return "huggingface";

  throw new Error(
    "No suitable API key found for the model provider. Please specify one of the supported keys in the environment variables.",
  );
};

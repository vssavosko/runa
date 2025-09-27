import { createOpenAI } from '@ai-sdk/openai';

// OpenRouter provider configured for the AI SDK
// Docs: https://openrouter.ai/
export const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    // Optional but recommended by OpenRouter for identification/analytics
    'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? '',
    'X-Title': process.env.OPENROUTER_APP_TITLE ?? '',
  },
});

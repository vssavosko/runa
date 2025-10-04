import { createStep } from "@mastra/core/workflows";

import {
  fetchStepOutputSchema,
  planStepOutputSchema,
  scenariosSchema,
} from "../schemas/index.js";

export const planStep = createStep({
  id: "plan-step",
  description:
    "Generates a detailed and structured test plan for verifying new functionality or changes, including scenarios, steps, and expected results",
  inputSchema: fetchStepOutputSchema,
  outputSchema: planStepOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const {
      repositoryFullName,
      pullRequestNumber,
      data: { title, body, files, testUrl },
    } = inputData;

    const prompt = `
        Use the following pull request information to generate a concise, actionable E2E test plan.
  
        Pull Request Link: ${repositoryFullName}/pull/${pullRequestNumber}
        Pull Request Title: ${title}
        Pull Request Body: ${body}
        Test URL: ${testUrl}
        Changed Files: ${files.join(", ")}
      `;

    const plannerAgent = mastra.getAgent("plannerAgent");

    const { object } = await plannerAgent.generate(
      [{ role: "user", content: prompt }],
      {
        structuredOutput: {
          schema: scenariosSchema,
          errorStrategy: "strict",
        },
        providerOptions: {
          openai: {
            temperature: 0.4,
            reasoning: {
              enabled: true,
              max_tokens: 8000,
            },
          },
        },
      },
    );

    if (!object) {
      throw new Error("Failed to get structured output from planner-agent");
    }

    return {
      repositoryFullName,
      pullRequestNumber,
      data: object,
    };
  },
});

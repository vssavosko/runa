import { createStep } from "@mastra/core/workflows";

import { getModel } from "../../../utils/get-model.js";
import { scenariosSchema } from "../schemas/scenario-schemas.js";
import {
  fetchStepOutputSchema,
  planStepOutputSchema,
} from "../schemas/step-schemas.js";

export const planStep = createStep({
  id: "plan-step",
  description:
    "Uses the planner-agent to generate detailed and structured E2E test scenarios based on Pull Request information, preparing them for further execution.",
  inputSchema: fetchStepOutputSchema,
  outputSchema: planStepOutputSchema,
  execute: async ({
    inputData: {
      repositoryFullName,
      pullRequestNumber,
      data: { title, body, files, testUrl },
    },
    mastra,
  }) => {
    const plannerAgent = mastra.getAgent("plannerAgent");

    const prompt = `
        Use the following information to generate E2E test scenarios.
  
        Pull Request Link: ${repositoryFullName}/pull/${pullRequestNumber}
        Pull Request Title: ${title}
        Pull Request Body: ${body}
        Test URL: ${testUrl}
        Changed Files: ${files.join(", ")}
      `;

    const { object } = await plannerAgent.generate(
      [{ role: "user", content: prompt }],
      {
        structuredOutput: {
          schema: scenariosSchema,
          model: getModel(
            process.env["MODEL_NAME_FOR_STRUCTURED_OUTPUT"] || "",
          ),
          errorStrategy: "strict",
        },
        modelSettings: {
          temperature: 0.3,
        },
        providerOptions: {
          openrouter: {
            reasoning: {
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

import { createStep } from "@mastra/core/workflows";

import { getModel } from "../../../utils/get-model.js";
import {
  planStepOutputSchema,
  testResultSchema,
  testStepOutputSchema,
} from "../schemas/index.js";

export const testStep = createStep({
  id: "test-step",
  description:
    "Uses the playwright-agent to execute E2E test scenarios defined by the planner-agent, collecting execution results and artifacts into a structured report.",
  inputSchema: planStepOutputSchema,
  outputSchema: testStepOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const {
      repositoryFullName,
      pullRequestNumber,
      data: { scenarios },
    } = inputData;

    console.log(`[test-step] 🚀 Starting test execution`);
    console.log(`[test-step] 📊 Total scenarios: ${scenarios.length}`);
    console.log(
      `[test-step] 🔄 Execution mode: Sequential (agent manages all)`,
    );
    console.log("─".repeat(60));

    const prompt = `
      Use the following information to execute E2E test scenarios.

      Test Scenarios:
      ${scenarios
        .map((scenario, idx) => {
          return `
            ${idx + 1}. Name: ${scenario.name}
            Steps:
            ${scenario.steps.map((step, stepIdx) => `   ${stepIdx + 1}) ${step}`).join("\n")}
            Expected result: ${scenario.expectedResult}
            Tags: ${scenario.tags.join(", ")}
          `;
        })
        .join("\n")}
    `;

    const playwrightAgent = mastra.getAgent("playwrightAgent");

    let stepsUsed = 0;

    const maxSteps = Math.min(100, scenarios.length * 15 + 20);

    console.log(`[test-step] 📈 Max steps allocated: ${maxSteps}`);
    console.log("─".repeat(60));

    const { object } = await playwrightAgent.generate(
      [{ role: "user", content: prompt }],
      {
        structuredOutput: {
          schema: testResultSchema,
          model: getModel(
            process.env["MODEL_NAME_FOR_STRUCTURED_OUTPUT"] || "",
          ),
          errorStrategy: "strict",
        },
        maxSteps,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStepFinish: ({ finishReason }: any) => {
          stepsUsed++;
          const progress = `${stepsUsed}/${maxSteps} (${((stepsUsed / maxSteps) * 100).toFixed(0)}%)`;
          console.log(`[test-step] Step ${progress}: ${finishReason}`);
        },
      },
    );

    if (!object) {
      throw new Error("Failed to get structured output from playwright-agent");
    }

    console.log("\n");
    console.log("═".repeat(60));
    console.log(`[test-step] 📊 FINAL TEST RESULTS`);
    console.log("═".repeat(60));
    console.log(`[test-step] ✅ Passed: ${object.passed}`);
    console.log(`[test-step] ❌ Failed: ${object.failed}`);
    console.log(`[test-step] ⚠️  Flaky: ${object.flaky.length}`);
    console.log(`[test-step] 🔧 Steps Used: ${stepsUsed}/${maxSteps}`);

    if (object.artifacts.urls.length > 0) {
      console.log(`[test-step] 📎 Artifacts: ${object.artifacts.urls.length}`);
    }

    if (object.failures.length > 0) {
      console.log(`\n[test-step] 💥 FAILURES:`);
      object.failures.forEach(
        (failure: { name: string; reason: string }, idx: number) => {
          console.log(`[test-step]    ${idx + 1}. ${failure.name}`);
          console.log(`[test-step]       └─ ${failure.reason}`);
        },
      );
    }

    console.log("═".repeat(60));

    return {
      repositoryFullName,
      pullRequestNumber,
      data: { ...object, scenarios },
    };
  },
});

import { createStep } from "@mastra/core/workflows";

import {
  planStepOutputSchema,
  testResultSchema,
  testStepOutputSchema,
} from "../schemas/index.js";

export const testStep = createStep({
  id: "test-step",
  description:
    "Executes the end-to-end test scenarios defined in the test plan, collects results, and gathers artifacts",
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
      You are provided with a test plan for E2E testing of an application.
      Your task is to execute ALL scenarios sequentially, one by one.

      EXECUTION STRATEGY:
      - Execute each scenario in order, one at a time.
      - For EACH scenario: launch browser → execute steps → close browser.
      - This ensures clean state between scenarios.
      - Do NOT run scenarios in parallel.

      Test Plan:
      ${scenarios
        .map(
          (scenario, idx) => `
      ${idx + 1}. Name: ${scenario.name}
      Steps:
      ${scenario.steps.map((step, stepIdx) => `   ${stepIdx + 1}) ${step}`).join("\n")}
      Expected result: ${scenario.expectedResult}
      Tags: ${scenario.tags.join(", ")}
      `,
        )
        .join("\n")}

      REQUIREMENTS:
      - Do not fabricate results: if a test cannot be executed, specify it in failures.
      - If a scenario is flaky, add its name to the flaky array.
      - For each failed test, specify the reason in failures.
      - If there are artifacts (screenshots, videos), add their links to artifacts.urls.
      - Return results with: passed, failed, flaky[], artifacts.urls[], failures[].
      - Close browser between scenarios for clean state.
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
          errorStrategy: "strict",
        },
        providerOptions: {
          openai: {
            reasoning: {
              enabled: true,
              max_tokens: 2000,
            },
          },
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
      data: object,
    };
  },
});

import { createStep } from "@mastra/core/workflows";

import { delay } from "../../../utils/delay.js";
import { getModel } from "../../../utils/get-model.js";
import { scenarioTestResultsSchema } from "../schemas/scenario-schemas.js";
import {
  planStepOutputSchema,
  testStepOutputSchema,
} from "../schemas/step-schemas.js";
import type { ScenarioTestResultsType } from "../types.js";
import { combineTestResults } from "../utils/combine-test-results.js";
import { generatePromptForScenario } from "../utils/generate-prompt-for-scenario.js";

export const testStep = createStep({
  id: "test-step",
  description:
    "Uses the playwright-agent to execute E2E test scenarios defined by the planner-agent, collecting execution results and artifacts into a structured report.",
  inputSchema: planStepOutputSchema,
  outputSchema: testStepOutputSchema,
  execute: async ({
    inputData: { repositoryFullName, pullRequestNumber, data: scenarios },
    mastra,
  }) => {
    const logger = mastra.getLogger();
    const playwrightAgent = mastra.getAgent("playwrightAgent");

    logger.info(`[test-step] 🚀 Starting test execution`);
    logger.info(`[test-step] 📊 Total scenarios: ${scenarios.length}`);
    logger.info("─".repeat(60));

    const results: ScenarioTestResultsType[] = [];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];

      logger.info(
        `[test-step] 🔄 Executing scenario ${i + 1}/${scenarios.length}: ${scenario.name}`,
      );

      const scenarioPrompt = generatePromptForScenario(scenario);
      const maxStepsPerScenario = Math.max(
        25,
        Math.ceil(scenario.steps.length * 5 + 10),
      );

      try {
        const { object } = await playwrightAgent.generate(
          [{ role: "user", content: scenarioPrompt }],
          {
            structuredOutput: {
              schema: scenarioTestResultsSchema,
              model: getModel(
                process.env["MODEL_NAME_FOR_STRUCTURED_OUTPUT"] || "",
              ),
              errorStrategy: "strict",
            },
            maxSteps: maxStepsPerScenario,
          },
        );

        results.push(object);

        logger.info(`[test-step] ✅ Scenario ${i + 1} completed`);

        // use delay to avoid rate limiting
        if (i < scenarios.length - 1) {
          await delay(Number(process.env["DELAY_BETWEEN_SCENARIOS"] || 45000));
        }
      } catch (error: unknown) {
        logger.error(`[test-step] ❌ Scenario ${i + 1} failed:`, error);

        results.push({
          passed: 0,
          failed: 1,
          flaky: [],
          artifacts: { urls: [] },
          failures: [
            {
              name: scenario.name,
              reason:
                error instanceof Error
                  ? error.message
                  : "Failed to execute scenario",
            },
          ],
        });
      }
    }

    const combinedTestResults = combineTestResults(results);

    if (!combinedTestResults) {
      throw new Error("Failed to get structured output from playwright-agent");
    }

    logger.info("\n");
    logger.info("═".repeat(60));
    logger.info(`[test-step] 📊 FINAL TEST RESULTS`);
    logger.info("═".repeat(60));
    logger.info(`[test-step] ✅ Passed: ${combinedTestResults.passed}`);
    logger.info(`[test-step] ❌ Failed: ${combinedTestResults.failed}`);
    logger.info(`[test-step] ⚠️  Flaky: ${combinedTestResults.flaky.length}`);

    if (combinedTestResults.artifacts.urls.length > 0) {
      logger.info(
        `[test-step] 📎 Artifacts: ${combinedTestResults.artifacts.urls.length}`,
      );
    }

    if (combinedTestResults.failures.length > 0) {
      logger.info(`\n[test-step] 💥 FAILURES:`);

      combinedTestResults.failures.forEach(
        (failure: { name: string; reason: string }, idx: number) => {
          logger.info(`[test-step]    ${idx + 1}. ${failure.name}`);
          logger.info(`[test-step]       └─ ${failure.reason}`);
        },
      );
    }

    logger.info("═".repeat(60));

    return {
      repositoryFullName,
      pullRequestNumber,
      data: { ...combinedTestResults, scenarios },
    };
  },
});

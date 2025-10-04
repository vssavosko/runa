import { createWorkflow } from "@mastra/core/workflows";

import {
  automationTestWorkflowInputSchema,
  automationTestWorkflowOutputSchema,
} from "./schemas/index.js";
import { fetchStep } from "./steps/fetch-step.js";
import { planStep } from "./steps/plan-step.js";
import { reportStep } from "./steps/report-step.js";
import { testStep } from "./steps/test-step.js";

export const automationTestWorkflow = createWorkflow({
  id: "automation-test-workflow",
  description:
    "Automated E2E testing workflow for pull requests: fetches pull request data, generates a test plan, runs E2E tests, and posts a summary report as a pull request comment.",
  inputSchema: automationTestWorkflowInputSchema,
  outputSchema: automationTestWorkflowOutputSchema,
})
  .then(fetchStep)
  .then(planStep)
  .then(testStep)
  .then(reportStep)
  .commit();

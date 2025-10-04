import { createStep } from "@mastra/core";

import { upsertPullRequestComment } from "../../../tools/github.js";
import {
  reportStepOutputSchema,
  testStepOutputSchema,
} from "../schemas/index.js";

export const reportStep = createStep({
  id: "report-step",
  description:
    "Generates a report summarizing the results of end-to-end test execution, including statistics, artifacts, and details of any failures or flaky scenarios",
  inputSchema: testStepOutputSchema,
  outputSchema: reportStepOutputSchema,
  execute: async ({ inputData }) => {
    const {
      repositoryFullName,
      pullRequestNumber,
      data: { passed, failed, flaky, artifacts, failures },
    } = inputData;

    const body = `# QA Results\n\n**Totals:**\n- Passed: ${passed}\n- Failed: ${failed}${
      flaky.length > 0
        ? `\n\n**Flaky:**\n${flaky.map(name => `- ${name}`).join("\n")}`
        : ""
    }${
      failures.length > 0
        ? `\n\n**Failures:**\n${failures.map(f => `- ${f.name}: ${f.reason}`).join("\n")}`
        : ""
    }${
      artifacts.urls.length > 0
        ? `\n\n**Artifacts:**\n${artifacts.urls.map(url => `- ${url}`).join("\n")}`
        : ""
    }`;

    return upsertPullRequestComment.execute({
      repositoryFullName,
      pullRequestNumber,
      body,
    });
  },
});

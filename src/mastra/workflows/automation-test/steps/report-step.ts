import { createStep } from "@mastra/core/workflows";

import { upsertPullRequestComment } from "../../../tools/github.js";
import { STATUS_EMOJI, STATUS_TEXT } from "../constants.js";
import {
  reportStepOutputSchema,
  testStepOutputSchema,
} from "../schemas/step-schemas.js";

export const reportStep = createStep({
  id: "report-step",
  description:
    "Summarizes E2E test execution results, including statistics, failures, and artifacts, and publishes them as a pull request comment using the upsertPullRequestComment tool.",
  inputSchema: testStepOutputSchema,
  outputSchema: reportStepOutputSchema,
  execute: async ({
    inputData: {
      repositoryFullName,
      pullRequestNumber,
      data: {
        passed = 0,
        failed = 0,
        flaky = [],
        failures = [],
        scenarios = [],
      },
    },
  }) => {
    const status =
      failed > 0 ? "failed" : flaky.length > 0 ? "flaky" : "passed";
    const statusLine = `${STATUS_EMOJI[status]} Status: ${STATUS_TEXT[status]}`;

    const flakySection = flaky.length
      ? flaky.map((f, i) => `${i + 1}. ${f}`).join("\n")
      : "None";

    const failuresSection = failures.length
      ? `| # | Scenario | Reason |\n|---:|---------|--------|\n${failures.map((f, i) => `| ${i + 1} | ${f.name} | ${f.reason} |`).join("\n")}`
      : "None";

    const scenariosSection = scenarios.length
      ? scenarios
          .map(
            s =>
              `### ${s.name}\n- Tags: ${s.tags?.length ? s.tags.map(t => `\`${t}\``).join(", ") : "—"}\n- Steps:\n${s.steps?.map((step, i) => `  ${i + 1}. ${step}`).join("\n") || "  —"}\n- Expected: ${s.expectedResult || "—"}`,
          )
          .join("\n\n")
      : "<em>No scenarios provided</em>";

    const body = `<!-- runa-report -->\n\n# 🔮 Runa. Test Report \n\n> ${statusLine}\n>\n> Passed: **${passed}** · Failed: **${failed}** · Flaky: **${flaky.length}** · Scenarios: **${scenarios.length}**\n\n---\n\n**Failed Tests**\n\n${failuresSection}\n\n**Flaky Tests**\n\n${flakySection}\n\n<details>\n<summary><strong>Scenarios Overview</strong></summary>\n\n${scenariosSection}\n\n</details>`;

    return upsertPullRequestComment.execute({
      repositoryFullName,
      pullRequestNumber,
      body,
    });
  },
});

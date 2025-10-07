import { createStep } from "@mastra/core";

import { upsertPullRequestComment } from "../../../tools/github.js";
import {
  reportStepOutputSchema,
  testStepOutputSchema,
} from "../schemas/index.js";

export const reportStep = createStep({
  id: "report-step",
  description:
    "Summarizes E2E test execution results, including statistics, failures, and artifacts, and publishes them as a Pull Request comment using the upsertPullRequestComment tool.",
  inputSchema: testStepOutputSchema,
  outputSchema: reportStepOutputSchema,
  execute: async ({ inputData }) => {
    const { repositoryFullName, pullRequestNumber, data } = inputData;

    const passed = data.passed ?? 0;
    const failed = data.failed ?? 0;
    const flaky = Array.isArray(data.flaky) ? data.flaky : [];
    const artifacts = data.artifacts ?? { urls: [] };
    const failures = Array.isArray(data.failures) ? data.failures : [];
    const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];

    const scenarioCount = scenarios.length;
    const flakyCount = flaky.length;
    const status = failed > 0 ? "failed" : flakyCount > 0 ? "flaky" : "passed";
    const statusLine =
      status === "failed"
        ? "❌ Status: Failed"
        : status === "flaky"
          ? "⚠️ Status: Flaky"
          : "✅ Status: Passed";

    const failuresRows = failures
      .map((f, i) => `| ${i + 1} | ${f.name} | ${f.reason} |`)
      .join("\n");

    const failuresSection = failuresRows
      ? `| # | Scenario | Reason |\n|---:|---------|--------|\n${failuresRows}`
      : "- None";

    const flakySection = flaky.length
      ? flaky.map(n => `\`${n}\``).join(", ")
      : "None";

    const artifactsSection = artifacts.urls?.length
      ? artifacts.urls.map((u, i) => `- [Artifact ${i + 1}](${u})`).join("\n")
      : "- No artifacts";

    const scenarioItems = scenarios.map(s => {
      const tags =
        Array.isArray(s.tags) && s.tags.length
          ? s.tags.map((t: string) => `\`${t}\``).join(", ")
          : "—";
      const steps = Array.isArray(s.steps)
        ? s.steps
            .map((st: string, idx: number) => `  ${idx + 1}. ${st}`)
            .join("\n")
        : "  —";
      const expected = s.expectedResult ?? "—";

      return `### ${s.name}\n- Tags: ${tags}\n- Steps:\n${steps}\n- Expected: ${expected}`;
    });

    const scenariosSection =
      scenarioItems.length > 0
        ? scenarioItems.join("\n\n")
        : "<em>No scenarios provided</em>";

    const body = `<!-- RUNA-REPORT -->\n\n# Runa Report \n\n> ${statusLine}\n>\n> Passed: **${passed}** · Failed: **${failed}** · Flaky: **${flakyCount}** · Scenarios: **${scenarioCount}**\n\n---\n\n**Failures**\n\n${failuresSection}\n\n**Flaky Scenarios**\n\n- ${flakySection}\n\n**Artifacts**\n\n${artifactsSection}\n\n<details>\n<summary><strong>Scenarios Overview</strong></summary>\n\n${scenariosSection}\n\n</details>`;

    return upsertPullRequestComment.execute({
      repositoryFullName,
      pullRequestNumber,
      body,
    });
  },
});

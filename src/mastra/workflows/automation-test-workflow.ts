import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { getPrFiles, getPrInfo, upsertPrComment } from "../tools/github.js";

const fetchStep = createStep({
  id: "fetch-step",
  description: "Fetches PR metadata and changed files using GitHub API tools",
  inputSchema: z.object({
    prLink: z.string().describe("Pull request link"),
  }),
  outputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
    data: z
      .object({
        url: z.string().describe("Pull request URL"),
        title: z.string().describe("Pull request title"),
        body: z.string().describe("Pull request description"),
        files: z.array(z.string()).describe("Pull request changed files"),
        testUrl: z.string().describe("URL to be used for testing"),
      })
      .describe("Pull request data"),
  }),
  execute: async ({ inputData }) => {
    const { prLink } = inputData;

    const match = prLink.match(/github\.com\/(.+?)\/(.+?)\/pull\/(\d+)/i);

    if (!match) throw new Error(`Invalid PR link: ${prLink}`);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, owner, repo, prNumber] = match;
    const repoFullName = `${owner}/${repo}`;

    const info = await getPrInfo.execute({
      context: { repoFullName, prNumber: Number(prNumber) },
    });

    if (!info.success) throw new Error(`getPrInfo failed: ${info.error}`);

    const files = await getPrFiles.execute({
      context: { repoFullName, prNumber: Number(prNumber) },
    });

    if (!files.success) throw new Error(`getPrFiles failed: ${files.error}`);

    const body = info.data.body ?? "";
    const urlMatch = body.match(/https?:\/\/\S+/i);
    const testUrl = urlMatch ? urlMatch[0] : "";

    return {
      repoFullName,
      prNumber: Number(prNumber),
      data: {
        url: info.data.url ?? "",
        title: info.data.title ?? "",
        body: body,
        files: files.data,
        testUrl,
      },
    };
  },
});

const planStep = createStep({
  id: "plan-step",
  description:
    "Generates a detailed and structured test plan for verifying new functionality or changes, including scenarios, steps, and expected results",
  inputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
    data: z
      .object({
        url: z.string().describe("Pull request URL"),
        title: z.string().describe("Pull request title"),
        body: z.string().describe("Pull request description"),
        files: z.array(z.string()).describe("Pull request changed files"),
        testUrl: z.string().describe("URL to be used for testing"),
      })
      .describe("Pull request data"),
  }),
  outputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
    data: z
      .object({
        scenarios: z
          .array(
            z.object({
              name: z.string().describe("Scenario name"),
              steps: z.array(z.string()).describe("Scenario steps"),
              expectedResult: z.string().describe("Scenario expected result"),
              tags: z.array(z.string()).describe("Scenario tags"),
            }),
          )
          .describe("Test plan scenarios"),
      })
      .describe("Test plan data"),
  }),
  execute: async ({ inputData, mastra }) => {
    const {
      repoFullName,
      prNumber,
      data: { title, body, files, testUrl },
    } = inputData;

    const prompt = `
      Use the following pull request information to generate a concise, actionable E2E test plan.

      PR Link: ${repoFullName}/pull/${prNumber}
      PR Title: ${title}
      PR Body: ${body}
      Test URL: ${testUrl}
      Changed Files: ${files.join(", ")}
    `;

    const plannerAgent = mastra.getAgent("plannerAgent");

    const { object } = await plannerAgent.generate(
      [{ role: "user", content: prompt }],
      {
        structuredOutput: {
          schema: z.object({
            scenarios: z.array(
              z.object({
                name: z.string(),
                steps: z.array(z.string()),
                expectedResult: z.string(),
                tags: z.array(z.string()),
              }),
            ),
          }),
          errorStrategy: "strict",
        },
      },
    );

    if (!object) {
      throw new Error("Failed to get structured output from test plan agent");
    }

    return {
      repoFullName,
      prNumber,
      data: object,
    };
  },
});

const testStep = createStep({
  id: "test-step",
  description:
    "Executes the end-to-end test scenarios defined in the test plan, collects results, and gathers artifacts",
  inputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
    data: z
      .object({
        scenarios: z
          .array(
            z.object({
              name: z.string().describe("Scenario name"),
              steps: z.array(z.string()).describe("Scenario steps"),
              expectedResult: z.string().describe("Scenario expected result"),
              tags: z.array(z.string()).describe("Scenario tags"),
            }),
          )
          .describe("Test plan scenarios"),
      })
      .describe("Test plan data"),
  }),
  outputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
    data: z
      .object({
        passed: z.number().describe("Number of successfully passed tests"),
        failed: z.number().describe("Number of failed tests"),
        flaky: z
          .array(z.string())
          .describe("List of scenario names that showed flaky behavior"),
        durationMs: z
          .number()
          .describe("Total execution time of all tests in milliseconds"),
        artifacts: z
          .object({
            urls: z
              .array(z.string())
              .describe("Links to artifacts (e.g., screenshots, videos)"),
          })
          .describe(
            "Links to artifacts obtained during test execution (e.g., screenshots, videos, other files)",
          ),
        failures: z
          .array(
            z.object({
              name: z.string().describe("Scenario name"),
              reason: z.string().describe("Reason for failure"),
            }),
          )
          .describe(
            "A list of failed scenarios with the reason for each failure",
          ),
      })
      .describe(
        "Results of end-to-end test execution, including statistics, artifacts, and details of any failures or flaky scenarios",
      ),
  }),
  execute: async ({ inputData, mastra }) => {
    const {
      repoFullName,
      prNumber,
      data: { scenarios },
    } = inputData;

    const prompt = `
      You are provided with a test plan for E2E testing of an application.
      Your task is to execute the tests for each scenario.

      Test plan:
      ${scenarios
        .map(
          (scenario, idx) => `
      ${idx + 1}. Name: ${scenario.name}
      Steps:
      ${scenario.steps.map((step, stepIdx) => `${stepIdx + 1}) ${step}`).join("\n")}
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
    `;

    const playwrightAgent = mastra.getAgent("playwrightAgent");

    const { object } = await playwrightAgent.generate(
      [{ role: "user", content: prompt }],
      {
        structuredOutput: {
          schema: z.object({
            passed: z.number(),
            failed: z.number(),
            flaky: z.array(z.string()),
            durationMs: z.number(),
            artifacts: z.object({
              urls: z.array(z.string()),
            }),
            failures: z.array(
              z.object({
                name: z.string(),
                reason: z.string(),
              }),
            ),
          }),
          errorStrategy: "strict",
        },
        maxSteps: 20,
      },
    );

    if (!object) {
      throw new Error("Failed to get structured output from E2E runner agent");
    }

    return {
      repoFullName,
      prNumber,
      data: object,
    };
  },
});

const reportStep = createStep({
  id: "report-step",
  description:
    "Generates a report summarizing the results of end-to-end test execution, including statistics, artifacts, and details of any failures or flaky scenarios",
  inputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
    data: z
      .object({
        passed: z.number().describe("Number of successfully passed tests"),
        failed: z.number().describe("Number of failed tests"),
        flaky: z
          .array(z.string())
          .describe("List of scenario names that showed flaky behavior"),
        durationMs: z
          .number()
          .describe("Total execution time of all tests in milliseconds"),
        artifacts: z
          .object({
            urls: z
              .array(z.string())
              .describe("Links to artifacts (e.g., screenshots, videos)"),
          })
          .describe(
            "Links to artifacts obtained during test execution (e.g., screenshots, videos, other files)",
          ),
        failures: z
          .array(
            z.object({
              name: z.string().describe("Scenario name"),
              reason: z.string().describe("Reason for failure"),
            }),
          )
          .describe(
            "A list of failed scenarios with the reason for each failure",
          ),
      })
      .describe(
        "Results of end-to-end test execution, including statistics, artifacts, and details of any failures or flaky scenarios",
      ),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the request was successful"),
    data: z.string().describe("URL of the upserted comment"),
    error: z.string().nullable().describe("Error message if request failed"),
  }),
  execute: async ({ inputData }) => {
    const {
      repoFullName,
      prNumber,
      data: { passed, failed, flaky, durationMs, artifacts, failures },
    } = inputData;

    const durationSec = Math.round(durationMs / 1000);

    const body = `# QA Results\n\n**Totals:**\n- Passed: ${passed}\n- Failed: ${failed}\n- Duration: ${durationSec}s${
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

    const result = await upsertPrComment.execute({
      context: { repoFullName, prNumber, body },
    });

    return result;
  },
});

export const automationTestWorkflow = createWorkflow({
  id: "automation-test-workflow",
  description:
    "Automated E2E testing workflow for pull requests: fetches PR data, generates a test plan, runs E2E tests, and posts a summary report as a PR comment.",
  inputSchema: z.object({
    prLink: z.string().describe("Pull request link"),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the request was successful"),
    data: z.string().describe("URL of the upserted comment"),
    error: z.string().nullable().describe("Error message if request failed"),
  }),
})
  .then(fetchStep)
  .then(planStep)
  .then(testStep)
  .then(reportStep)
  .commit();

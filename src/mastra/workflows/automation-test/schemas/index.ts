import z from "zod";

export const fetchStepOutputSchema = z.object({
  repositoryFullName: z
    .string()
    .describe("Repository name in format owner/repo"),
  pullRequestNumber: z.number().describe("Pull request number"),
  data: z
    .object({
      url: z.string().describe("Pull request URL"),
      title: z.string().describe("Pull request title"),
      body: z.string().describe("Pull request description"),
      files: z.array(z.string()).describe("Pull request changed files"),
      testUrl: z.string().describe("URL to be used for testing"),
    })
    .describe("Pull request data"),
});

export const scenariosSchema = z.object({
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
});

export const planStepOutputSchema = z.object({
  repositoryFullName: z
    .string()
    .describe("Repository name in format owner/repo"),
  pullRequestNumber: z.number().describe("Pull request number"),
  data: scenariosSchema.describe("Test plan data"),
});

export const testResultSchema = z.object({
  passed: z.number().describe("Number of successfully passed tests"),
  failed: z.number().describe("Number of failed tests"),
  flaky: z
    .array(z.string())
    .describe("List of scenario names that showed flaky behavior"),
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
    .describe("A list of failed scenarios with the reason for each failure"),
});

export const testStepOutputSchema = z.object({
  repositoryFullName: z
    .string()
    .describe("Repository name in format owner/repo"),
  pullRequestNumber: z.number().describe("Pull request number"),
  data: z
    .object({
      ...testResultSchema.shape,
      ...scenariosSchema.shape,
    })
    .describe(
      "Results of end-to-end test execution, including statistics, artifacts, tested scenarios, and details of any failures or flaky scenarios",
    ),
});

export const reportStepOutputSchema = z.object({
  success: z.boolean().describe("Whether the request was successful"),
  data: z.string().describe("URL of the upserted comment"),
  error: z.string().nullable().describe("Error message if request failed"),
});

export const automationTestWorkflowInputSchema = z.object({
  pullRequestLink: z.string().describe("Pull request link"),
});

export const automationTestWorkflowOutputSchema = z.object({
  success: z.boolean().describe("Whether the request was successful"),
  data: z.string().describe("URL of the upserted comment"),
  error: z.string().nullable().describe("Error message if request failed"),
});

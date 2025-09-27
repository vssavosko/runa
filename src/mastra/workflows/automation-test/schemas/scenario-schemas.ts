import z from "zod";

export const scenarioSchema = z.object({
  name: z.string().describe("Scenario name"),
  steps: z.array(z.string()).describe("Scenario steps"),
  expectedResult: z.string().describe("Scenario expected result"),
  tags: z.array(z.string()).describe("Scenario tags"),
});

export const scenariosSchema = z
  .array(scenarioSchema)
  .describe("Test plan scenarios");

export const scenarioArtifactsSchema = z.object({
  urls: z
    .array(z.string())
    .describe("Links to artifacts (e.g., screenshots, videos)"),
});

export const scenarioFailureSchema = z.object({
  name: z.string().describe("Scenario name"),
  reason: z.string().describe("Reason for failure"),
});

export const scenarioTestResultsSchema = z.object({
  passed: z.number().describe("Number of successfully passed tests"),
  failed: z.number().describe("Number of failed tests"),
  flaky: z
    .array(z.string())
    .describe("List of scenario names that showed flaky behavior"),
  artifacts: z
    .object(scenarioArtifactsSchema.shape)
    .describe(
      "Links to artifacts obtained during test execution (e.g., screenshots, videos, other files)",
    ),
  failures: z
    .array(scenarioFailureSchema)
    .describe("A list of failed scenarios with the reason for each failure"),
});

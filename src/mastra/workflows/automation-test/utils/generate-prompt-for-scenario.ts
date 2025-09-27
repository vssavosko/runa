import type { ScenarioType } from "../types.js";

export const generatePromptForScenario = (scenario: ScenarioType) => `
  Use the following information to execute E2E test scenario.

  Test Scenario:
  Name: ${scenario.name}
  Steps:
  ${scenario.steps.map((step: string, stepIdx: number) => `   ${stepIdx + 1}) ${step}`).join("\n")}
  Expected result: ${scenario.expectedResult}
  Tags: ${scenario.tags.join(", ")}

  Execute scenario and return results in the specified format.
`;

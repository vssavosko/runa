import type { ScenarioTestResultsType } from "../types.js";

export const combineTestResults = (results: ScenarioTestResultsType[]) => {
  return results.reduce(
    (combined, result) => ({
      passed: combined.passed + (result?.passed || 0),
      failed: combined.failed + (result?.failed || 0),
      flaky: [...combined.flaky, ...(result?.flaky || [])],
      artifacts: {
        urls: [...combined.artifacts.urls, ...(result?.artifacts?.urls || [])],
      },
      failures: [...combined.failures, ...(result?.failures || [])],
    }),
    {
      passed: 0,
      failed: 0,
      flaky: [],
      artifacts: { urls: [] },
      failures: [],
    },
  );
};

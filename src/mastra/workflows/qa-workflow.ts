import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { getPrFiles, getPrInfo } from '../tools/github.ts';

const fetchStep = createStep({
  id: 'fetch-step',
  description: 'Fetches PR metadata and changed files using GitHub API tools',
  inputSchema: z.object({
    prLink: z.string(),
  }),
  outputSchema: z.object({
    repo_full_name: z.string(), // owner/name
    pr_number: z.number(),
    pr_title: z.string(),
    pr_body: z.string(), // original description text
    test_url: z.string(), // extracted http(s) URL or empty string
    changed_files: z.array(z.string()), // file paths
    notes: z.string(), // short notes about extraction/assumptions
  }),
  execute: async ({ inputData }) => {
    const { prLink } = inputData;

    const match = prLink.match(/github\.com\/(.+?)\/(.+?)\/pull\/(\d+)/i);
    if (!match) {
      throw new Error(`Invalid PR link: ${prLink}`);
    }
    const owner = match[1];
    const repo = match[2];
    const prNumber = Number(match[3]);
    const repo_full_name = `${owner}/${repo}`;

    const info = await getPrInfo.execute({ repo_full_name, pr_number: prNumber });
    if (!info.success) {
      throw new Error(`getPrInfo failed: ${info.error}`);
    }

    const files = await getPrFiles.execute({ repo_full_name, pr_number: prNumber });
    if (!files.success) {
      throw new Error(`getPrFiles failed: ${files.error}`);
    }

    const body = info.pr_body ?? '';
    const urlMatch = body.match(/https?:\/\/\S+/i);
    const test_url = urlMatch ? urlMatch[0] : '';
    const notes = test_url ? '' : 'No test URL found in PR body';

    return {
      repo_full_name,
      pr_number: prNumber,
      pr_title: info.pr_title ?? '',
      pr_body: body,
      test_url,
      changed_files: files.files,
      notes,
    };
  },
});

const planStep = createStep({
  id: 'plan-step',
  description: 'Generates test plan',
  inputSchema: z.object({
    repo_full_name: z.string(),
    pr_number: z.number(),
    pr_title: z.string(),
    pr_body: z.string(),
    test_url: z.string(),
    changed_files: z.array(z.string()),
    notes: z.string(),
  }),
  outputSchema: z.object({
    repo_full_name: z.string(),
    pr_number: z.number(),
    plan: z.object({
      scenarios: z.array(
        z.object({
          name: z.string(),
          steps: z.array(z.string()),
          expected_result: z.string(),
          tags: z.array(z.string()),
        })
      ),
      notes: z.string(),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const { repo_full_name, pr_number, pr_title, pr_body, test_url, changed_files, notes } =
      inputData;

    const prompt = `
      Use the following pull request information to generate a concise, actionable E2E test plan.
      
      PR Link: ${repo_full_name}/pull/${pr_number}
      Test URL: ${test_url}
      PR Title: ${pr_title}
      PR Body: ${pr_body}
      Changed Files: ${changed_files.join(', ')}
      Notes: ${notes}

      Focus on user-facing changes and critical flows. Keep steps clear and deterministic.
    `;

    const testPlanAgent = mastra.getAgent('testPlanAgent');
    const { text } = await testPlanAgent.generate([{ role: 'user', content: prompt }]);

    const agentOutput = JSON.parse(text);

    return {
      repo_full_name,
      pr_number,
      plan: agentOutput.plan,
    };
  },
});

const runStep = createStep({
  id: 'run-step',
  description: 'Runs E2E tests',
  inputSchema: z.object({
    repo_full_name: z.string(),
    pr_number: z.number(),
    plan: z.object({
      scenarios: z.array(
        z.object({
          name: z.string(),
          steps: z.array(z.string()),
          expected_result: z.string(),
          tags: z.array(z.string()),
        })
      ),
      notes: z.string(),
    }),
  }),
  outputSchema: z.object({
    repo_full_name: z.string(),
    pr_number: z.number(),
    passed: z.number(),
    failed: z.number(),
    flaky: z.array(z.string()),
    duration_ms: z.number(),
    artifacts: z.object({
      urls: z.array(z.string()),
    }),
    failures: z.array(
      z.object({
        name: z.string(),
        reason: z.string(),
      })
    ),
  }),
  execute: async ({ inputData, mastra }) => {
    const { repo_full_name, pr_number, plan } = inputData;

    const prompt = `
You are provided with a test plan for E2E testing of a web application.
Your task is to execute the tests for each scenario and return the result strictly in the following JSON format:

{
  "passed": number, // number of successfully passed tests
  "failed": number, // number of failed tests
  "flaky": string[], // list of scenario names that showed flaky behavior
  "duration_ms": number, // total execution time of all tests in milliseconds
  "artifacts": { "urls": string[] }, // links to artifacts (e.g., screenshots, videos)
  "failures": [{ "name": string, "reason": string }] // list of failed scenarios with reasons
}

Test plan:
${plan.scenarios
  .map(
    (scenario, idx) => `
${idx + 1}. Name: ${scenario.name}
   Steps:
   ${scenario.steps.map((step, stepIdx) => `${stepIdx + 1}) ${step}`).join('\n')}
   Expected result: ${scenario.expected_result}
   Tags: ${scenario.tags.join(', ')}
`
  )
  .join('\n')}
Notes: ${plan.notes}

Requirements:
- Do not fabricate results: if a test cannot be executed, specify it in failures.
- If a scenario is flaky, add its name to the flaky array.
- For each failed test, specify the reason in failures.
- If there are artifacts (screenshots, videos), add their links to artifacts.urls.
- Return only valid JSON without any explanations or comments.
`;

    const e2eRunnerAgent = mastra.getAgent('e2eRunnerAgent');
    const { text } = await e2eRunnerAgent.generate([{ role: 'user', content: prompt }]);

    const agentOutput = JSON.parse(text);

    return {
      repo_full_name,
      pr_number,
      ...agentOutput,
    };
  },
});

// TODO: "Missing required parameters: repo_full_name and pr_number"
const reportStep = createStep({
  id: 'report-step',
  description: 'Generates report',
  inputSchema: z.object({
    repo_full_name: z.string(),
    pr_number: z.number(),
    passed: z.number(),
    failed: z.number(),
    flaky: z.array(z.string()),
    duration_ms: z.number(),
    artifacts: z.object({
      urls: z.array(z.string()),
    }),
    failures: z.array(
      z.object({
        name: z.string(),
        reason: z.string(),
      })
    ),
  }),
  outputSchema: z.object({
    commented: z.boolean(),
    comment_url: z.string().nullable(),
    error: z.string().nullable(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { repo_full_name, pr_number, passed, failed, flaky, duration_ms, artifacts, failures } =
      inputData;

    const prompt = `
      Generate a concise Markdown report for the PR.

      Repository: ${repo_full_name}
      PR Number: ${pr_number}

      E2E Test Results:
      - Passed: ${passed}
      - Failed: ${failed}
      - Duration: ${Math.round(duration_ms / 1000)}s
      ${flaky.length > 0 ? `- Flaky: ${flaky.length}` : ''}

      ${
        failures.length > 0
          ? `Failures:
      ${failures.map((f, i) => `${i + 1}. ${f.name}: ${f.reason}`).join('\n')}`
          : ''
      }

      ${
        artifacts.urls.length > 0
          ? `Artifacts:
      ${artifacts.urls.map((url) => `- ${url}`).join('\n')}`
          : ''
      }

      Post this report as a comment to the PR using the postPrComment tool.
      Use: postPrComment({"repo_full_name": "${repo_full_name}", "pr_number": ${pr_number}, "body": "<markdown>"})
    `;

    const reportAgent = mastra.getAgent('reportAgent');
    const { text } = await reportAgent.generate([{ role: 'user', content: prompt }]);

    const agentOutput = JSON.parse(text);

    return agentOutput;
  },
});

export const qaWorkflow = createWorkflow({
  id: 'qa-workflow',
  description:
    'Automated QA workflow for pull requests: fetches PR data, generates a test plan, runs E2E tests, and posts a summary report as a PR comment.',
  inputSchema: z.object({
    prLink: z.string(),
  }),
  outputSchema: z.object({
    commented: z.boolean(),
    comment_url: z.string().nullable(),
    error: z.string().nullable(),
  }),
})
  .then(fetchStep)
  .then(planStep)
  .then(runStep)
  .then(reportStep)
  .commit();

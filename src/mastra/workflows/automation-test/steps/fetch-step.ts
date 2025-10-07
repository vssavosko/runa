import { createStep } from "@mastra/core/workflows";

import {
  getPullRequestFiles,
  getPullRequestInfo,
} from "../../../tools/github.js";
import { pullRequestLinkSchema } from "../../../tools/schemas/github-schemas.js";
import { fetchStepOutputSchema } from "../schemas/index.js";

export const fetchStep = createStep({
  id: "fetch-step",
  description:
    "Fetches pull request metadata and changed files using GitHub API tools",
  inputSchema: pullRequestLinkSchema,
  outputSchema: fetchStepOutputSchema,
  execute: async ({ inputData: { pullRequestLink } }) => {
    const match = pullRequestLink.match(
      /github\.com\/(.+?)\/(.+?)\/pull\/(\d+)/i,
    );

    if (!match) {
      throw new Error(`Invalid pull request link: ${pullRequestLink}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, owner, repo, pullRequestNumber] = match;
    const repositoryFullName = `${owner}/${repo}`;

    const info = await getPullRequestInfo.execute({
      repositoryFullName,
      pullRequestNumber: Number(pullRequestNumber),
    });

    if (!info.success) {
      throw new Error(`Failed to get pull request info: ${info.error}`);
    }

    const files = await getPullRequestFiles.execute({
      repositoryFullName,
      pullRequestNumber: Number(pullRequestNumber),
    });

    if (!files.success) {
      throw new Error(`Failed to get pull request files: ${files.error}`);
    }

    const { url, title, body } = info.data;

    const labeledUrlMatch = body.match(
      /test\s*url\s*:\s*(?:\n\s*)?(https?:\/\/\S+)/i,
    );
    const rawTestUrl = (labeledUrlMatch?.[1] || "").trim();
    const testUrl = rawTestUrl.replace(/[)\],>.;'"`]+$/g, "");

    if (!testUrl)
      throw new Error(
        `Failed to get test url from pull request body. Use "Test URL:" label in the pull request body to specify the test url. Example: "Test URL: https://example.com"`,
      );

    return {
      repositoryFullName,
      pullRequestNumber: Number(pullRequestNumber),
      data: {
        url,
        title,
        body,
        files: files.data,
        testUrl,
      },
    };
  },
});

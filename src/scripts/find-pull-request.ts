import type { Endpoints } from "@octokit/types";

import { writeFileSync } from "fs";
import { Octokit } from "octokit";
import { extractBranchFromRef } from "../mastra/utils/extract-branch-from-ref.js";
import { parseRepositoryFullName } from "../mastra/utils/parse-repository-full-name.js";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"][0];

const validateConfig = () => {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const outputPath = process.env.GITHUB_OUTPUT;
  const ref = process.env.INPUT_REF;

  if (!token) throw new Error("GITHUB_ACCESS_TOKEN is required");
  if (!repository) throw new Error("GITHUB_REPOSITORY is required");
  if (!ref) throw new Error("INPUT_REF is required");

  return { token, repository, outputPath, ref };
};

const writeOutput = (outputPath: string, pullRequest: PullRequest): void => {
  const output = `number=${pullRequest.number}\nlink=${pullRequest.html_url}\n`;

  writeFileSync(outputPath, output, { flag: "a" });
};

const findPullRequestByExactBranch = async (
  octokit: Octokit,
  owner: string,
  name: string,
  branch: string,
): Promise<PullRequest | null> => {
  const { data } = await octokit.rest.pulls.list({
    owner,
    repo: name,
    state: "open",
    head: `${owner}:${branch}`,
    per_page: 1,
  });

  return data[0] || null;
};

const findPullRequestByBranchSearch = async (
  octokit: Octokit,
  owner: string,
  name: string,
  branch: string,
): Promise<PullRequest> => {
  const pulls = await octokit.paginate(octokit.rest.pulls.list, {
    owner,
    repo: name,
    state: "open",
    per_page: 100,
  });

  const pullRequest = pulls.find((p: PullRequest) => p.head?.ref === branch);

  if (!pullRequest) {
    throw new Error(
      `No open pull request found for branch '${branch}'. If this is a fork, ensure an open pull request exists.`,
    );
  }

  return pullRequest;
};

const findPullRequest = async (): Promise<void> => {
  try {
    const config = validateConfig();
    const { owner, repo } = parseRepositoryFullName(config.repository);
    const branch = extractBranchFromRef(config.ref);

    const octokit = new Octokit({ auth: config.token });

    let pullRequest = await findPullRequestByExactBranch(
      octokit,
      owner,
      repo,
      branch,
    );

    if (!pullRequest) {
      pullRequest = await findPullRequestByBranchSearch(
        octokit,
        owner,
        repo,
        branch,
      );
    }

    if (config.outputPath) writeOutput(config.outputPath, pullRequest);

    console.log(
      `Found pull request #${pullRequest.number}: ${pullRequest.title}`,
    );
  } catch (error: unknown) {
    console.error("Error finding pull request: ", error);

    process.exit(1);
  }
};

findPullRequest();

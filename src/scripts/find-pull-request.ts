import { writeFileSync } from "fs";

import { Octokit } from "octokit";

import type { Endpoints } from "@octokit/types";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"][0];

type Config = {
  token: string;
  repository: string;
  ref: string;

  outputPath?: string;
};

const validateConfig = (): Config => {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const outputPath = process.env.GITHUB_OUTPUT;
  const ref = process.env.INPUT_REF;

  if (!token) throw new Error("GITHUB_ACCESS_TOKEN is required");
  if (!repository) throw new Error("GITHUB_REPOSITORY is required");
  if (!ref) throw new Error("INPUT_REF is required");

  return { token, repository, outputPath, ref };
};

const parseRepository = (
  repository: string,
): { owner: string; name: string } => {
  const [owner, name] = repository.split("/");

  if (!owner || !name) throw new Error("Invalid repository format");

  return { owner, name };
};

const extractBranch = (ref: string): string => {
  const branch = ref.trim().replace(/^refs\/heads\//, "");

  if (!branch) throw new Error("Branch not found in ref");

  return branch;
};

const writeOutput = (outputPath: string, pr: PullRequest): void => {
  const output = `number=${pr.number}\nlink=${pr.html_url}\n`;

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

  const pr = pulls.find((p: PullRequest) => p.head?.ref === branch);

  if (!pr) {
    throw new Error(
      `No open PR found for branch '${branch}'. If this is a fork, ensure an open PR exists.`,
    );
  }

  return pr;
};

const findPullRequest = async (): Promise<void> => {
  try {
    const config = validateConfig();
    const { owner, name } = parseRepository(config.repository);
    const branch = extractBranch(config.ref);

    const octokit = new Octokit({ auth: config.token });

    let pr = await findPullRequestByExactBranch(octokit, owner, name, branch);

    if (!pr) {
      pr = await findPullRequestByBranchSearch(octokit, owner, name, branch);
    }

    if (config.outputPath) writeOutput(config.outputPath, pr);

    console.log(`Found PR #${pr.number}: ${pr.title}`);
  } catch (error) {
    console.error("Error detecting PR:", error);

    process.exit(1);
  }
};

findPullRequest();

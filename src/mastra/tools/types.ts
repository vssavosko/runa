import type { Endpoints } from "@octokit/types";

export type PullRequestFileType =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"]["response"]["data"][0];

export type IssueCommentType =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"]["response"]["data"][0];

export type PullRequestDataType = {
  repoFullName: string;
  prNumber: number;

  body?: string;
};

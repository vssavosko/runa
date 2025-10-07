import { Octokit } from "octokit";

import {
  getPullRequestFilesOutputSchema,
  getPullRequestInfoOutputSchema,
  pullRequestIdentifierSchema,
  upsertPullRequestCommentOutputSchema,
} from "./schemas/github-schemas.js";

import type {
  IssueCommentType,
  PullRequestDataType,
  PullRequestFileType,
} from "./types.js";

const octokit = new Octokit({ auth: process.env["GITHUB_ACCESS_TOKEN"] || "" });

const validatePullRequestParams = (
  repositoryFullName: PullRequestDataType["repositoryFullName"],
  pullRequestNumber: PullRequestDataType["pullRequestNumber"],
): void => {
  if (!repositoryFullName || !pullRequestNumber) {
    throw new Error(
      `Missing required parameters: repositoryFullName: ${repositoryFullName}, pullRequestNumber: ${pullRequestNumber}`,
    );
  }
};

const parseRepository = (
  repoFullName: PullRequestDataType["repositoryFullName"],
): { owner: string; repo: string } => {
  const [owner, repo] = repoFullName.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${repoFullName}`);
  }

  return { owner, repo };
};

const handleApiError = <T>(
  error: unknown,
  operation: string,
  defaultData: T,
): { success: false; data: T; error: string } => {
  return {
    success: false,
    data: defaultData,
    error: error instanceof Error ? error.message : `Failed to ${operation}`,
  };
};

export const getPullRequestInfo = {
  id: "get-pull-request-info",
  description: "Gets information about a GitHub pull request",
  inputSchema: pullRequestIdentifierSchema,
  outputSchema: getPullRequestInfoOutputSchema,
  execute: async ({
    repositoryFullName,
    pullRequestNumber,
  }: PullRequestDataType) => {
    validatePullRequestParams(repositoryFullName, pullRequestNumber);

    try {
      const { owner, repo } = parseRepository(repositoryFullName);

      const { data: pullRequestData } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullRequestNumber,
      });

      return {
        success: true,
        data: {
          url: pullRequestData.html_url,
          title: pullRequestData.title,
          body: pullRequestData.body || "",
        },
        error: null,
      };
    } catch (error: unknown) {
      return handleApiError(error, "get pull request info", {
        url: null,
        title: null,
        body: null,
      });
    }
  },
};

export const getPullRequestFiles = {
  id: "get-pull-request-files",
  description: "Lists changed files for a GitHub pull request",
  inputSchema: pullRequestIdentifierSchema,
  outputSchema: getPullRequestFilesOutputSchema,
  execute: async ({
    repositoryFullName,
    pullRequestNumber,
  }: PullRequestDataType) => {
    validatePullRequestParams(repositoryFullName, pullRequestNumber);

    try {
      const { owner, repo } = parseRepository(repositoryFullName);

      const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: pullRequestNumber,
        per_page: 100,
      });

      const fileNames = files.map((file: PullRequestFileType) => file.filename);

      return { success: true, data: fileNames, error: null };
    } catch (error: unknown) {
      return handleApiError(error, "get pull request files", []);
    }
  },
};

export const upsertPullRequestComment = {
  id: "upsert-pull-request-comment",
  description:
    "Creates or updates a report pull request comment authored by the current authenticated user (bot/account)",
  inputSchema: pullRequestIdentifierSchema,
  outputSchema: upsertPullRequestCommentOutputSchema,
  execute: async ({
    repositoryFullName,
    pullRequestNumber,
    body,
  }: PullRequestDataType) => {
    validatePullRequestParams(repositoryFullName, pullRequestNumber);

    try {
      const { owner, repo } = parseRepository(repositoryFullName);

      const comments = await octokit.paginate(
        octokit.rest.issues.listComments,
        {
          owner,
          repo,
          issue_number: pullRequestNumber,
          per_page: 100,
        },
      );

      const existingComment = comments.find((comment: IssueCommentType) =>
        comment.body?.includes("<!-- RUNA-REPORT -->"),
      );

      if (existingComment) {
        const { data: result } = await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: body || "",
        });

        return {
          success: true,
          data: result.html_url,
          error: null,
        };
      } else {
        const { data: result } = await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pullRequestNumber,
          body: body || "",
        });

        return {
          success: true,
          data: result.html_url,
          error: null,
        };
      }
    } catch (error: unknown) {
      return handleApiError(error, "upsert pull request comment", "");
    }
  },
};

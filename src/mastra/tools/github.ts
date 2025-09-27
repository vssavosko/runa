import { Octokit } from "octokit";
import { z } from "zod";

import type {
  IssueCommentType,
  PullRequestDataType,
  PullRequestFileType,
} from "./types";

const octokit = new Octokit({ auth: process.env["GITHUB_ACCESS_TOKEN"] || "" });

const validatePrParams = (
  repoFullName: PullRequestDataType["repoFullName"],
  prNumber: PullRequestDataType["prNumber"],
  body?: PullRequestDataType["body"],
): void => {
  if (!repoFullName || !prNumber) {
    throw new Error(
      `Missing required parameters: repoFullName: ${repoFullName}, prNumber: ${prNumber}`,
    );
  }

  if (body !== undefined && !body) {
    throw new Error(`Missing required parameter: body`);
  }
};

const parseRepository = (
  repoFullName: PullRequestDataType["repoFullName"],
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

/**
 * Tool for getting pull request information
 */
export const getPrInfo = {
  id: "get-pr-info",
  description: "Gets information about a GitHub pull request",
  inputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the request was successful"),
    data: z
      .object({
        url: z.string().nullable().describe("Pull request URL"),
        title: z.string().nullable().describe("Pull request title"),
        body: z.string().nullable().describe("Pull request description"),
      })
      .describe("Pull request data"),
    error: z.string().nullable().describe("Error message if request failed"),
  }),
  execute: async (inputData: { context: PullRequestDataType }) => {
    const { repoFullName, prNumber } = inputData.context;

    validatePrParams(repoFullName, prNumber);

    try {
      const { owner, repo } = parseRepository(repoFullName);

      const { data: prData } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      return {
        success: true,
        data: {
          url: prData.html_url ?? null,
          title: prData.title ?? null,
          body: prData.body ?? null,
        },
        error: null,
      };
    } catch (error: unknown) {
      return handleApiError(error, "get PR info", {
        url: null,
        title: null,
        body: null,
      });
    }
  },
};

/**
 * Tool for listing changed files in a PR
 */
export const getPrFiles = {
  id: "get-pr-files",
  description: "Lists changed files for a GitHub pull request",
  inputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the request was successful"),
    data: z.array(z.string()).describe("Array of changed file paths"),
    error: z.string().nullable().describe("Error message if request failed"),
  }),
  execute: async (inputData: { context: PullRequestDataType }) => {
    const { repoFullName, prNumber } = inputData.context;

    validatePrParams(repoFullName, prNumber);

    try {
      const { owner, repo } = parseRepository(repoFullName);

      const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      });

      const fileNames = files.map((file: PullRequestFileType) => file.filename);

      return { success: true, data: fileNames, error: null };
    } catch (error: unknown) {
      return handleApiError(error, "get PR files", []);
    }
  },
};

/**
 * Tool for upserting a PR comment by the current authenticated user (create or update)
 */
export const upsertPrComment = {
  id: "upsert-pr-comment",
  description:
    "Creates or updates a report PR comment authored by the current authenticated user (bot/account)",
  inputSchema: z.object({
    repoFullName: z.string().describe("Repository name in format owner/repo"),
    prNumber: z.number().describe("Pull request number"),
    body: z.string().describe("Comment body in markdown format"),
  }),
  outputSchema: z.object({
    success: z
      .boolean()
      .describe("Whether the comment was created/updated successfully"),
    data: z.string().describe("URL of the upserted comment"),
    error: z.string().nullable().describe("Error message if operation failed"),
  }),
  execute: async (inputData: { context: PullRequestDataType }) => {
    const { repoFullName, prNumber, body } = inputData.context;

    validatePrParams(repoFullName, prNumber, body);

    try {
      const { owner, repo } = parseRepository(repoFullName);

      const { data: user } = await octokit.rest.users.getAuthenticated();
      const currentLogin = user.login;

      const comments = await octokit.paginate(
        octokit.rest.issues.listComments,
        {
          owner,
          repo,
          issue_number: prNumber,
          per_page: 100,
        },
      );

      const existingComment = comments.find(
        (comment: IssueCommentType) => comment.user?.login === currentLogin,
      );

      if (existingComment) {
        const { data: result } = await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body,
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
          issue_number: prNumber,
          body,
        });

        return {
          success: true,
          data: result.html_url,
          error: null,
        };
      }
    } catch (error: unknown) {
      return handleApiError(error, "upsert PR comment", "");
    }
  },
};

import { z } from 'zod';

/**
 * Tool for posting comments to GitHub pull requests
 */
export const postPrComment = {
  id: 'post_pr_comment',
  description: 'Posts a comment to a GitHub pull request',
  inputSchema: z.object({
    repo_full_name: z.string().describe('Repository name in format owner/repo'),
    pr_number: z.number().describe('Pull request number'),
    body: z.string().describe('Comment body in markdown format'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the comment was posted successfully'),
    comment_url: z.string().nullable().describe('URL of the created comment'),
    error: z.string().nullable().describe('Error message if posting failed'),
  }),
  execute: async (inputData: {
    context: { repo_full_name: string; pr_number: number; body: string };
  }) => {
    if (!inputData) {
      throw new Error('inputData is undefined');
    }

    const { repo_full_name, pr_number, body } = inputData.context;

    if (!repo_full_name || !pr_number || !body) {
      throw new Error(
        `Missing required parameters: repo_full_name=${repo_full_name}, pr_number=${pr_number}, body=${body}`
      );
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo_full_name}/issues/${pr_number}/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mastra-Runa/1.0.0',
          },
          body: JSON.stringify({
            body: body,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        comment_url: result.html_url,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        comment_url: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

/**
 * Tool for getting pull request information
 */
export const getPrInfo = {
  id: 'get_pr_info',
  description: 'Gets information about a GitHub pull request',
  inputSchema: z.object({
    repo_full_name: z.string().describe('Repository name in format owner/repo'),
    pr_number: z.number().describe('Pull request number'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the request was successful'),
    pr_title: z.string().nullable().describe('Pull request title'),
    pr_body: z.string().nullable().describe('Pull request description'),
    pr_url: z.string().nullable().describe('Pull request URL'),
    error: z.string().nullable().describe('Error message if request failed'),
  }),
  execute: async (inputData: { repo_full_name: string; pr_number: number }) => {
    const { repo_full_name, pr_number } = inputData;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo_full_name}/pulls/${pr_number}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Mastra-Runa/1.0.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const prData = await response.json();

      return {
        success: true,
        pr_title: prData.title,
        pr_body: prData.body,
        pr_url: prData.html_url,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        pr_title: null,
        pr_body: null,
        pr_url: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

/**
 * Tool for listing changed files in a PR
 */
export const getPrFiles = {
  id: 'get_pr_files',
  description: 'Lists changed files for a GitHub pull request',
  inputSchema: z.object({
    repo_full_name: z.string().describe('Repository name in format owner/repo'),
    pr_number: z.number().describe('Pull request number'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the request was successful'),
    files: z.array(z.string()).describe('Array of changed file paths'),
    error: z.string().nullable().describe('Error message if request failed'),
  }),
  execute: async (inputData: { repo_full_name: string; pr_number: number }) => {
    const { repo_full_name, pr_number } = inputData;

    try {
      const allFiles: string[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await fetch(
          `https://api.github.com/repos/${repo_full_name}/pulls/${pr_number}/files?per_page=${perPage}&page=${page}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'Mastra-Runa/1.0.0',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const pageData: Array<{ filename: string }> = await response.json();
        allFiles.push(...pageData.map((f) => f.filename));

        if (pageData.length < perPage) {
          break;
        }
        page += 1;
      }

      return { success: true, files: allFiles, error: null };
    } catch (error) {
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

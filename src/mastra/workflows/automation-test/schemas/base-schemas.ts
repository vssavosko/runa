import z from "zod";

export const repositoryInfoSchema = z.object({
  repositoryFullName: z
    .string()
    .describe("Repository name in format owner/repo"),
  pullRequestNumber: z.number().describe("Pull request number"),
});

export const pullRequestDataSchema = z.object({
  url: z.string().describe("Pull request URL"),
  title: z.string().describe("Pull request title"),
  body: z.string().describe("Pull request description"),
  files: z.array(z.string()).describe("Pull request changed files"),
  testUrl: z.string().describe("URL to be used for testing"),
});

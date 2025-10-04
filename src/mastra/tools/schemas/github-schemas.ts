import z from "zod";

export const pullRequestIdentifierSchema = z.object({
  repositoryFullName: z
    .string()
    .describe("Repository name in format owner/repo"),
  pullRequestNumber: z.number().describe("Pull request number"),
  body: z.string().optional().describe("Pull request description"),
});

export const pullRequestLinkSchema = z.object({
  pullRequestLink: z.string().describe("Pull request link"),
});

export const getPullRequestInfoOutputSchema = z.object({
  success: z.boolean().describe("Whether the request was successful"),
  data: z
    .object({
      url: z.string().nullable().describe("Pull request URL"),
      title: z.string().nullable().describe("Pull request title"),
      body: z.string().nullable().describe("Pull request description"),
    })
    .describe("Pull request data"),
  error: z.string().nullable().describe("Error message if request failed"),
});

export const getPullRequestFilesOutputSchema = z.object({
  success: z.boolean().describe("Whether the request was successful"),
  data: z.array(z.string()).describe("Array of changed file paths"),
  error: z.string().nullable().describe("Error message if request failed"),
});

export const upsertPullRequestCommentOutputSchema = z.object({
  success: z
    .boolean()
    .describe("Whether the comment was created/updated successfully"),
  data: z.string().describe("URL of the upserted comment"),
  error: z.string().nullable().describe("Error message if operation failed"),
});

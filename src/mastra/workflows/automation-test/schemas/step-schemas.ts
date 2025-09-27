import z from "zod";

import { pullRequestDataSchema, repositoryInfoSchema } from "./base-schemas.js";
import {
  scenariosSchema,
  scenarioTestResultsSchema,
} from "./scenario-schemas.js";

export const fetchStepOutputSchema = z.object({
  ...repositoryInfoSchema.shape,
  data: pullRequestDataSchema,
});

export const planStepOutputSchema = z.object({
  ...repositoryInfoSchema.shape,
  data: scenariosSchema,
});

export const testStepOutputSchema = z.object({
  ...repositoryInfoSchema.shape,
  data: z
    .object({
      ...scenarioTestResultsSchema.shape,
      scenarios: scenariosSchema,
    })
    .describe(
      "Results of end-to-end test execution, including statistics, artifacts, tested scenarios, and details of any failures or flaky scenarios",
    ),
});

export const reportStepOutputSchema = z.object({
  success: z.boolean().describe("Whether the request was successful"),
  data: z.string().describe("URL of the upserted comment"),
  error: z.string().nullable().describe("Error message if request failed"),
});

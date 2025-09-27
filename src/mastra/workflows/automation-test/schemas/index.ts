import { pullRequestLinkSchema } from "../../../tools/schemas/github-schemas.js";
import { reportStepOutputSchema } from "./step-schemas.js";

export const automationTestWorkflowInputSchema = pullRequestLinkSchema;

export const automationTestWorkflowOutputSchema = reportStepOutputSchema;

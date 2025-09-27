import { mastra } from "./mastra/index.js";
import { mcp } from "./mastra/mcp.js";

const processRuna = async (prLink: string): Promise<boolean> => {
  const logger = mastra.getLogger();

  logger.info(`🚀 Starting automation-test-workflow for PR: ${prLink}`);

  try {
    const workflow = mastra.getWorkflow("automationTestWorkflow");

    if (!workflow) throw new Error("automation-test-workflow not found");

    logger.info("✅ Workflow found, creating run...");

    const run = await workflow.createRunAsync();

    logger.info("⚡ Starting workflow execution...");

    const result = await run.start({ inputData: { prLink } });

    if (result.status === "success") {
      logger.info("✅ automation-test-workflow completed successfully!");

      return true;
    } else {
      logger.error(`❌ automation-test-workflow failed: ${result.traceId}`);

      return false;
    }
  } catch (error: unknown) {
    logger.error(
      `💥 Unexpected error during automation-test-workflow execution: ${error}`,
    );

    return false;
  }
};

(async () => {
  const prLink = process.env["PR_LINK"];

  if (!prLink) {
    console.error("❌ PR_LINK environment variable is required");

    process.exit(1);
  }

  const success = await processRuna(prLink);

  await mcp.disconnect();
  await mastra.shutdown();

  process.exit(success ? 0 : 1);
})();

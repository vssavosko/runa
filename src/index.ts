import { mastra } from "./mastra/index.js";
import { mcp } from "./mastra/mcp.js";

const runWorkflow = async (pullRequestLink: string): Promise<boolean> => {
  const logger = mastra.getLogger();

  logger.info(
    `🚀 Starting automation-test-workflow for a pull request: ${pullRequestLink}`,
  );

  try {
    const workflow = mastra.getWorkflow("automationTestWorkflow");

    if (!workflow) throw new Error("automation-test-workflow not found");

    logger.info("✅ Workflow found, creating run...");

    const run = await workflow.createRunAsync();

    logger.info("⚡ Starting workflow execution...");

    const result = await run.start({ inputData: { pullRequestLink } });

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

const cleanup = async () => {
  try {
    await mcp.disconnect();
    await mastra.stopEventEngine();
    await mastra.shutdown();
  } catch (error: unknown) {
    console.error("❌ Error during cleanup: ", error);
  }
};

(async () => {
  const pullRequestLink = process.env["PULL_REQUEST_LINK"];

  if (!pullRequestLink) {
    console.error("❌ PULL_REQUEST_LINK environment variable is required");

    await cleanup();

    process.exit(1);
  }

  const success = await runWorkflow(pullRequestLink);

  await cleanup();

  process.exit(success ? 0 : 1);
})();

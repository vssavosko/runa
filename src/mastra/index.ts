import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";

import { plannerAgent } from "./agents/planner-agent.js";
import { playwrightAgent } from "./agents/playwright-agent.js";
import { automationTestWorkflow } from "./workflows/automation-test/index.js";

export const mastra = new Mastra({
  agents: { plannerAgent, playwrightAgent },
  workflows: { automationTestWorkflow },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});

import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';

import { testPlanAgent } from './agents/test-plan-agent.ts';
import { e2eRunnerAgent } from './agents/e2e-runner-agent.ts';
import { reportAgent } from './agents/report-agent.ts';
import { qaWorkflow } from './workflows/qa-workflow.ts';

export const mastra = new Mastra({
  agents: { testPlanAgent, e2eRunnerAgent, reportAgent },
  workflows: { qaWorkflow },
  storage: new LibSQLStore({
    url: ':memory:',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});

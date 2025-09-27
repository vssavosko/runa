import type { z } from "zod";

import type {
  scenarioSchema,
  scenarioTestResultsSchema,
} from "./schemas/scenario-schemas.js";

export type ScenarioType = z.infer<typeof scenarioSchema>;

export type ScenarioTestResultsType = z.infer<typeof scenarioTestResultsSchema>;

import { Page } from "playwright";
import { ActionName } from "../constants/actions";
import { JobRecord } from "../types/job";
import { runCreateChildOrderScenario } from "./createChildOrder";
import { runUsePointsScenario } from "./usePoints";

export async function runScenario(action: ActionName, page: Page, job: JobRecord): Promise<void> {
  switch (action) {
    case "create_child_order":
      await runCreateChildOrderScenario(page, job);
      return;
    case "use_points":
      await runUsePointsScenario(page, job);
      return;
    default: {
      const neverAction: never = action;
      throw new Error(`Unsupported action: ${neverAction}`);
    }
  }
}

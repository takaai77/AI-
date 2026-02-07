import { Page } from "playwright";
import { JobRecord } from "../types/job";

export async function runUsePointsScenario(page: Page, job: JobRecord): Promise<void> {
  // このシナリオも PoC 用のダミーです。
  // 実際にはポイント利用画面へ遷移し、入力→確認→確定を行います。
  await page.goto("https://example.com", {
    waitUntil: "domcontentloaded"
  });

  // getByRole を優先して、見出しの存在をチェックします。
  const heading = page.getByRole("heading", { name: /example domain/i });
  await heading.waitFor({ state: "visible" });

  // 本番では getByLabel で入力項目を触る想定ですが、PoC では確認のみで終了します。
  const moreInfoLink = page.getByRole("link", { name: /more information/i });
  await moreInfoLink.waitFor({ state: "visible" });

  // waitForTimeout は使わず、要素状態の待機で安定性を担保します。
  console.info(`[scenario] use_points finished jobId=${job.jobId}`);
}

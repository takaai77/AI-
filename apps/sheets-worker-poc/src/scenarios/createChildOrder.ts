import { Page } from "playwright";
import { JobRecord } from "../types/job";

export async function runCreateChildOrderScenario(page: Page, job: JobRecord): Promise<void> {
  // このシナリオは PoC 用のダミー実装です。
  // 実案件では job.customerId や job.orderNo を使って画面入力を行います。
  await page.goto("https://example.com", {
    waitUntil: "domcontentloaded"
  });

  // getByRole を使って、画面に期待する見出しが存在するかを確認します。
  const heading = page.getByRole("heading", { name: /example domain/i });
  await heading.waitFor({ state: "visible" });

  // 追加でリンクの存在も検証し、最低限の画面品質チェックを行います。
  const moreInfoLink = page.getByRole("link", { name: /more information/i });
  await moreInfoLink.waitFor({ state: "visible" });

  // ダミー実装であることをログに残し、シナリオ正常終了とします。
  console.info(`[scenario] create_child_order finished jobId=${job.jobId}`);
}

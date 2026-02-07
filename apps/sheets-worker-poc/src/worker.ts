import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { WORKER_CONCURRENCY, createWorkerQueue } from "./queue/queue";
import { runScenario } from "./scenarios";
import { JobsRepo } from "./sheets/jobsRepo";
import { createSheetsClient, requireEnv } from "./sheets/sheetsClient";
import { JobRecord } from "./types/job";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

function resolveJobsSheetName(): string {
  const raw = (process.env.JOBS_SHEET_NAME ?? "jobs").trim();
  return raw.length > 0 ? raw : "jobs";
}

function resolvePollMs(): number {
  const raw = process.env.WORKER_POLL_MS ?? "3000";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 3000;
  }
  return Math.min(5000, Math.max(2000, Math.floor(parsed)));
}

function resolveBatchSize(): number {
  const raw = process.env.WORKER_BATCH_SIZE ?? "20";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(100, Math.floor(parsed));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processJob(repo: JobsRepo, queuedJob: JobRecord): Promise<void> {
  const claimed = await repo.tryClaimQueuedJob(queuedJob.rowNumber, queuedJob.updatedAt);
  if (!claimed) {
    return;
  }

  console.info(`[worker] running jobId=${claimed.jobId} action=${claimed.action}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await runScenario(claimed.action, page, claimed);
    await repo.markSucceeded(claimed.rowNumber, "");
    console.info(`[worker] succeeded jobId=${claimed.jobId}`);
  } catch (error) {
    const screenshotPath = path.join(ARTIFACT_DIR, `${claimed.jobId}.png`);
    let screenshotSaved = false;

    try {
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      screenshotSaved = true;
    } catch {
      screenshotSaved = false;
    }

    const errorName = error instanceof Error ? error.name : "UnknownError";
    const baseMessage = `scenario_failed:${errorName}`;
    const message = screenshotSaved ? `${baseMessage} | screenshot=${claimed.jobId}.png` : baseMessage;

    await repo.markFailed(claimed.rowNumber, message);
    console.error(`[worker] failed jobId=${claimed.jobId}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function pollAndEnqueue(repo: JobsRepo, scheduledRows: Set<number>): Promise<void> {
  const queue = createWorkerQueue();
  const pollMs = resolvePollMs();
  const batchSize = resolveBatchSize();

  let isStopping = false;
  const stop = async (signal: string): Promise<void> => {
    if (isStopping) {
      return;
    }
    isStopping = true;
    console.info(`[worker] received ${signal}. waiting for in-flight jobs...`);
    await queue.onIdle();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void stop("SIGINT");
  });
  process.on("SIGTERM", () => {
    void stop("SIGTERM");
  });

  console.info(
    `[worker] started pollMs=${pollMs} batchSize=${batchSize} concurrency=${WORKER_CONCURRENCY}`
  );

  while (true) {
    try {
      const availableSlots = Math.max(0, WORKER_CONCURRENCY - queue.pending - queue.size);
      if (availableSlots > 0) {
        const targetFetchSize = Math.min(batchSize, availableSlots * 3);
        const queuedJobs = await repo.listQueuedJobs(targetFetchSize);

        for (const job of queuedJobs) {
          if (scheduledRows.has(job.rowNumber)) {
            continue;
          }
          if (queue.pending + queue.size >= WORKER_CONCURRENCY) {
            break;
          }

          scheduledRows.add(job.rowNumber);
          void queue
            .add(async () => {
              try {
                await processJob(repo, job);
              } finally {
                scheduledRows.delete(job.rowNumber);
              }
            })
            .catch((error) => {
              scheduledRows.delete(job.rowNumber);
              const errorName = error instanceof Error ? error.name : "UnknownError";
              console.error(`[worker] unexpected queue error: ${errorName}`);
            });
        }
      }
    } catch {
      console.error("[worker] poll failed");
    }

    await sleep(pollMs);
  }
}

async function bootstrap(): Promise<void> {
  const sheetId = requireEnv("SHEET_ID");
  const jobsSheetName = resolveJobsSheetName();
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const sheetsClient = await createSheetsClient();
  const jobsRepo = new JobsRepo(sheetsClient, sheetId, jobsSheetName);
  await jobsRepo.ensureSheetSetup();

  const scheduledRows = new Set<number>();
  await pollAndEnqueue(jobsRepo, scheduledRows);
}

bootstrap().catch(() => {
  console.error("[worker] bootstrap failed");
  process.exit(1);
});

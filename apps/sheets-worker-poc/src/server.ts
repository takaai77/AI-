import "dotenv/config";
import crypto from "node:crypto";
import express, { Request, Response } from "express";
import { bearerAuth } from "./security/auth";
import { ipAllowlist } from "./security/ipAllowlist";
import { isValidJobId, validateExecuteBody } from "./security/validate";
import { JobsRepo } from "./sheets/jobsRepo";
import { createSheetsClient, requireEnv } from "./sheets/sheetsClient";

function resolvePort(): number {
  const raw = process.env.PORT ?? "3000";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return parsed;
}

function resolveJobsSheetName(): string {
  const raw = (process.env.JOBS_SHEET_NAME ?? "jobs").trim();
  return raw.length > 0 ? raw : "jobs";
}

async function bootstrap(): Promise<void> {
  const port = resolvePort();
  const sheetId = requireEnv("SHEET_ID");
  const jobsSheetName = resolveJobsSheetName();

  const sheetsClient = await createSheetsClient();
  const jobsRepo = new JobsRepo(sheetsClient, sheetId, jobsSheetName);
  await jobsRepo.ensureSheetSetup();

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.use("/internal", ipAllowlist, bearerAuth);

  app.post("/internal/execute", async (req: Request, res: Response) => {
    try {
      const validation = validateExecuteBody(req.body);
      if (!validation.ok) {
        res.status(400).json({
          error: "validation_error",
          details: validation.errors
        });
        return;
      }

      const input = validation.data;
      if (input.idempotencyKey) {
        const existing = await jobsRepo.findByIdempotencyKey(input.idempotencyKey);
        if (existing) {
          console.info(`[api] idempotency hit jobId=${existing.jobId} action=${existing.action}`);
          res.status(202).json({
            jobId: existing.jobId,
            status: existing.status
          });
          return;
        }
      }

      const nowIso = new Date().toISOString();
      const jobId = crypto.randomUUID();
      await jobsRepo.appendQueuedJob({
        jobId,
        action: input.action,
        customerId: input.customerId,
        orderNo: input.orderNo,
        operatorId: input.operatorId,
        ticketId: input.ticketId,
        idempotencyKey: input.idempotencyKey ?? "",
        nowIso
      });

      console.info(`[api] queued jobId=${jobId} action=${input.action}`);
      res.status(202).json({
        jobId,
        status: "queued"
      });
    } catch {
      console.error("[api] failed to enqueue job");
      res.status(500).json({ error: "internal_error" });
    }
  });

  app.get("/internal/status/:jobId", async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      if (!isValidJobId(jobId)) {
        res.status(400).json({ error: "invalid_job_id" });
        return;
      }

      const job = await jobsRepo.findByJobId(jobId);
      if (!job) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      res.status(200).json({
        jobId: job.jobId,
        status: job.status,
        message: job.message || undefined,
        updatedAt: job.updatedAt || undefined
      });
    } catch {
      console.error("[api] failed to fetch status");
      res.status(500).json({ error: "internal_error" });
    }
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.listen(port, () => {
    console.info(`[api] listening on http://localhost:${port}`);
  });
}

bootstrap().catch(() => {
  console.error("[api] bootstrap failed");
  process.exit(1);
});

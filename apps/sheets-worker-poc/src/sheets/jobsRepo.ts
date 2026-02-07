import crypto from "node:crypto";
import { sheets_v4 } from "googleapis";
import { ALLOWED_ACTION_SET, ActionName } from "../constants/actions";
import { JobRecord, JobStatus, NewJobInput } from "../types/job";

const JOB_HEADERS = [
  "jobId",
  "status",
  "action",
  "customerId",
  "orderNo",
  "operatorId",
  "ticketId",
  "idempotencyKey",
  "createdAt",
  "updatedAt",
  "message"
] as const;

const COLUMN_COUNT = JOB_HEADERS.length;
const JOB_STATUSES: JobStatus[] = ["queued", "running", "succeeded", "failed"];
const JOB_STATUS_SET = new Set<JobStatus>(JOB_STATUSES);

function normalizeRow(rawRow: string[] | undefined): string[] {
  const row = new Array<string>(COLUMN_COUNT).fill("");
  if (!rawRow) {
    return row;
  }

  for (let i = 0; i < Math.min(rawRow.length, COLUMN_COUNT); i += 1) {
    row[i] = String(rawRow[i] ?? "");
  }

  return row;
}

function isJobStatus(raw: string): raw is JobStatus {
  return JOB_STATUS_SET.has(raw as JobStatus);
}

function rowToJob(rowNumber: number, rawRow: string[] | undefined): JobRecord | null {
  const row = normalizeRow(rawRow);
  if (row[0].trim().length === 0) {
    return null;
  }

  if (!isJobStatus(row[1])) {
    return null;
  }

  if (!ALLOWED_ACTION_SET.has(row[2])) {
    return null;
  }

  return {
    rowNumber,
    jobId: row[0],
    status: row[1],
    action: row[2] as ActionName,
    customerId: row[3],
    orderNo: row[4],
    operatorId: row[5],
    ticketId: row[6],
    idempotencyKey: row[7],
    createdAt: row[8],
    updatedAt: row[9],
    message: row[10]
  };
}

function jobToRow(job: JobRecord): string[] {
  return [
    job.jobId,
    job.status,
    job.action,
    job.customerId,
    job.orderNo,
    job.operatorId,
    job.ticketId,
    job.idempotencyKey,
    job.createdAt,
    job.updatedAt,
    job.message
  ];
}

export class JobsRepo {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
    private readonly jobsSheetName: string
  ) {}

  async ensureSheetSetup(): Promise<void> {
    const headerRange = `${this.jobsSheetName}!A1:K1`;
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: headerRange
    });

    const headerRow = normalizeRow(response.data.values?.[0] as string[] | undefined);
    const isEmptyHeader = headerRow.every((cell) => cell.trim().length === 0);
    if (isEmptyHeader) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: headerRange,
        valueInputOption: "RAW",
        requestBody: {
          values: [Array.from(JOB_HEADERS)]
        }
      });
      return;
    }

    const hasHeaderMismatch = JOB_HEADERS.some((header, index) => headerRow[index] !== header);
    if (hasHeaderMismatch) {
      throw new Error(
        `Sheet header mismatch in "${this.jobsSheetName}". Expected: ${JOB_HEADERS.join(", ")}`
      );
    }
  }

  async appendQueuedJob(input: NewJobInput): Promise<void> {
    const row: string[] = [
      input.jobId,
      "queued",
      input.action,
      input.customerId,
      input.orderNo,
      input.operatorId,
      input.ticketId,
      input.idempotencyKey,
      input.nowIso,
      input.nowIso,
      ""
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.jobsSheetName}!A:K`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row]
      }
    });
  }

  async findByJobId(jobId: string): Promise<JobRecord | null> {
    const rows = await this.fetchDataRows();
    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const job = rowToJob(rowNumber, rows[i]);
      if (!job) {
        continue;
      }
      if (job.jobId === jobId) {
        return job;
      }
    }
    return null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<JobRecord | null> {
    if (idempotencyKey.trim().length === 0) {
      return null;
    }

    const rows = await this.fetchDataRows();
    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const job = rowToJob(rowNumber, rows[i]);
      if (!job) {
        continue;
      }
      if (job.idempotencyKey === idempotencyKey) {
        return job;
      }
    }
    return null;
  }

  async listQueuedJobs(limit: number): Promise<JobRecord[]> {
    const rows = await this.fetchDataRows();
    const queued: JobRecord[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const job = rowToJob(rowNumber, rows[i]);
      if (!job) {
        continue;
      }
      if (job.status === "queued") {
        queued.push(job);
      }
      if (queued.length >= limit) {
        break;
      }
    }
    return queued;
  }

  async tryClaimQueuedJob(rowNumber: number, expectedUpdatedAt: string): Promise<JobRecord | null> {
    const current = await this.getRow(rowNumber);
    if (!current || current.status !== "queued") {
      return null;
    }

    if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const claimToken = `claim:${crypto.randomUUID().slice(0, 8)}`;

    const next: JobRecord = {
      ...current,
      status: "running",
      updatedAt: nowIso,
      message: claimToken
    };
    await this.updateRow(next);

    const verified = await this.getRow(rowNumber);
    if (!verified) {
      return null;
    }

    if (verified.status !== "running" || verified.message !== claimToken) {
      return null;
    }

    return verified;
  }

  async markSucceeded(rowNumber: number, message = ""): Promise<void> {
    await this.updateStatus(rowNumber, "succeeded", message);
  }

  async markFailed(rowNumber: number, message: string): Promise<void> {
    await this.updateStatus(rowNumber, "failed", message);
  }

  private async fetchDataRows(): Promise<string[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.jobsSheetName}!A2:K`
    });

    const rows = response.data.values ?? [];
    return rows.map((row) => normalizeRow(row as string[]));
  }

  private async getRow(rowNumber: number): Promise<JobRecord | null> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.jobsSheetName}!A${rowNumber}:K${rowNumber}`
    });

    const row = response.data.values?.[0] as string[] | undefined;
    return rowToJob(rowNumber, row);
  }

  private async updateRow(job: JobRecord): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.jobsSheetName}!A${job.rowNumber}:K${job.rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [jobToRow(job)]
      }
    });
  }

  private async updateStatus(rowNumber: number, status: JobStatus, message: string): Promise<void> {
    const current = await this.getRow(rowNumber);
    if (!current) {
      throw new Error(`Job row not found: ${rowNumber}`);
    }

    const next: JobRecord = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      message
    };
    await this.updateRow(next);
  }
}

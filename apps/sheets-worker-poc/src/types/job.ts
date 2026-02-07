import { ActionName } from "../constants/actions";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface JobRecord {
  rowNumber: number;
  jobId: string;
  status: JobStatus;
  action: ActionName;
  customerId: string;
  orderNo: string;
  operatorId: string;
  ticketId: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  message: string;
}

export interface NewJobInput {
  jobId: string;
  action: ActionName;
  customerId: string;
  orderNo: string;
  operatorId: string;
  ticketId: string;
  idempotencyKey: string;
  nowIso: string;
}

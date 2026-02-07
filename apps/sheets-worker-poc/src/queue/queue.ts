import PQueue from "p-queue";

export const WORKER_CONCURRENCY = 10;

export function createWorkerQueue(): PQueue {
  return new PQueue({
    concurrency: WORKER_CONCURRENCY
  });
}

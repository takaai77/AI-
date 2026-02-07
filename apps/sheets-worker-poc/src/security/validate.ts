import { ALLOWED_ACTION_SET, ActionName } from "../constants/actions";

const MAX_LEN = {
  customerId: 100,
  orderNo: 100,
  operatorId: 100,
  ticketId: 100,
  idempotencyKey: 120
} as const;

export interface ExecuteRequestBody {
  action: ActionName;
  customerId: string;
  orderNo: string;
  operatorId: string;
  ticketId: string;
  idempotencyKey?: string;
}

export type ValidationResult =
  | { ok: true; data: ExecuteRequestBody }
  | { ok: false; errors: string[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTrimmedString(
  value: unknown,
  fieldName: string,
  errors: string[],
  maxLen: number,
  required: boolean
): string | undefined {
  if (value === undefined || value === null) {
    if (required) {
      errors.push(`${fieldName} is required`);
    }
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} must be string`);
    return undefined;
  }

  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    errors.push(`${fieldName} must not be empty`);
    return undefined;
  }

  if (trimmed.length > maxLen) {
    errors.push(`${fieldName} must be <= ${maxLen} chars`);
    return undefined;
  }

  return trimmed;
}

export function validateExecuteBody(body: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(body)) {
    return { ok: false, errors: ["body must be JSON object"] };
  }

  const actionRaw = getTrimmedString(body.action, "action", errors, 60, true);
  const customerId = getTrimmedString(body.customerId, "customerId", errors, MAX_LEN.customerId, true);
  const orderNo = getTrimmedString(body.orderNo, "orderNo", errors, MAX_LEN.orderNo, true);
  const operatorId = getTrimmedString(body.operatorId, "operatorId", errors, MAX_LEN.operatorId, true);
  const ticketId = getTrimmedString(body.ticketId, "ticketId", errors, MAX_LEN.ticketId, true);
  const idempotencyKey = getTrimmedString(
    body.idempotencyKey,
    "idempotencyKey",
    errors,
    MAX_LEN.idempotencyKey,
    false
  );

  if (actionRaw && !ALLOWED_ACTION_SET.has(actionRaw)) {
    errors.push("action is not allowed");
  }

  if (errors.length > 0 || !actionRaw || !customerId || !orderNo || !operatorId || !ticketId) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      action: actionRaw as ActionName,
      customerId,
      orderNo,
      operatorId,
      ticketId,
      idempotencyKey: idempotencyKey && idempotencyKey.length > 0 ? idempotencyKey : undefined
    }
  };
}

export function isValidJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(jobId);
}

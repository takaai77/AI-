import fs from "node:fs";
import path from "node:path";
import { google, sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

export function resolveServiceAccountPath(): string {
  const rawPath = process.env.SERVICE_ACCOUNT_KEY_PATH ?? "secrets/service-account.json";
  return path.resolve(process.cwd(), rawPath);
}

export async function createSheetsClient(): Promise<sheets_v4.Sheets> {
  const keyFilePath = resolveServiceAccountPath();
  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Service account file not found: ${keyFilePath}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: SCOPES
  });

  return google.sheets({
    version: "v4",
    auth
  });
}

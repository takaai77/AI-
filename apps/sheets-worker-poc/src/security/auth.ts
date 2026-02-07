import crypto from "node:crypto";
import { NextFunction, Request, Response } from "express";

function timingSafeEqualText(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.API_TOKEN;
  if (!expectedToken) {
    res.status(500).json({ error: "API_TOKEN is not configured" });
    return;
  }

  const rawAuthHeader = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(rawAuthHeader);
  if (!match) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const receivedToken = match[1].trim();
  if (!timingSafeEqualText(receivedToken, expectedToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

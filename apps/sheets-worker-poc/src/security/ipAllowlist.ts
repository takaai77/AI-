import { NextFunction, Request, Response } from "express";

function normalizeIp(rawIp: string): string {
  const trimmed = rawIp.trim();
  if (trimmed === "::1") {
    return "127.0.0.1";
  }
  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7);
  }
  return trimmed;
}

function parseAllowedIps(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set<string>();
  }

  return new Set(
    raw
      .split(",")
      .map((ip) => normalizeIp(ip))
      .filter((ip) => ip.length > 0)
  );
}

function resolveClientIp(req: Request): string {
  const forwardedHeader = req.headers["x-forwarded-for"];
  if (typeof forwardedHeader === "string" && forwardedHeader.length > 0) {
    const first = forwardedHeader.split(",")[0];
    return normalizeIp(first);
  }

  if (Array.isArray(forwardedHeader) && forwardedHeader.length > 0) {
    return normalizeIp(forwardedHeader[0]);
  }

  return normalizeIp(req.socket.remoteAddress ?? req.ip ?? "");
}

export function ipAllowlist(req: Request, res: Response, next: NextFunction): void {
  const allowedIps = parseAllowedIps(process.env.ALLOWED_IPS);
  if (allowedIps.size === 0) {
    next();
    return;
  }

  const clientIp = resolveClientIp(req);
  if (allowedIps.has(clientIp)) {
    next();
    return;
  }

  res.status(403).json({ error: "Forbidden" });
}

/**
 * セキュリティモジュール
 *
 * このファイルでは、APIのセキュリティ機能を実装します。
 *
 * 【提供する機能】
 * - JWT認証（トークン生成・検証）
 * - APIキー認証
 * - レート制限
 * - IPホワイトリスト
 * - 監査ログ
 * - リクエスト署名検証
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

// ============================================
// 型定義
// ============================================

/**
 * JWTペイロード
 */
interface JWTPayload {
  // サブジェクト（ユーザーID等）
  sub: string;
  // 発行者
  iss: string;
  // 発行日時（Unix timestamp）
  iat: number;
  // 有効期限（Unix timestamp）
  exp: number;
  // スコープ（権限）
  scope: string[];
  // カスタムクレーム
  [key: string]: unknown;
}

/**
 * 認証済みリクエスト（拡張）
 */
export interface AuthenticatedRequest extends Request {
  // 認証情報
  auth?: {
    type: 'jwt' | 'api_key';
    subject: string;
    scope: string[];
  };
  // 監査情報
  audit?: {
    requestId: string;
    timestamp: string;
    ip: string;
  };
}

/**
 * レート制限の設定
 */
interface RateLimitConfig {
  // ウィンドウサイズ（ミリ秒）
  windowMs: number;
  // 最大リクエスト数
  maxRequests: number;
}

/**
 * 監査ログエントリ
 */
interface AuditLogEntry {
  // リクエストID
  requestId: string;
  // タイムスタンプ
  timestamp: string;
  // IPアドレス
  ip: string;
  // HTTPメソッド
  method: string;
  // パス
  path: string;
  // ユーザー/サブジェクト
  subject?: string;
  // 認証タイプ
  authType?: string;
  // ステータスコード
  statusCode?: number;
  // 処理時間（ミリ秒）
  duration?: number;
  // 追加情報
  metadata?: Record<string, unknown>;
}

// ============================================
// 設定の取得
// ============================================

/**
 * JWT秘密鍵を取得する
 */
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET 環境変数が設定されていません');
  }
  // 最低32文字の秘密鍵を要求
  if (secret.length < 32) {
    throw new Error('JWT_SECRET は最低32文字必要です');
  }
  return secret;
};

/**
 * JWTの有効期限を取得する（秒）
 */
const getJWTExpiresIn = (): number => {
  return parseInt(process.env.JWT_EXPIRES_IN || '3600', 10); // デフォルト1時間
};

/**
 * APIキーを取得する
 */
const getAPIKey = (): string | undefined => {
  return process.env.INTERNAL_API_KEY;
};

/**
 * IPホワイトリストを取得する
 */
const getIPWhitelist = (): string[] => {
  const whitelist = process.env.IP_WHITELIST;
  if (!whitelist) return [];
  return whitelist.split(',').map((ip) => ip.trim()).filter(Boolean);
};

/**
 * レート制限設定を取得する
 */
const getRateLimitConfig = (): RateLimitConfig => {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // デフォルト1分
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // デフォルト100リクエスト/分
  };
};

// ============================================
// JWT認証
// ============================================

/**
 * Base64URL エンコード
 */
const base64UrlEncode = (data: string): string => {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Base64URL デコード
 */
const base64UrlDecode = (data: string): string => {
  const padded = data + '==='.slice(0, (4 - (data.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
};

/**
 * JWTトークンを生成する
 *
 * @param subject - サブジェクト（ユーザーID等）
 * @param scope - スコープ（権限）
 * @param customClaims - カスタムクレーム
 * @returns JWTトークン
 */
export const generateJWT = (
  subject: string,
  scope: string[] = ['internal:read', 'internal:write'],
  customClaims: Record<string, unknown> = {}
): string => {
  const secret = getJWTSecret();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = getJWTExpiresIn();

  // ヘッダー
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // ペイロード
  const payload: JWTPayload = {
    sub: subject,
    iss: 'playwright-automation',
    iat: now,
    exp: now + expiresIn,
    scope,
    ...customClaims,
  };

  // エンコード
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // 署名
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signatureInput}.${signature}`;
};

/**
 * JWTトークンを検証する
 *
 * @param token - JWTトークン
 * @returns 検証結果とペイロード
 */
export const verifyJWT = (token: string): { valid: boolean; payload?: JWTPayload; error?: string } => {
  try {
    const secret = getJWTSecret();
    const parts = token.split('.');

    if (parts.length !== 3) {
      return { valid: false, error: 'トークンの形式が不正です' };
    }

    const [headerEncoded, payloadEncoded, signature] = parts;

    // 署名を検証
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // タイミング攻撃対策: 定数時間比較
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: '署名が不正です' };
    }

    // ペイロードをデコード
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as JWTPayload;

    // 有効期限を確認
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: 'トークンの有効期限が切れています' };
    }

    // 発行日時を確認（未来の日付は不正）
    if (payload.iat > now + 60) { // 60秒のマージン
      return { valid: false, error: 'トークンの発行日時が不正です' };
    }

    return { valid: true, payload };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { valid: false, error: `トークン検証エラー: ${errorMessage}` };
  }
};

/**
 * JWTトークンをリフレッシュする
 *
 * @param token - 現在のJWTトークン
 * @returns 新しいJWTトークン
 */
export const refreshJWT = (token: string): { success: boolean; token?: string; error?: string } => {
  const result = verifyJWT(token);

  if (!result.valid || !result.payload) {
    return { success: false, error: result.error };
  }

  // 新しいトークンを生成（スコープとカスタムクレームを引き継ぐ）
  const { sub, scope, iss, iat, exp, ...customClaims } = result.payload;
  const newToken = generateJWT(sub, scope, customClaims);

  return { success: true, token: newToken };
};

// ============================================
// APIキーのハッシュ化
// ============================================

/**
 * APIキーをハッシュ化する（保存用）
 *
 * @param apiKey - 平文のAPIキー
 * @returns ハッシュ化されたAPIキー
 */
export const hashAPIKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * APIキーを生成する
 *
 * @param length - キーの長さ（バイト）
 * @returns 生成されたAPIキー
 */
export const generateAPIKey = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// ============================================
// リクエスト署名
// ============================================

/**
 * リクエストの署名を生成する
 *
 * @param method - HTTPメソッド
 * @param path - リクエストパス
 * @param body - リクエストボディ
 * @param timestamp - タイムスタンプ
 * @param secret - 秘密鍵
 * @returns 署名
 */
export const generateRequestSignature = (
  method: string,
  path: string,
  body: unknown,
  timestamp: string,
  secret: string
): string => {
  const bodyString = body ? JSON.stringify(body) : '';
  const signatureInput = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyString}`;

  return crypto.createHmac('sha256', secret).update(signatureInput).digest('hex');
};

/**
 * リクエストの署名を検証する
 *
 * @param req - リクエストオブジェクト
 * @param secret - 秘密鍵
 * @param maxAgeMs - 許容する署名の最大年齢（ミリ秒）
 * @returns 検証結果
 */
export const verifyRequestSignature = (
  req: Request,
  secret: string,
  maxAgeMs: number = 300000 // 5分
): { valid: boolean; error?: string } => {
  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;

  if (!signature || !timestamp) {
    return { valid: false, error: 'X-Signature と X-Timestamp ヘッダーが必要です' };
  }

  // タイムスタンプの検証
  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();

  if (isNaN(requestTime)) {
    return { valid: false, error: 'タイムスタンプの形式が不正です' };
  }

  if (now - requestTime > maxAgeMs) {
    return { valid: false, error: 'リクエストの有効期限が切れています' };
  }

  if (requestTime > now + 60000) { // 1分のマージン
    return { valid: false, error: 'タイムスタンプが未来の日付です' };
  }

  // 署名の検証
  const expectedSignature = generateRequestSignature(
    req.method,
    req.path,
    req.body,
    timestamp,
    secret
  );

  // タイミング攻撃対策
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: '署名が不正です' };
    }
  } catch {
    return { valid: false, error: '署名の形式が不正です' };
  }

  return { valid: true };
};

// ============================================
// レート制限
// ============================================

// レート制限用のストア
const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

/**
 * レート制限をチェックする
 *
 * @param key - 制限のキー（IP、ユーザーID等）
 * @returns 制限結果
 */
export const checkRateLimit = (
  key: string
): { allowed: boolean; remaining: number; resetAt: number } => {
  const config = getRateLimitConfig();
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // レコードがない、または期限切れの場合は新規作成
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  // カウントを増加
  record.count++;
  rateLimitStore.set(key, record);

  // 制限をチェック
  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);

  return { allowed, remaining, resetAt: record.resetAt };
};

/**
 * レート制限ストアをクリーンアップする
 */
export const cleanupRateLimitStore = (): void => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
};

// 定期的にクリーンアップ（5分ごと）
setInterval(cleanupRateLimitStore, 300000);

// ============================================
// 監査ログ
// ============================================

// 監査ログのバッファ
const auditLogBuffer: AuditLogEntry[] = [];
const AUDIT_LOG_FLUSH_INTERVAL = 10000; // 10秒ごとにフラッシュ
const AUDIT_LOG_MAX_BUFFER_SIZE = 100;

/**
 * 監査ログを記録する
 *
 * @param entry - ログエントリ
 */
export const recordAuditLog = (entry: AuditLogEntry): void => {
  auditLogBuffer.push(entry);

  // バッファがいっぱいになったらフラッシュ
  if (auditLogBuffer.length >= AUDIT_LOG_MAX_BUFFER_SIZE) {
    flushAuditLogs();
  }
};

/**
 * 監査ログをフラッシュする
 */
export const flushAuditLogs = async (): Promise<void> => {
  if (auditLogBuffer.length === 0) return;

  // バッファをコピーしてクリア
  const logs = [...auditLogBuffer];
  auditLogBuffer.length = 0;

  // ログを出力（実際の運用ではDB、ファイル、外部サービス等に送信）
  const logOutput = process.env.AUDIT_LOG_OUTPUT || 'console';

  switch (logOutput) {
    case 'console':
      logs.forEach((log) => {
        console.log(`[AUDIT] ${JSON.stringify(log)}`);
      });
      break;

    case 'file':
      // ファイル出力（実装は省略）
      const fs = require('fs');
      const path = require('path');
      const logDir = process.env.AUDIT_LOG_DIR || './logs';
      const logFile = path.join(logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logLines = logs.map((log) => JSON.stringify(log)).join('\n') + '\n';
      fs.appendFileSync(logFile, logLines);
      break;

    default:
      // デフォルトはコンソール出力
      logs.forEach((log) => {
        console.log(`[AUDIT] ${JSON.stringify(log)}`);
      });
  }
};

// 定期的にフラッシュ
setInterval(flushAuditLogs, AUDIT_LOG_FLUSH_INTERVAL);

// プロセス終了時にフラッシュ
process.on('beforeExit', () => {
  flushAuditLogs();
});

// ============================================
// ミドルウェア
// ============================================

/**
 * リクエストIDを付与するミドルウェア
 */
export const requestIdMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  req.audit = {
    requestId,
    timestamp,
    ip,
  };

  // レスポンスヘッダーにリクエストIDを追加
  res.setHeader('X-Request-ID', requestId);

  next();
};

/**
 * IPホワイトリストミドルウェア
 */
export const ipWhitelistMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const whitelist = getIPWhitelist();

  // ホワイトリストが空の場合はスキップ
  if (whitelist.length === 0) {
    return next();
  }

  const clientIP = req.ip || req.socket.remoteAddress || '';

  // ループバックアドレスは常に許可
  if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
    return next();
  }

  // ホワイトリストをチェック
  const isAllowed = whitelist.some((allowedIP) => {
    // CIDR表記のサポート
    if (allowedIP.includes('/')) {
      return isIPInCIDR(clientIP, allowedIP);
    }
    return clientIP === allowedIP || clientIP === `::ffff:${allowedIP}`;
  });

  if (!isAllowed) {
    recordAuditLog({
      requestId: req.audit?.requestId || 'unknown',
      timestamp: req.audit?.timestamp || new Date().toISOString(),
      ip: clientIP,
      method: req.method,
      path: req.path,
      statusCode: 403,
      metadata: { reason: 'IP not in whitelist' },
    });

    res.status(403).json({
      success: false,
      error: 'アクセスが拒否されました',
    });
    return;
  }

  next();
};

/**
 * IPがCIDR範囲内にあるか確認する
 */
const isIPInCIDR = (ip: string, cidr: string): boolean => {
  // IPv4のみサポート（簡易実装）
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  // IPv6マッピングを除去
  const cleanIP = ip.replace('::ffff:', '');

  const ipParts = cleanIP.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  if (ipParts.length !== 4 || rangeParts.length !== 4) {
    return false;
  }

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
  const maskNum = ~((1 << (32 - mask)) - 1);

  return (ipNum & maskNum) === (rangeNum & maskNum);
};

/**
 * レート制限ミドルウェア
 */
export const rateLimitMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // レート制限が無効な場合はスキップ
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return next();
  }

  // キーを決定（認証済みユーザーはユーザーID、それ以外はIP）
  const key = req.auth?.subject || req.ip || req.socket.remoteAddress || 'unknown';

  const result = checkRateLimit(key);

  // レスポンスヘッダーにレート制限情報を追加
  res.setHeader('X-RateLimit-Limit', getRateLimitConfig().maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

  if (!result.allowed) {
    recordAuditLog({
      requestId: req.audit?.requestId || 'unknown',
      timestamp: req.audit?.timestamp || new Date().toISOString(),
      ip: req.ip || 'unknown',
      method: req.method,
      path: req.path,
      subject: req.auth?.subject,
      statusCode: 429,
      metadata: { reason: 'Rate limit exceeded' },
    });

    res.status(429).json({
      success: false,
      error: 'リクエスト数が制限を超えました。しばらくお待ちください。',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    });
    return;
  }

  next();
};

/**
 * JWT認証ミドルウェア
 */
export const jwtAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // JWT認証が無効な場合はスキップ
  if (!process.env.JWT_SECRET) {
    return next();
  }

  // Authorization ヘッダーからトークンを取得
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // APIキー認証にフォールバック
    return next();
  }

  const token = authHeader.slice(7);
  const result = verifyJWT(token);

  if (!result.valid || !result.payload) {
    res.status(401).json({
      success: false,
      error: result.error || '認証に失敗しました',
    });
    return;
  }

  // 認証情報をリクエストに付与
  req.auth = {
    type: 'jwt',
    subject: result.payload.sub,
    scope: result.payload.scope,
  };

  next();
};

/**
 * APIキー認証ミドルウェア
 */
export const apiKeyAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // JWT認証済みの場合はスキップ
  if (req.auth) {
    return next();
  }

  const apiKey = getAPIKey();

  // APIキーが設定されていない場合はスキップ
  if (!apiKey) {
    return next();
  }

  // ヘッダーからAPIキーを取得
  const providedKey = req.headers['x-internal-api-key'] as string;

  if (!providedKey) {
    res.status(401).json({
      success: false,
      error: '認証が必要です。Authorization または X-Internal-API-Key ヘッダーを設定してください。',
    });
    return;
  }

  // タイミング攻撃対策: 定数時間比較
  try {
    if (!crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(apiKey))) {
      recordAuditLog({
        requestId: req.audit?.requestId || 'unknown',
        timestamp: req.audit?.timestamp || new Date().toISOString(),
        ip: req.ip || 'unknown',
        method: req.method,
        path: req.path,
        statusCode: 401,
        metadata: { reason: 'Invalid API key' },
      });

      res.status(401).json({
        success: false,
        error: 'APIキーが無効です',
      });
      return;
    }
  } catch {
    res.status(401).json({
      success: false,
      error: 'APIキーの形式が不正です',
    });
    return;
  }

  // 認証情報をリクエストに付与
  req.auth = {
    type: 'api_key',
    subject: 'api_key_user',
    scope: ['internal:read', 'internal:write'],
  };

  next();
};

/**
 * スコープ検証ミドルウェアを生成する
 *
 * @param requiredScope - 必要なスコープ
 * @returns ミドルウェア関数
 */
export const requireScope = (requiredScope: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // 認証情報がない場合（認証が無効な環境）はスキップ
    if (!req.auth) {
      return next();
    }

    if (!req.auth.scope.includes(requiredScope) && !req.auth.scope.includes('internal:admin')) {
      res.status(403).json({
        success: false,
        error: `権限が不足しています。必要なスコープ: ${requiredScope}`,
      });
      return;
    }

    next();
  };
};

/**
 * 監査ログミドルウェア
 */
export const auditLogMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // レスポンス完了時にログを記録
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    recordAuditLog({
      requestId: req.audit?.requestId || 'unknown',
      timestamp: req.audit?.timestamp || new Date().toISOString(),
      ip: req.audit?.ip || req.ip || 'unknown',
      method: req.method,
      path: req.path,
      subject: req.auth?.subject,
      authType: req.auth?.type,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
};

/**
 * HTTPS強制ミドルウェア（本番環境用）
 */
export const httpsRedirectMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 開発環境または既にHTTPSの場合はスキップ
  if (process.env.NODE_ENV !== 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // HTTPSにリダイレクト
  res.redirect(301, `https://${req.headers.host}${req.url}`);
};

/**
 * セキュリティヘッダーミドルウェア
 */
export const securityHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // XSS対策
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  // Strict Transport Security（本番環境のみ）
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // キャッシュ制御
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
};

// ============================================
// 統合セキュリティミドルウェア
// ============================================

/**
 * すべてのセキュリティミドルウェアを統合する
 */
export const securityMiddleware = [
  securityHeadersMiddleware,
  requestIdMiddleware,
  ipWhitelistMiddleware,
  jwtAuthMiddleware,
  apiKeyAuthMiddleware,
  rateLimitMiddleware,
  auditLogMiddleware,
];

// ============================================
// トークン管理API用のヘルパー
// ============================================

/**
 * トークン発行エンドポイント用のハンドラ
 */
export const issueTokenHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { subject, scope, customClaims } = req.body;

    if (!subject) {
      res.status(400).json({
        success: false,
        error: 'subject は必須です',
      });
      return;
    }

    // スコープのデフォルト値
    const tokenScope = scope || ['internal:read'];

    // トークンを生成
    const token = generateJWT(subject, tokenScope, customClaims || {});
    const expiresIn = getJWTExpiresIn();

    res.json({
      success: true,
      token,
      tokenType: 'Bearer',
      expiresIn,
      scope: tokenScope,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * トークンリフレッシュエンドポイント用のハンドラ
 */
export const refreshTokenHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization ヘッダーが必要です',
      });
      return;
    }

    const token = authHeader.slice(7);
    const result = refreshJWT(token);

    if (!result.success || !result.token) {
      res.status(401).json({
        success: false,
        error: result.error || 'トークンのリフレッシュに失敗しました',
      });
      return;
    }

    res.json({
      success: true,
      token: result.token,
      tokenType: 'Bearer',
      expiresIn: getJWTExpiresIn(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * BullMQキュー定義モジュール
 *
 * このファイルでは、ジョブキューの設定と管理を行います。
 * BullMQはRedisを使った高機能なジョブキューライブラリです。
 *
 * 【BullMQとは？】
 * - ジョブ（タスク）をキューに入れて順番に処理するための仕組み
 * - 複数の人が同時にボタンを押しても、順番に処理される
 * - 失敗したジョブは自動的にリトライされる
 */

// dotenvで環境変数を読み込み
import dotenv from 'dotenv';
dotenv.config();

// BullMQからQueueクラスをインポート
import { Queue, QueueEvents } from 'bullmq';

// Redisクライアントをインポート
import IORedis from 'ioredis';

// 型定義をインポート
import { JobData } from './types';

// ============================================
// Redis接続設定
// ============================================

/**
 * Redis接続オプションを取得する関数
 * 環境変数から接続情報を読み取ります
 */
export const getRedisConnection = (): IORedis => {
  // REDIS_URLが設定されている場合はそれを使用（Cloud Run等）
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // URL形式で接続
    console.log('📡 Redis URL形式で接続します');
    return new IORedis(redisUrl, {
      // 接続が切れても自動再接続
      maxRetriesPerRequest: null,
    });
  }

  // 個別の環境変数から接続情報を取得
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  console.log(`📡 Redisに接続します: ${host}:${port}`);

  // Redis接続インスタンスを作成
  return new IORedis({
    host,
    port,
    password,
    // 接続が切れても自動再接続
    maxRetriesPerRequest: null,
  });
};

// ============================================
// キュー名の定義
// ============================================

// ジョブキューの名前（Redisに保存される際のキー名の一部）
export const QUEUE_NAME = 'playwright-automation';

// ============================================
// キューインスタンスの作成
// ============================================

// Redis接続を作成
const connection = getRedisConnection();

/**
 * ジョブキューのインスタンス
 *
 * このキューにジョブを追加すると、ワーカーが順番に処理します
 */
export const automationQueue = new Queue<JobData>(QUEUE_NAME, {
  // Redis接続を指定
  connection,

  // デフォルトのジョブオプション
  defaultJobOptions: {
    // ジョブのリトライ設定
    attempts: parseInt(process.env.JOB_MAX_ATTEMPTS || '3', 10),

    // リトライ時の待機時間設定（指数バックオフ）
    backoff: {
      // 指数関数的に待機時間を増やす
      type: 'exponential',

      // 初回リトライまでの待機時間（ミリ秒）
      delay: parseInt(process.env.JOB_BACKOFF_DELAY || '5000', 10),
    },

    // ジョブの削除設定
    removeOnComplete: {
      // 完了したジョブは100件まで保持
      count: 100,
    },
    removeOnFail: {
      // 失敗したジョブは200件まで保持（調査用）
      count: 200,
    },
  },
});

/**
 * キューイベントリスナー
 *
 * ジョブの状態変化を監視するためのイベントリスナー
 */
export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: getRedisConnection(),
});

// ============================================
// ロック機能（同一顧客+アクションの同時実行防止）
// ============================================

/**
 * ロックを取得する
 *
 * 同じ顧客に対して同じアクションが同時に実行されるのを防ぎます
 *
 * @param customerId - 顧客ID
 * @param action - アクション名
 * @param jobId - ジョブID
 * @param ttlMs - ロックの有効期限（ミリ秒）
 * @returns ロック取得に成功したかどうか
 */
export const acquireLock = async (
  customerId: string,
  action: string,
  jobId: string,
  ttlMs: number = 300000 // デフォルト5分
): Promise<boolean> => {
  // ロックキーを生成（顧客ID + アクション名）
  const lockKey = `lock:${customerId}:${action}`;

  // Redis の SET コマンドで NX（存在しない場合のみ）オプションを使用
  // これにより、アトミック（分割不可能）にロックを取得できる
  const result = await connection.set(
    lockKey,
    jobId,
    'PX', // 有効期限をミリ秒で指定
    ttlMs,
    'NX'  // キーが存在しない場合のみセット
  );

  // 'OK' が返ればロック取得成功
  const acquired = result === 'OK';

  if (acquired) {
    console.log(`🔒 ロック取得成功: ${lockKey} (jobId: ${jobId})`);
  } else {
    console.log(`⏳ ロック取得失敗（他のジョブが実行中）: ${lockKey}`);
  }

  return acquired;
};

/**
 * ロックを解放する
 *
 * @param customerId - 顧客ID
 * @param action - アクション名
 * @param jobId - ジョブID（自分のロックのみ解放するため）
 */
export const releaseLock = async (
  customerId: string,
  action: string,
  jobId: string
): Promise<void> => {
  // ロックキーを生成
  const lockKey = `lock:${customerId}:${action}`;

  // Luaスクリプトで自分のロックのみ解放（アトミック操作）
  // 他のジョブのロックを誤って解放しないようにする
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  const result = await connection.eval(script, 1, lockKey, jobId);

  if (result === 1) {
    console.log(`🔓 ロック解放成功: ${lockKey} (jobId: ${jobId})`);
  } else {
    console.log(`⚠️ ロック解放スキップ（別のジョブのロック）: ${lockKey}`);
  }
};

/**
 * ロックの状態を確認する
 *
 * @param customerId - 顧客ID
 * @param action - アクション名
 * @returns ロック中のジョブID（ロックがなければnull）
 */
export const checkLock = async (
  customerId: string,
  action: string
): Promise<string | null> => {
  const lockKey = `lock:${customerId}:${action}`;
  return await connection.get(lockKey);
};

// ============================================
// ジョブ追加ヘルパー関数
// ============================================

/**
 * キューにジョブを追加する
 *
 * @param jobData - ジョブデータ
 * @returns 追加されたジョブ
 */
export const addJob = async (jobData: JobData) => {
  // ジョブIDをBullMQのジョブIDとしても使用
  const job = await automationQueue.add(
    jobData.action, // ジョブ名（アクション名を使用）
    jobData,        // ジョブデータ
    {
      // カスタムジョブIDを指定（重複防止にも使える）
      jobId: jobData.jobId,
    }
  );

  console.log(`📥 ジョブをキューに追加しました: ${jobData.jobId}`);
  console.log(`   アクション: ${jobData.action}`);
  console.log(`   顧客ID: ${jobData.customerId}`);
  console.log(`   オペレーター: ${jobData.operator}`);

  return job;
};

/**
 * ジョブの状態を取得する
 *
 * @param jobId - ジョブID
 * @returns ジョブの状態
 */
export const getJobState = async (jobId: string) => {
  // キューからジョブを取得
  const job = await automationQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  // ジョブの状態を取得
  const state = await job.getState();

  return {
    id: job.id,
    data: job.data,
    state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    returnvalue: job.returnvalue,
    timestamp: job.timestamp,
  };
};

// ============================================
// イベントハンドラの登録
// ============================================

// ジョブ完了イベント
queueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ ジョブ完了: ${jobId}`);
});

// ジョブ失敗イベント
queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`❌ ジョブ失敗: ${jobId}`);
  console.log(`   理由: ${failedReason}`);
});

// ジョブ進捗更新イベント
queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`📊 進捗更新: ${jobId} - ${JSON.stringify(data)}`);
});

// ============================================
// エクスポート
// ============================================

export { connection };

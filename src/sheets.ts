/**
 * Googleスプレッドシート連携モジュール
 *
 * このファイルでは、ジョブの記録をGoogleスプレッドシートに保存・更新します。
 * スプレッドシートはデータベースの代わりとして使用し、
 * 非エンジニアでも結果を確認しやすくしています。
 *
 * 【なぜスプレッドシートを使うのか？】
 * - データベースの構築なしで始められる
 * - オペレーターが直接シートを見て状況確認できる
 * - フィルタやグラフで分析しやすい
 */

// dotenvで環境変数を読み込み
import dotenv from 'dotenv';
dotenv.config();

// Google APIライブラリ
import { google, sheets_v4 } from 'googleapis';

// Node.jsファイルシステムAPI（認証情報読み込み用）
import * as fs from 'fs';

// 型定義をインポート
import { JobRecord, JobStatus } from './types';

// ============================================
// 定数定義
// ============================================

// 記録用シート名
const SHEET_NAME = 'jobs';

// シートのヘッダー行（1行目に表示される列名）
const HEADERS = [
  'job_id',       // ジョブID
  'created_at',   // 作成日時
  'operator',     // 操作者
  'ticket_id',    // ZendeskチケットID
  'customer_id',  // 顧客ID
  'order_no',     // 注文番号
  'action',       // アクション名
  'status',       // ステータス
  'progress',     // 進捗
  'message',      // メッセージ
  'result',       // 実行結果
  'error',        // エラー情報
  'artifact_url', // スクリーンショットURL
  'updated_at',   // 更新日時
];

// ============================================
// 認証設定
// ============================================

/**
 * Google API認証を初期化する
 *
 * サービスアカウントの認証情報を使ってGoogle APIに接続します
 */
const getAuthClient = async (): Promise<ReturnType<typeof google.auth.fromJSON>> => {
  // 認証情報の取得方法を決定
  let credentials: Record<string, unknown>;

  // 環境変数に直接JSONが設定されている場合（Cloud Run向け）
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    console.log('🔑 環境変数から認証情報を読み込みます');
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  }
  // ファイルパスが指定されている場合
  else if (process.env.GOOGLE_CREDENTIALS_PATH) {
    console.log(`🔑 ファイルから認証情報を読み込みます: ${process.env.GOOGLE_CREDENTIALS_PATH}`);
    const credentialsFile = fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, 'utf-8');
    credentials = JSON.parse(credentialsFile);
  }
  // どちらも設定されていない場合
  else {
    throw new Error(
      '認証情報が設定されていません。' +
      'GOOGLE_CREDENTIALS_JSON または GOOGLE_CREDENTIALS_PATH を設定してください。'
    );
  }

  // Google認証クライアントを作成
  const auth = google.auth.fromJSON(credentials);

  // スプレッドシートへのアクセス権限を設定
  (auth as { scopes: string[] }).scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
  ];

  return auth;
};

// ============================================
// スプレッドシートクライアント
// ============================================

// シングルトンとしてクライアントを保持
let sheetsClient: sheets_v4.Sheets | null = null;

/**
 * スプレッドシートクライアントを取得する
 *
 * 一度作成したクライアントを再利用します（シングルトンパターン）
 */
const getSheetsClient = async (): Promise<sheets_v4.Sheets> => {
  // すでにクライアントがあればそれを返す
  if (sheetsClient) {
    return sheetsClient;
  }

  // 認証クライアントを取得
  const auth = await getAuthClient();

  // スプレッドシートAPIクライアントを作成
  sheetsClient = google.sheets({
    version: 'v4',
    auth: auth as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  console.log('📊 Googleスプレッドシートに接続しました');

  return sheetsClient;
};

/**
 * スプレッドシートIDを取得する
 */
const getSpreadsheetId = (): string => {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID が設定されていません');
  }

  return spreadsheetId;
};

// ============================================
// シート初期化
// ============================================

/**
 * ジョブシートを初期化する
 *
 * シートが存在しない場合は作成し、ヘッダー行を追加します
 */
export const initializeSheet = async (): Promise<void> => {
  console.log('📊 シートを初期化します...');

  // クライアントとIDを取得
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    // スプレッドシートの情報を取得
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    // シート一覧を取得
    const sheetsList = spreadsheet.data.sheets || [];

    // jobsシートが存在するかチェック
    const jobsSheet = sheetsList.find(
      (sheet) => sheet.properties?.title === SHEET_NAME
    );

    // シートが存在しない場合は作成
    if (!jobsSheet) {
      console.log(`📝 "${SHEET_NAME}" シートを作成します`);

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                },
              },
            },
          ],
        },
      });

      // ヘッダー行を追加
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [HEADERS],
        },
      });

      console.log('✅ シートとヘッダーを作成しました');
    } else {
      console.log(`✅ "${SHEET_NAME}" シートは既に存在します`);
    }
  } catch (error) {
    console.error('❌ シート初期化エラー:', error);
    throw error;
  }
};

// ============================================
// ジョブレコードの操作
// ============================================

/**
 * 新しいジョブレコードを作成する
 *
 * @param record - ジョブレコード
 */
export const createJobRecord = async (record: JobRecord): Promise<void> => {
  console.log(`📝 ジョブレコードを作成します: ${record.job_id}`);

  // クライアントとIDを取得
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // レコードを配列形式に変換（HEADERSの順序に合わせる）
  const rowData = [
    record.job_id,
    record.created_at,
    record.operator,
    record.ticket_id,
    record.customer_id,
    record.order_no,
    record.action,
    record.status,
    record.progress,
    record.message,
    record.result,
    record.error,
    record.artifact_url,
    record.updated_at,
  ];

  try {
    // シートの末尾に行を追加
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:N`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    });

    console.log(`✅ ジョブレコードを作成しました: ${record.job_id}`);
  } catch (error) {
    console.error('❌ ジョブレコード作成エラー:', error);
    throw error;
  }
};

/**
 * ジョブレコードを更新する
 *
 * @param jobId - ジョブID
 * @param updates - 更新するフィールド
 */
export const updateJobRecord = async (
  jobId: string,
  updates: Partial<JobRecord>
): Promise<void> => {
  console.log(`📝 ジョブレコードを更新します: ${jobId}`);

  // クライアントとIDを取得
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    // 現在のデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:N`,
    });

    const rows = response.data.values || [];

    // ジョブIDが一致する行を探す（1行目はヘッダーなのでスキップ）
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === jobId) {
        targetRowIndex = i;
        break;
      }
    }

    // 対象の行が見つからない場合
    if (targetRowIndex === -1) {
      console.log(`⚠️ ジョブが見つかりません: ${jobId}`);
      return;
    }

    // 現在の行データを取得
    const currentRow = rows[targetRowIndex];

    // 現在日時を更新日時としてセット
    updates.updated_at = new Date().toISOString();

    // 更新データを適用
    const updatedRow = [
      updates.job_id ?? currentRow[0],
      updates.created_at ?? currentRow[1],
      updates.operator ?? currentRow[2],
      updates.ticket_id ?? currentRow[3],
      updates.customer_id ?? currentRow[4],
      updates.order_no ?? currentRow[5],
      updates.action ?? currentRow[6],
      updates.status ?? currentRow[7],
      updates.progress ?? currentRow[8],
      updates.message ?? currentRow[9],
      updates.result ?? currentRow[10],
      updates.error ?? currentRow[11],
      updates.artifact_url ?? currentRow[12],
      updates.updated_at ?? currentRow[13],
    ];

    // シートの行番号（1始まり）を計算
    const sheetRowNumber = targetRowIndex + 1;

    // 行を更新
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A${sheetRowNumber}:N${sheetRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow],
      },
    });

    console.log(`✅ ジョブレコードを更新しました: ${jobId}`);
  } catch (error) {
    console.error('❌ ジョブレコード更新エラー:', error);
    throw error;
  }
};

/**
 * ジョブレコードを取得する
 *
 * @param jobId - ジョブID
 * @returns ジョブレコード（見つからない場合はnull）
 */
export const getJobRecord = async (jobId: string): Promise<JobRecord | null> => {
  console.log(`🔍 ジョブレコードを取得します: ${jobId}`);

  // クライアントとIDを取得
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    // 現在のデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:N`,
    });

    const rows = response.data.values || [];

    // ジョブIDが一致する行を探す
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === jobId) {
        const row = rows[i];
        // 行データをJobRecordオブジェクトに変換
        return {
          job_id: row[0] || '',
          created_at: row[1] || '',
          operator: row[2] || '',
          ticket_id: row[3] || '',
          customer_id: row[4] || '',
          order_no: row[5] || '',
          action: row[6] || '',
          status: (row[7] || 'pending') as JobStatus,
          progress: row[8] || '',
          message: row[9] || '',
          result: row[10] || '',
          error: row[11] || '',
          artifact_url: row[12] || '',
          updated_at: row[13] || '',
        };
      }
    }

    console.log(`⚠️ ジョブが見つかりません: ${jobId}`);
    return null;
  } catch (error) {
    console.error('❌ ジョブレコード取得エラー:', error);
    throw error;
  }
};

/**
 * ジョブ一覧を取得する
 *
 * @param limit - 取得件数（新しい順）
 * @returns ジョブレコードの配列
 */
export const listJobRecords = async (limit: number = 100): Promise<JobRecord[]> => {
  console.log(`🔍 ジョブ一覧を取得します（最新${limit}件）`);

  // クライアントとIDを取得
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    // 現在のデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:N`,
    });

    const rows = response.data.values || [];

    // ヘッダー行を除いてJobRecordに変換
    const jobs: JobRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      jobs.push({
        job_id: row[0] || '',
        created_at: row[1] || '',
        operator: row[2] || '',
        ticket_id: row[3] || '',
        customer_id: row[4] || '',
        order_no: row[5] || '',
        action: row[6] || '',
        status: (row[7] || 'pending') as JobStatus,
        progress: row[8] || '',
        message: row[9] || '',
        result: row[10] || '',
        error: row[11] || '',
        artifact_url: row[12] || '',
        updated_at: row[13] || '',
      });
    }

    // 新しい順にソートしてlimit件返す
    return jobs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('❌ ジョブ一覧取得エラー:', error);
    throw error;
  }
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * ジョブのステータスを更新する
 *
 * @param jobId - ジョブID
 * @param status - 新しいステータス
 * @param message - メッセージ（任意）
 */
export const updateJobStatus = async (
  jobId: string,
  status: JobStatus,
  message?: string
): Promise<void> => {
  await updateJobRecord(jobId, {
    status,
    message: message || '',
  });
};

/**
 * ジョブの進捗を更新する
 *
 * @param jobId - ジョブID
 * @param percent - 進捗パーセント
 * @param step - 現在のステップ名
 * @param message - 詳細メッセージ（任意）
 */
export const updateJobProgress = async (
  jobId: string,
  percent: number,
  step: string,
  message?: string
): Promise<void> => {
  const progressText = `${percent}% - ${step}`;
  await updateJobRecord(jobId, {
    status: 'running',
    progress: progressText,
    message: message || step,
  });
};

/**
 * ジョブを完了としてマークする
 *
 * @param jobId - ジョブID
 * @param result - 実行結果
 */
export const completeJob = async (
  jobId: string,
  result: Record<string, unknown>
): Promise<void> => {
  await updateJobRecord(jobId, {
    status: 'completed',
    progress: '100% - 完了',
    result: JSON.stringify(result),
    message: '正常に完了しました',
  });
};

/**
 * ジョブを失敗としてマークする
 *
 * @param jobId - ジョブID
 * @param error - エラー情報
 * @param artifactUrl - スクリーンショットのURL/パス（任意）
 */
export const failJob = async (
  jobId: string,
  error: string,
  artifactUrl?: string
): Promise<void> => {
  await updateJobRecord(jobId, {
    status: 'failed',
    error,
    artifact_url: artifactUrl || '',
    message: 'エラーが発生しました',
  });
};

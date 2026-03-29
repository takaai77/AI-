import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-realtime'),
  OPENAI_VOICE: z.string().default('verse'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_LIVE_MODEL: z
    .string()
    .default('gemini-2.5-flash-native-audio-preview-12-2025'),
  DATA_FILE: z.string().default(resolve(process.cwd(), 'data', 'subscriptions.json')),
  CONFIRM_DIGIT: z.string().min(1).max(1).default('1'),
  CANCEL_DIGIT: z.string().min(1).max(1).default('2')
});

export const env = schema.parse({
  PORT: process.env.PORT,
  PUBLIC_URL: process.env.PUBLIC_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_REALTIME_MODEL: process.env.OPENAI_REALTIME_MODEL,
  OPENAI_VOICE: process.env.OPENAI_VOICE,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_LIVE_MODEL: process.env.GEMINI_LIVE_MODEL,
  DATA_FILE: process.env.DATA_FILE,
  CONFIRM_DIGIT: process.env.CONFIRM_DIGIT,
  CANCEL_DIGIT: process.env.CANCEL_DIGIT
});

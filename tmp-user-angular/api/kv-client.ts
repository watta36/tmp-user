// api/kv-client.ts
import { kv } from '@vercel/kv';

// เช็คว่า KV พร้อมใช้ไหม (มี env ครบหรือยัง)
export const hasKvEnv = () =>
  ['KV_REST_API_URL', 'KV_REST_API_TOKEN'].every(
    (key) => !!process.env[key],
  );

// wrapper รอบ kv.get
export async function kvGet<T>(key: string): Promise<T | null> {
  if (!hasKvEnv()) return null;
  const value = await kv.get<T>(key);
  return value ?? null;
}

// wrapper รอบ kv.set
export async function kvSet(key: string, value: unknown): Promise<void> {
  if (!hasKvEnv()) return;
  await kv.set(key, value);
}

// wrapper รอบ kv.incr
export async function kvIncr(key: string): Promise<number> {
  if (!hasKvEnv()) return 0;
  const v = await kv.incr(key);
  return typeof v === 'number' ? v : 0;
}

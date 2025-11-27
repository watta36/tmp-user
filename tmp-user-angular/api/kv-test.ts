import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

function ensureKvEnv(res: VercelResponse): boolean {
  const required = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    res.status(500).json({ error: 'KV configuration missing', missing });
    return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!ensureKvEnv(res)) return;

    if (req.method === 'GET') {
      const value = (await kv.get<number>('counter')) ?? 0;
      return res.status(200).json({ counter: value });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const next = body?.value ?? 0;

      await kv.set('counter', next);
      return res.status(200).json({ ok: true, counter: next });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

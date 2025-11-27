import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export type KvProduct = {
  id: number;
  name: string;
  price: number;
  unit: string;
  category: string;
  sku?: string;
  description?: string;
  slug: string;
  image?: string;
  images?: string[];
};

type KvPayload = {
  products: KvProduct[];
  categories: string[];
  action?: 'apply';
};

const PRODUCTS_KEY = 'products';
const CATEGORIES_KEY = 'categories';
const VERSION_KEY = 'products_version';

async function getVersion(): Promise<number> {
  const version = await kv.get<number>(VERSION_KEY);
  return typeof version === 'number' ? version : 0;
}

async function bumpVersion(): Promise<number> {
  const current = await getVersion();
  const next = await kv.incr(VERSION_KEY);
  return typeof next === 'number' ? next : current + 1;
}

function parseBody(body: unknown): Partial<KvPayload> {
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  if (body && typeof body === 'object') return body as Partial<KvPayload>;
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET' && req.query.versionOnly) {
      const version = await getVersion();
      return res.status(200).json({ version });
    }

    if (req.method === 'GET') {
      const [products, categories] = await Promise.all([
        kv.get<KvProduct[]>(PRODUCTS_KEY),
        kv.get<string[]>(CATEGORIES_KEY)
      ]);
      const version = await getVersion();
      return res.status(200).json({
        products: products ?? [],
        categories: categories ?? [],
        version,
      });
    }

    if (req.method === 'POST') {
      const payload = parseBody(req.body);
      if (payload.action === 'apply') {
        const version = await bumpVersion();
        return res.status(200).json({ ok: true, version });
      }

      const products = Array.isArray(payload.products) ? payload.products : [];
      const categories = Array.isArray(payload.categories) ? payload.categories : [];

      await Promise.all([
        kv.set(PRODUCTS_KEY, products),
        kv.set(CATEGORIES_KEY, categories),
      ]);

      const version = await bumpVersion();

      return res.status(200).json({ ok: true, products: products.length, categories: categories.length, version });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

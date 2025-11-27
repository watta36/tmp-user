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
};

const PRODUCTS_KEY = 'products';
const CATEGORIES_KEY = 'categories';

function parseBody(body: unknown): Partial<KvPayload> {
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  if (body && typeof body === 'object') return body as Partial<KvPayload>;
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const [products, categories] = await Promise.all([
        kv.get<KvProduct[]>(PRODUCTS_KEY),
        kv.get<string[]>(CATEGORIES_KEY)
      ]);
      return res.status(200).json({
        products: products ?? [],
        categories: categories ?? [],
      });
    }

    if (req.method === 'POST') {
      const payload = parseBody(req.body);
      const products = Array.isArray(payload.products) ? payload.products : [];
      const categories = Array.isArray(payload.categories) ? payload.categories : [];

      await Promise.all([
        kv.set(PRODUCTS_KEY, products),
        kv.set(CATEGORIES_KEY, categories),
      ]);

      return res.status(200).json({ ok: true, products: products.length, categories: categories.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

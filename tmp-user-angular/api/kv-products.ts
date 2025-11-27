import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { promises as fs } from 'fs';
import path from 'path';

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
const LOCAL_FILE = path.join(process.cwd(), 'api', 'local-kv.json');

const hasKvEnv = () => ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_URL'].every((key) => !!process.env[key]);

async function getVersion(): Promise<number> {
  const version = await kv.get<number>(VERSION_KEY);
  return typeof version === 'number' ? version : 0;
}

async function bumpVersion(): Promise<number> {
  const current = await getVersion();
  const next = await kv.incr(VERSION_KEY);
  return typeof next === 'number' ? next : current + 1;
}

type LocalState = { products: KvProduct[]; categories: string[]; version: number };

async function readLocalState(): Promise<LocalState> {
  try {
    const content = await fs.readFile(LOCAL_FILE, 'utf8');
    const parsed = JSON.parse(content) as Partial<LocalState>;
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      version: typeof parsed.version === 'number' ? parsed.version : 0,
    };
  } catch {
    return { products: [], categories: [], version: 0 };
  }
}

async function writeLocalState(data: LocalState) {
  await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2), 'utf8');
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
    const useKv = hasKvEnv();

    if (req.method === 'GET' && req.query.versionOnly) {
      const version = useKv ? await getVersion() : (await readLocalState()).version;
      return res.status(200).json({ version });
    }

    if (req.method === 'GET') {
      if (useKv) {
        const [products, categories, version] = await Promise.all([
          kv.get<KvProduct[]>(PRODUCTS_KEY),
          kv.get<string[]>(CATEGORIES_KEY),
          getVersion(),
        ]);
        return res.status(200).json({
          products: products ?? [],
          categories: categories ?? [],
          version,
        });
      }

      const state = await readLocalState();
      return res.status(200).json({
        products: state.products,
        categories: state.categories,
        version: state.version,
      });
    }

    if (req.method === 'POST') {
      const payload = parseBody(req.body);
      if (payload.action === 'apply') {
        if (useKv) {
          const version = await bumpVersion();
          return res.status(200).json({ ok: true, version });
        }

        const state = await readLocalState();
        const nextVersion = state.version + 1;
        await writeLocalState({ ...state, version: nextVersion });
        return res.status(200).json({ ok: true, version: nextVersion });
      }

      const products = Array.isArray(payload.products) ? payload.products : [];
      const categories = Array.isArray(payload.categories) ? payload.categories : [];

      if (useKv) {
        await Promise.all([
          kv.set(PRODUCTS_KEY, products),
          kv.set(CATEGORIES_KEY, categories),
        ]);
        const version = await bumpVersion();
        return res.status(200).json({ ok: true, products: products.length, categories: categories.length, version });
      }

      const current = await readLocalState();
      const nextVersion = current.version + 1;
      await writeLocalState({ products, categories, version: nextVersion });
      return res.status(200).json({ ok: true, products: products.length, categories: categories.length, version: nextVersion });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

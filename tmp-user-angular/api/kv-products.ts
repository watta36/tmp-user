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

const hasKvEnv = () => ['KV_REST_API_URL', 'KV_REST_API_TOKEN'].every((key) => !!process.env[key]);
const hasEdgeConfigEnv = () => ['EDGE_CONFIG_ID', 'EDGE_CONFIG_TOKEN'].every((key) => !!process.env[key]);

type EdgeConfigResponse<T> = { items?: Record<string, T>; item?: { key: string; value: T } };

async function edgeConfigGet<T>(key: string): Promise<T | null> {
  if (!hasEdgeConfigEnv()) return null;
  const { EDGE_CONFIG_ID, EDGE_CONFIG_TOKEN } = process.env;
  const res = await fetch(`https://edge-config.vercel.com/${EDGE_CONFIG_ID}/item/${key}?token=${EDGE_CONFIG_TOKEN}`);
  if (!res.ok) return null;
  const data = (await res.json()) as EdgeConfigResponse<T>;
  return data.item?.value ?? null;
}

async function edgeConfigSet(items: Record<string, unknown>): Promise<void> {
  if (!hasEdgeConfigEnv()) return;
  const { EDGE_CONFIG_ID, EDGE_CONFIG_TOKEN } = process.env;
  await fetch(`https://edge-config.vercel.com/${EDGE_CONFIG_ID}/items?token=${EDGE_CONFIG_TOKEN}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: Object.entries(items).map(([key, value]) => ({ operation: 'upsert', key, value })),
    }),
  });
}

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
    const useEdgeConfig = hasEdgeConfigEnv();
    const useKv = !useEdgeConfig && hasKvEnv();

    if (req.method === 'GET' && req.query.versionOnly) {
      let version = 0;
      if (useEdgeConfig) {
        version = (await edgeConfigGet<number>(VERSION_KEY)) ?? 0;
      } else if (useKv) {
        version = await getVersion();
      } else {
        version = (await readLocalState()).version;
      }
      return res.status(200).json({ version });
    }

    if (req.method === 'GET') {
      if (useEdgeConfig) {
        const [products, categories, version] = await Promise.all([
          edgeConfigGet<KvProduct[]>(PRODUCTS_KEY),
          edgeConfigGet<string[]>(CATEGORIES_KEY),
          edgeConfigGet<number>(VERSION_KEY),
        ]);
        return res.status(200).json({
          products: products ?? [],
          categories: categories ?? [],
          version: version ?? 0,
        });
      }

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
      const bodyProducts = Array.isArray(payload.products) ? payload.products : undefined;
      const bodyCategories = Array.isArray(payload.categories) ? payload.categories : undefined;

      if (payload.action === 'apply') {
        if (useEdgeConfig) {
          const current = (await edgeConfigGet<number>(VERSION_KEY)) ?? 0;
          const next = current + 1;
          const items: Record<string, unknown> = { [VERSION_KEY]: next };
          if (bodyProducts) items[PRODUCTS_KEY] = bodyProducts;
          if (bodyCategories) items[CATEGORIES_KEY] = bodyCategories;
          await edgeConfigSet(items);
          return res.status(200).json({ ok: true, version: next });
        }

        if (useKv) {
          if (bodyProducts) await kv.set(PRODUCTS_KEY, bodyProducts);
          if (bodyCategories) await kv.set(CATEGORIES_KEY, bodyCategories);
          const version = await bumpVersion();
          return res.status(200).json({ ok: true, version });
        }

        const current = await readLocalState();
        const products = bodyProducts ?? current.products;
        const categories = bodyCategories ?? current.categories;
        const nextVersion = current.version + 1;
        await writeLocalState({ products, categories, version: nextVersion });
        return res.status(200).json({ ok: true, version: nextVersion });
      }

      const products = bodyProducts ?? [];
      const categories = bodyCategories ?? [];

      if (useEdgeConfig) {
        const currentVersion = (await edgeConfigGet<number>(VERSION_KEY)) ?? 0;
        const nextVersion = currentVersion + 1;
        await edgeConfigSet({
          [PRODUCTS_KEY]: products,
          [CATEGORIES_KEY]: categories,
          [VERSION_KEY]: nextVersion,
        });
        return res
          .status(200)
          .json({ ok: true, products: products.length, categories: categories.length, version: nextVersion });
      }

      if (useEdgeConfig) {
        const currentVersion = (await edgeConfigGet<number>(VERSION_KEY)) ?? 0;
        const nextVersion = currentVersion + 1;
        await edgeConfigSet({
          [PRODUCTS_KEY]: products,
          [CATEGORIES_KEY]: categories,
          [VERSION_KEY]: nextVersion,
        });
        return res
          .status(200)
          .json({ ok: true, products: products.length, categories: categories.length, version: nextVersion });
      }

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

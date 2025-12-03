import type { VercelRequest, VercelResponse } from './vercel-types.js';
import { getDb, getProductsCollection } from './mongo-client.js';
import { normalizeProducts, parseCsvProducts, type ProductDocument, type ProductPayload } from './product-schema.js';

const VERSION_KEY = 'products_version';
const META_COLLECTION = 'metadata';

function parseBody(body: unknown): Partial<{ products: ProductPayload[]; categories: string[]; action?: 'apply'; csv?: string; }> {
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  if (body && typeof body === 'object') return body as Partial<{ products: ProductPayload[]; categories: string[]; action?: 'apply'; csv?: string; }>;
  return {};
}

function collectCategories(products: ProductDocument[], override?: string[]): string[] {
  if (Array.isArray(override) && override.length) {
    return Array.from(new Set(override.map((c) => c.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
  }
  return Array.from(new Set(products.map((p) => p.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
}

async function getVersion() {
  const db = await getDb();
  const meta = await db.collection<{ _id: string; value: number }>(META_COLLECTION).findOne({ _id: VERSION_KEY });
  return typeof meta?.value === 'number' ? meta.value : 0;
}

async function bumpVersion() {
  const db = await getDb();
  const result = await db.collection<{ _id: string; value: number }>(META_COLLECTION).findOneAndUpdate(
    { _id: VERSION_KEY },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return result.value?.value ?? 1;
}

async function replaceProducts(products: ProductDocument[], categories?: string[]) {
  const collection = await getProductsCollection();
  const now = new Date();
  const docs = products.map((p) => ({ ...p, createdAt: p.createdAt ?? now, updatedAt: now }));
  await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  const version = await bumpVersion();
  const categoryList = collectCategories(products, categories);
  return { version, categories: categoryList };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET' && req.query.versionOnly) {
      const version = await getVersion();
      return res.status(200).json({ version });
    }

    if (req.method === 'GET') {
      const collection = await getProductsCollection();
      const items = await collection.find({}).sort({ id: 1 }).toArray();
      const products = items.map(({ _id, ...doc }: ProductDocument & { _id?: unknown }) => ({ ...doc }));
      const categories = collectCategories(products);
      const version = await getVersion();
      return res.status(200).json({ products, categories, version });
    }

    if (req.method === 'POST') {
      const payload = parseBody(req.body);
      const csvText = typeof payload.csv === 'string' ? payload.csv : undefined;
      const fromCsv = csvText ? parseCsvProducts(csvText) : [];
      const incomingList = Array.isArray(payload.products) ? payload.products : [];
      const normalized = fromCsv.length ? fromCsv : normalizeProducts(incomingList);

      if (!normalized.length) {
        return res.status(400).json({ error: 'ไม่พบข้อมูลสินค้าที่นำเข้าได้' });
      }

      const result = await replaceProducts(normalized, payload.categories);
      return res.status(200).json({ ok: true, products: normalized.length, categories: result.categories, version: result.version });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('kv-products error', err);
    return res.status(500).json({ error: 'Server error', message: err instanceof Error ? err.message : String(err) });
  }
}

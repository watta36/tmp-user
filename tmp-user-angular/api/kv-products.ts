import type { Collection } from 'mongodb';
import type { VercelRequest, VercelResponse } from './vercel-types.js';
import { getDb, getProductsCollection } from './mongo-client.js';
import { normalizeProducts, parseCsvProducts, type ProductDocument, type ProductPayload } from './product-schema.js';

const VERSION_KEY = 'products_version';
const CATEGORY_KEY = 'products_categories';
const THEME_KEY = 'products_theme';
const META_COLLECTION = 'metadata';
const DEFAULT_THEME = 'aqua';

function parseBody(body: unknown): Partial<{
  products: ProductPayload[];
  upserts: ProductPayload[];
  deleteIds: number[];
  categories: string[];
  action?: 'apply' | 'preview' | 'patch' | 'importChunk';
  csv?: string;
  theme?: string;
  reset?: boolean;
}> {
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  if (body && typeof body === 'object') return body as Partial<{
    products: ProductPayload[];
    upserts: ProductPayload[];
    deleteIds: number[];
    categories: string[];
    action?: 'apply' | 'preview' | 'patch' | 'importChunk';
    csv?: string;
    theme?: string;
    reset?: boolean;
  }>;
  return {};
}

function collectCategories(products: ProductDocument[], override?: string[]): string[] {
  if (Array.isArray(override) && override.length) {
    return normalizeCategories(override);
  }
  return normalizeCategories(products.map((p) => p.category));
}

async function getVersion() {
  const db = await getDb();
  const meta = await db.collection<{ _id: string; value: number }>(META_COLLECTION).findOne({ _id: VERSION_KEY });
  return typeof meta?.value === 'number' ? meta.value : 0;
}

async function getCategories(): Promise<string[] | null> {
  const db = await getDb();
  const meta = await db.collection<{ _id: string; value: string[] }>(META_COLLECTION).findOne({ _id: CATEGORY_KEY });
  if (Array.isArray(meta?.value)) return normalizeCategories(meta.value);
  return null;
}

async function saveCategories(list: string[]) {
  const db = await getDb();
  await db.collection<{ _id: string; value: unknown }>(META_COLLECTION).findOneAndUpdate(
    { _id: CATEGORY_KEY },
    { $set: { value: normalizeCategories(list) } },
    { upsert: true },
  );
}

async function getTheme(): Promise<string> {
  const db = await getDb();
  const meta = await db.collection<{ _id: string; value: string }>(META_COLLECTION).findOne({ _id: THEME_KEY });
  return normalizeTheme(meta?.value);
}

async function saveTheme(theme: string) {
  const db = await getDb();
  await db.collection<{ _id: string; value: unknown }>(META_COLLECTION).findOneAndUpdate(
    { _id: THEME_KEY },
    { $set: { value: normalizeTheme(theme) } },
    { upsert: true },
  );
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
  const categoryList = collectCategories(products, categories);
  await saveCategories(categoryList);
  const version = await bumpVersion();
  return { version, categories: categoryList };
}

async function applyPatch(upserts: ProductDocument[], deleteIds: number[], categories?: string[], theme?: string) {
  const collection = await getProductsCollection();
  const now = new Date();
  if (deleteIds.length) {
    await collection.deleteMany({ id: { $in: deleteIds } });
  }

  if (upserts.length) {
    const existing = await collection
      .find({ id: { $in: upserts.map((p) => p.id) } }, { projection: { id: 1, createdAt: 1 } })
      .toArray();
    const createdMap = new Map(existing.map((p) => [p.id, p.createdAt] as const));
    const ops = upserts.map((p) => {
      const createdAt = createdMap.get(p.id) ?? p.createdAt ?? now;
      return {
        updateOne: {
          filter: { id: p.id },
          update: { $set: { ...p, createdAt, updatedAt: now } },
          upsert: true,
        },
      } as const;
    });
    await collection.bulkWrite(ops, { ordered: false });
  }

  const normalizedTheme = normalizeTheme(theme);
  const categoriesToSave = categories?.length
    ? normalizeCategories(categories)
    : await collectCategoriesFromDb(collection);
  await saveCategories(categoriesToSave);
  await saveTheme(normalizedTheme);
  const version = await bumpVersion();
  return { version, categories: categoriesToSave, theme: normalizedTheme };
}

function normalizeCategories(list: string[]): string[] {
  return Array.from(new Set(list.map((c) => c.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
}

function normalizeTheme(id?: string | null): string {
  const trimmed = (id || '').trim();
  return trimmed || DEFAULT_THEME;
}

async function collectCategoriesFromDb(collection?: Collection<ProductDocument>): Promise<string[]> {
  const col = collection ?? (await getProductsCollection());
  const products = await col.find({}, { projection: { category: 1 } }).toArray();
  return normalizeCategories(products.map((p) => p.category));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET' && req.query.versionOnly) {
      const version = await getVersion();
      return res.status(200).json({ version });
    }

  if (req.method === 'GET') {
    const collection = await getProductsCollection();
    const [items, storedCategories, version, theme] = await Promise.all([
      collection.find({}).sort({ id: 1 }).toArray(),
      getCategories(),
      getVersion(),
      getTheme(),
    ]);
    const products = items.map(({ _id, ...doc }: ProductDocument & { _id?: unknown }) => ({ ...doc }));
    const derivedCategories = collectCategories(products);
    const categories = storedCategories?.length ? storedCategories : derivedCategories;
    return res.status(200).json({ products, categories, theme: normalizeTheme(theme), version });
  }

  if (req.method === 'POST') {
    const payload = parseBody(req.body);
    const csvText = typeof payload.csv === 'string' ? payload.csv : undefined;
    const fromCsv = csvText ? parseCsvProducts(csvText) : [];
    const incomingList = Array.isArray(payload.products) ? payload.products : [];
    const normalized = fromCsv.length ? fromCsv : normalizeProducts(incomingList);
    const incomingTheme = normalizeTheme(payload.theme);

    if (payload.action === 'importChunk') {
      const chunk = normalizeProducts(incomingList);
      const collection = await getProductsCollection();
      if (payload.reset) {
        await collection.deleteMany({});
      }
      if (!chunk.length) {
        const categories = payload.categories?.length
          ? normalizeCategories(payload.categories)
          : await collectCategoriesFromDb(collection);
        await saveCategories(categories);
        await saveTheme(incomingTheme);
        const version = await bumpVersion();
        return res.status(200).json({ ok: true, imported: 0, categories, theme: incomingTheme, version });
      }
      const result = await applyPatch(chunk, [], payload.categories, incomingTheme);
      return res.status(200).json({ ok: true, ...result, imported: chunk.length });
    }

    if (payload.action === 'preview') {
      const categories = collectCategories(normalized, payload.categories);
      return res.status(200).json({ ok: true, products: normalized, categories, theme: incomingTheme });
    }

    if (payload.action === 'patch') {
      const upserts = normalizeProducts(Array.isArray(payload.upserts) ? payload.upserts : incomingList);
      const deleteIds = Array.isArray(payload.deleteIds)
        ? payload.deleteIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];
      const result = await applyPatch(upserts, deleteIds, payload.categories, incomingTheme);
      return res.status(200).json({ ok: true, ...result });
    }

    const result = await replaceProducts(normalized, payload.categories);
    await saveTheme(incomingTheme);
    return res.status(200).json({
      ok: true,
      products: normalized.length,
      categories: result.categories,
      theme: incomingTheme,
      version: result.version,
    });
  }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('kv-products error', err);
    return res.status(500).json({ error: 'Server error', message: err instanceof Error ? err.message : String(err) });
  }
}

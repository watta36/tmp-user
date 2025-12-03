import { MongoClient, MongoServerError, type Collection, type Db, type MongoClientOptions } from 'mongodb';
import type { ProductDocument } from './product-schema.js';

const uri = resolveMongoUri();
const dbNameFromUri = uri ? extractDbName(uri) : undefined;
const dbName = process.env.MONGODB_DB || dbNameFromUri || 'ecommerce';
const collectionName = process.env.MONGODB_COLLECTION || 'products';
const authSource = process.env.MONGODB_AUTH_SOURCE;
const authSourceFromUri = uri ? extractAuthSource(uri) : undefined;
// Let the driver fall back to its default ("admin" for SRV URIs) unless an
// explicit override is provided via env or query string.
const resolvedAuthSource = authSource || authSourceFromUri;

let client: MongoClient | null = null;

type TopologyState = { isClosed?: () => boolean; s?: { state?: string } };

function resolveMongoUri(): string | undefined {
  const fromBase64 = process.env.MONGODB_URI_BASE64
    ? Buffer.from(process.env.MONGODB_URI_BASE64, 'base64').toString('utf8')
    : undefined;
  const raw = process.env.MONGODB_URI ?? fromBase64;
  return raw?.trim();
}

function extractAuthSource(rawUri: string): string | undefined {
  const queryIndex = rawUri.indexOf('?');
  if (queryIndex === -1) return undefined;
  try {
    const params = new URLSearchParams(rawUri.slice(queryIndex + 1));
    const found = params.get('authSource') ?? params.get('authsource');
    return found?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function extractDbName(rawUri: string): string | undefined {
  try {
    const { pathname } = new URL(rawUri);
    const trimmed = pathname.replace(/^\/+/, '').trim();
    return trimmed || undefined;
  } catch {
    return undefined;
  }
}

function isClientOpen(candidate: MongoClient | null): candidate is MongoClient {
  if (!candidate) return false;
  const topology = (candidate as MongoClient & { topology?: TopologyState }).topology;
  if (topology?.isClosed?.()) return false;
  if (topology?.s?.state === 'closed') return false;
  return true;
}

async function getClient(): Promise<MongoClient> {
  if (!uri) throw new Error('Missing MONGODB_URI environment variable');
  if (isClientOpen(client)) return client;
  const options: MongoClientOptions = resolvedAuthSource ? { authSource: resolvedAuthSource } : {};
  client = new MongoClient(uri, options);
  try {
    await client.connect();
  } catch (err) {
    client = null;
    if (err instanceof MongoServerError && err.codeName === 'AtlasError' && err.code === 8000) {
      const authSourceHint = resolvedAuthSource ?? 'default from URI (admin for SRV URIs)';
      throw new Error(
        'MongoDB authentication failed. Check that your username/password are URL encoded correctly and match the cluster ' +
          `users, and that the authSource/database in the URI (or MONGODB_AUTH_SOURCE) is correct. Current authSource: ${authSourceHint}; data database: ${dbName}.`,
      );
    }
    throw err;
  }
  return client;
}

export async function getDb(): Promise<Db> {
  const mongo = await getClient();
  return mongo.db(dbName);
}

export async function getProductsCollection(): Promise<Collection<ProductDocument>> {
  const db = await getDb();
  return db.collection<ProductDocument>(collectionName);
}

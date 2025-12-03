import { MongoClient, MongoServerError, type Collection, type Db, type MongoClientOptions } from 'mongodb';
import type { ProductDocument } from './product-schema.js';

const uri = resolveMongoUri();
const dbName = process.env.MONGODB_DB || 'ecommerce';
const collectionName = process.env.MONGODB_COLLECTION || 'products';
const authSource = process.env.MONGODB_AUTH_SOURCE;

let client: MongoClient | null = null;

type TopologyState = { isClosed?: () => boolean; s?: { state?: string } };

function resolveMongoUri(): string | undefined {
  const fromBase64 = process.env.MONGODB_URI_BASE64
    ? Buffer.from(process.env.MONGODB_URI_BASE64, 'base64').toString('utf8')
    : undefined;
  const raw = process.env.MONGODB_URI ?? fromBase64;
  return raw?.trim();
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
  const options: MongoClientOptions = authSource ? { authSource } : {};
  client = new MongoClient(uri, options);
  try {
    await client.connect();
  } catch (err) {
    client = null;
    if (err instanceof MongoServerError && err.codeName === 'AtlasError' && err.code === 8000) {
      throw new Error(
        'MongoDB authentication failed. Check that your username/password are URL encoded correctly and match the cluster ' +
          'users, and that the authSource/database in the URI (or MONGODB_AUTH_SOURCE) is correct.',
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

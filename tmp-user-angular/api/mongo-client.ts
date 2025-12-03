import { MongoClient, type Db, type Collection } from 'mongodb';
import type { ProductDocument } from './product-schema.js';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'ecommerce';
const collectionName = process.env.MONGODB_COLLECTION || 'products';

let client: MongoClient | null = null;

type TopologyState = { isClosed?: () => boolean; s?: { state?: string } };

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
  client = new MongoClient(uri);
  await client.connect();
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

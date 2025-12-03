import { MongoClient, type Db, type Collection } from 'mongodb';
import type { ProductDocument } from './product-schema';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'ecommerce';
const collectionName = process.env.MONGODB_COLLECTION || 'products';

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (!uri) throw new Error('Missing MONGODB_URI environment variable');
  if (client) return client;
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

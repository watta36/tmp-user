import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'ecommerce';
const collectionName = process.env.MONGODB_COLLECTION || 'products';
let client = null;
async function getClient() {
    if (!uri)
        throw new Error('Missing MONGODB_URI environment variable');
    if (client)
        return client;
    client = new MongoClient(uri);
    await client.connect();
    return client;
}
export async function getDb() {
    const mongo = await getClient();
    return mongo.db(dbName);
}
export async function getProductsCollection() {
    const db = await getDb();
    return db.collection(collectionName);
}

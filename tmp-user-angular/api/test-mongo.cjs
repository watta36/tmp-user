const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Please set MONGODB_URI before running this script');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = dbName ? client.db(dbName) : client.db();
    const collections = await db.collections();
    console.log('Database:', db.databaseName);
    console.log('Collections:', collections.map((c) => c.collectionName));
  } catch (err) {
    console.error('❌ Connection failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

testConnection();
